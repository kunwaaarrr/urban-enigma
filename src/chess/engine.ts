/**
 * Stockfish engine wrapper. Loads the single-threaded NNUE build in a Web
 * Worker so it runs off the main thread without needing SharedArrayBuffer —
 * which means no COOP/COEP headers, so it works on GitHub Pages as-is.
 *
 * The engine script is loaded from a CDN by default (no repo bloat); pass a
 * different `engineUrl` to self-host a vendored copy under `public/engine/`.
 */

export interface EngineEval {
  /** Centipawns from the side-to-move's perspective (+ = side to move better). */
  cp?: number;
  /** Mate in N from the side-to-move's perspective (+ = side to move mates). */
  mate?: number;
  /** Best move in UCI long form, e.g. "e2e4" / "e7e8q". */
  bestMove: string;
}

const DEFAULT_ENGINE_URL = 'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js';

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

  constructor(engineUrl: string = DEFAULT_ENGINE_URL) {
    // A tiny bootstrap worker that pulls the (possibly cross-origin) engine in
    // via importScripts — allowed for workers even across origins.
    const bootstrap = `importScripts(${JSON.stringify(engineUrl)});`;
    const blob = new Blob([bootstrap], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
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
      await this.await_(
        (l) => l.startsWith('bestmove'),
        (line) => {
          if (line.startsWith('info') && line.includes(' pv ')) {
            const cpM = line.match(/score cp (-?\d+)/);
            const mateM = line.match(/score mate (-?\d+)/);
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
      return { cp, mate, bestMove };
    };
    // Chain so concurrent callers don't interleave UCI commands.
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  dispose() {
    this.send('quit');
    this.worker.terminate();
  }
}
