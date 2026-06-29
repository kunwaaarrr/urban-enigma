/**
 * Stockfish engine wrapper. Runs the vendored classical Stockfish 10 build
 * (single-threaded WASM, ~655 KB) in a Web Worker. Single-threaded means no
 * SharedArrayBuffer, so it needs no COOP/COEP headers and works on GitHub
 * Pages as-is. Classical eval is plenty to find a human's mistakes — it still
 * sees every hung piece and missed tactic — and it's far smaller/faster to
 * load than the ~90 MB NNUE builds.
 *
 * The worker is loaded same-origin from `public/engine/` so its relative
 * `stockfish.wasm` fetch resolves correctly (cross-origin Workers are blocked
 * by the browser, which is why we vendor rather than hotlink a CDN).
 */

export interface EngineEval {
  /** Centipawns from the side-to-move's perspective (+ = side to move better). */
  cp?: number;
  /** Mate in N from the side-to-move's perspective (+ = side to move mates). */
  mate?: number;
  /** Best move in UCI long form, e.g. "e2e4" / "e7e8q". */
  bestMove: string;
}

/** One line from a MultiPV search: a candidate move and its score. */
export interface EngineLine {
  /** Move in UCI long form. */
  uci: string;
  cp?: number;
  mate?: number;
}

/** Default location of the vendored worker under the app's base URL. */
export function defaultEngineUrl(): string {
  const base = typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL ?? '/' : '/';
  return `${base}engine/stockfish.wasm.js`;
}

/**
 * When an engine fails to come up, fetch the .wasm directly and report exactly
 * what the browser sees (status, MIME, size, magic bytes). This turns a vague
 * "timed out" into an actionable diagnosis: 404 (wrong path), a tiny HTML/LFS
 * pointer (bad deploy), or a wrong content-type that blocked instantiation.
 */
async function diagnoseWasm(engineUrl: string): Promise<string> {
  const wasmUrl = engineUrl.replace(/stockfish\.wasm\.js(\?.*)?$/, 'stockfish.wasm');
  try {
    const res = await fetch(wasmUrl, { cache: 'no-store' });
    const buf = await res.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 4));
    const magic = String.fromCharCode(...head); // valid wasm == "\0asm"
    const ok = magic === '\0asm';
    return `wasm@${wasmUrl}: HTTP ${res.status}, type=${res.headers.get('content-type') || '?'}, ${buf.byteLength}B, magic=${ok ? 'valid' : JSON.stringify(magic)}`;
  } catch (e) {
    return `wasm@${wasmUrl}: fetch failed — ${(e as Error).message}`;
  }
}

/**
 * A move can't do better than the engine's best line, so when computing
 * centipawn loss we treat mate scores as a large finite value rather than
 * infinity, decaying with distance so "mate in 1" > "mate in 8".
 */
export const MATE_CP = 100000;
export function evalToCp(e: EngineEval): number {
  if (e.mate !== undefined) return e.mate > 0 ? MATE_CP - e.mate * 100 : -MATE_CP - e.mate * 100;
  return e.cp ?? 0;
}

export class Engine {
  private worker: Worker;
  private ready: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();
  /** Current MultiPV setting; we only re-send the option when it changes. */
  private multipv = 1;
  /** Messages seen before the engine is ready — surfaced if init fails. */
  private initLog: string[] = [];

  /**
   * @param _hashMb Accepted for API compatibility (EnginePool passes a hash
   *   budget), but ignored: this vendored build has no settable Hash option, so
   *   there's nothing to tune. Parallelism comes from multiple workers instead.
   */
  constructor(engineUrl: string = defaultEngineUrl(), _hashMb = 64) {
    this.worker = new Worker(engineUrl);
    // Wire this.ready so it can *reject* — without this, a worker that fails
    // to load or throws during init leaves this.ready pending forever, which
    // silently hangs every downstream evaluate() / analyze() call.
    this.ready = new Promise<void>((resolve, reject) => {
      // Capture everything the worker prints during startup so a failure can
      // report what (if anything) the engine actually said.
      const capture = (e: MessageEvent) => {
        if (typeof e.data === 'string' && this.initLog.length < 40) this.initLog.push(e.data);
      };
      this.worker.addEventListener('message', capture);
      const onError = (e: ErrorEvent) =>
        reject(new Error(`Engine worker error: ${e.message || 'failed to load'} (${engineUrl})`));
      this.worker.addEventListener('error', onError, { once: true });
      this.worker.addEventListener('messageerror', onError as EventListener, { once: true });

      const INIT_TIMEOUT_MS = 25_000;
      const fail = (reason: string) => {
        diagnoseWasm(engineUrl).then((diag) => {
          const said = this.initLog.length ? this.initLog.slice(-6).join(' | ') : '(no output)';
          reject(new Error(`${reason}. Worker said: ${said}. ${diag}`));
        }, () => reject(new Error(reason)));
      };
      const timer = setTimeout(() => fail(`Engine timed out initializing (${INIT_TIMEOUT_MS / 1000}s)`), INIT_TIMEOUT_MS);

      this.handshake().then(
        () => {
          clearTimeout(timer);
          this.worker.removeEventListener('message', capture);
          this.worker.removeEventListener('error', onError);
          this.initLog = [];
          resolve();
        },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
    // Don't let an unobserved rejection crash if nobody awaits immediately;
    // whenReady()/evaluate()/analyze() will observe it.
    this.ready.catch(() => {});
  }

  /** Resolves when the engine has handshaken; rejects if it failed to start. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  /** Resolve once a line satisfying `done` arrives; `onLine` sees every line. */
  private await_(done: (line: string) => boolean, onLine?: (line: string) => void): Promise<void> {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';
        onLine?.(line);
        if (done(line)) {
          this.worker.removeEventListener('message', handler);
          resolve();
        }
      };
      this.worker.addEventListener('message', handler);
    });
  }

