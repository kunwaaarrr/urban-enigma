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

/** Default location of the vendored worker under the app's base URL. */
export function defaultEngineUrl(): string {
  const base = typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL ?? '/' : '/';
  return `${base}engine/stockfish.wasm.js`;
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

  constructor(engineUrl: string = defaultEngineUrl()) {
    this.worker = new Worker(engineUrl);
    this.ready = this.handshake();
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
    this.send('isready');
    await this.await_((l) => l.startsWith('readyok'));
  }

  /** Serialize evals — one `go` at a time per worker. */
  evaluate(fen: string, depth = 12): Promise<EngineEval> {
    const run = async (): Promise<EngineEval> => {
      await this.ready;
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

  dispose() {
    try {
      this.send('quit');
    } catch {
      /* worker may already be gone */
    }
    this.worker.terminate();
  }
}