  private async handshake(): Promise<void> {
    this.send('uci');
    await this.await_((l) => l.startsWith('uciok'));
    // Keep this minimal. This vendored single-threaded build (ddugovic
    // multi-variant Stockfish) has NO settable "Hash" option — only "Clear
    // Hash" — and its "Threads" option is backed by a real thread pool that
    // hangs in WASM with no SharedArrayBuffer. Sending either setoption leaves
    // `isready` with no `readyok`, bricking startup. Parallelism comes from
    // running several single-threaded workers (see EnginePool), not threads.
    this.send('isready');
    await this.await_((l) => l.startsWith('readyok'));
  }

  /** Switch MultiPV only when needed (it persists on the engine). */
  private setMultiPv(n: number) {
    if (this.multipv !== n) {
      this.multipv = n;
      this.send(`setoption name MultiPV ${n}`);
    }
  }

  /** Serialize evals — one `go` at a time per worker. */
  evaluate(fen: string, depth = 12): Promise<EngineEval> {
    const run = async (): Promise<EngineEval> => {
      await this.ready;
      this.setMultiPv(1); // reset if a previous analyze() left it at >1
      let cp: number | undefined;
      let mate: number | undefined;
      let bestMove = '';
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
      const pEval = this.await_(
        (l) => l.startsWith('bestmove'),
        (line) => {
          if (line.startsWith('info') && line.includes(' pv ')) {
            const mateM = line.match(/score mate (-?\d+)/);
            const cpM = line.match(/score cp (-?\d+)/);
            if (mateM) {
              mate = parseInt(mateM[1], 10);
              cp = undefined;
            } else if (cpM) {
              cp = parseInt(cpM[1], 10);
              mate = undefined;
            }
          } else if (line.startsWith('bestmove')) {
            bestMove = line.split(' ')[1] ?? '';
          }
        },
      );
      // Safety net: if bestmove never arrives (e.g. edge-case terminal position),
      // send "stop" after 10 s — Stockfish then emits bestmove with what it has.
      const stopTimer = setTimeout(() => this.send('stop'), 10_000);
      await pEval;
      clearTimeout(stopTimer);
      return { cp, mate, bestMove };
    };
    // Chain so concurrent callers don't interleave UCI commands.
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  /**
   * Return the top `multipv` candidate moves with their scores (from the
   * side-to-move's perspective, best first). Used to grade "good but not best"
   * tries in the weakness drills.
   */
  analyze(fen: string, depth = 12, multipv = 3): Promise<EngineLine[]> {
    const run = async (): Promise<EngineLine[]> => {
      await this.ready;
      this.setMultiPv(multipv);
      // rank (1-based) -> latest seen line for that rank
      const byRank = new Map<number, EngineLine>();
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
      const pAnalyze = this.await_(
        (l) => l.startsWith('bestmove'),
        (line) => {
          if (line.startsWith('info') && line.includes(' pv ')) {
            const rankM = line.match(/multipv (\d+)/);
            const moveM = line.match(/ pv (\S+)/);
            if (!moveM) return;
            const rank = rankM ? parseInt(rankM[1], 10) : 1;
            const mateM = line.match(/score mate (-?\d+)/);
            const cpM = line.match(/score cp (-?\d+)/);
            byRank.set(rank, {
              uci: moveM[1],
              cp: cpM ? parseInt(cpM[1], 10) : undefined,
              mate: mateM ? parseInt(mateM[1], 10) : undefined,
            });
          }
        },
      );
      const stopTimer = setTimeout(() => this.send('stop'), 10_000);
      await pAnalyze;
      clearTimeout(stopTimer);
      return [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([, line]) => line);
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  dispose() {
    try {
      this.send('quit');
    } catch {
      /* worker may already be gone */
    }
    this.worker.terminate();
  }
}
