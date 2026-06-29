/**
 * A small pool of single-threaded Stockfish workers. Our WASM build can't use
 * multiple threads on GitHub Pages (no SharedArrayBuffer without COOP/COEP
 * headers Pages won't serve), so to use more than one CPU core we run several
 * independent workers and hand each one a different game to analyze. That gives
 * near-linear speedup with the pool size.
 */
import { Engine } from './engine';

/**
 * Pick a pool size and per-engine hash budget that's fast on a desktop but
 * won't exhaust a phone's RAM. Each worker holds its own hash table, so total
 * memory ≈ size × hashMb; we scale both down on low-memory / low-core devices.
 */
export function poolPlan(): { size: number; hashMb: number } {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  // navigator.deviceMemory is GB (Chrome only); treat <= 4 GB as "small".
  const mem = typeof navigator !== 'undefined' ? (navigator as { deviceMemory?: number }).deviceMemory : undefined;
  const small = mem !== undefined && mem <= 4;
  const size = Math.max(1, Math.min(small ? 2 : 4, cores - 1));
  const hashMb = small ? 32 : 64;
  return { size, hashMb };
}

export class EnginePool {
  private engines: Engine[] = [];
  private free: Engine[] = [];
  private waiters: ((e: Engine) => void)[] = [];
  private readonly target: number;
  private readonly makeEngine: () => Engine;

  /**
   * @param makeEngine factory (overridable in tests); defaults to a real Engine
   *   with the given hash budget.
   */
  constructor(size: number, hashMb = 64, makeEngine: () => Engine = () => new Engine(undefined, hashMb)) {
    this.target = Math.max(1, size);
    this.makeEngine = makeEngine;
  }

  get size(): number {
    return this.engines.length;
  }

  /**
   * Bring engines up ONE AT A TIME (not all at once): spawning several Stockfish
   * WASM workers simultaneously can stall or exhaust memory on weaker devices,
   * which is exactly the "all engines time out" failure mode. We create each
   * worker, wait for it to handshake, and only then start the next.
   *
   * - If the very first engine can't start, the build/worker is broken — throw
   *   its (diagnostic) error immediately rather than retrying N times.
   * - If a later engine fails, we keep the ones already up and stop adding more,
   *   so the run proceeds (just with fewer workers).
   *
   * @returns the number of engines that came up (always >= 1 on success).
   */
  async warmup(onProgress?: (ready: number, target: number) => void): Promise<number> {
    for (let i = 0; i < this.target; i++) {
      const engine = this.makeEngine();
      try {
        await engine.whenReady();
        this.engines.push(engine);
        this.free.push(engine);
        onProgress?.(this.engines.length, this.target);
      } catch (err) {
        engine.dispose();
        if (this.engines.length === 0) {
          throw err instanceof Error ? err : new Error(String(err));
        }
        break; // already have a working engine; don't burn time on more
      }
    }
    // Hand newly-ready engines to anyone who called run() before warmup finished.
    while (this.free.length && this.waiters.length) {
      this.waiters.shift()!(this.free.pop()!);
    }
    return this.engines.length;
  }

  private acquire(): Promise<Engine> {
    const e = this.free.pop();
    if (e) return Promise.resolve(e);
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private release(e: Engine): void {
    const next = this.waiters.shift();
    if (next) next(e);
    else this.free.push(e);
  }

  /** Run `fn` on the next free engine, returning the engine to the pool after. */
  async run<T>(fn: (engine: Engine) => Promise<T>): Promise<T> {
    const engine = await this.acquire();
    try {
      return await fn(engine);
    } finally {
      this.release(engine);
    }
  }

  dispose(): void {
    for (const e of this.engines) e.dispose();
    this.engines = [];
    this.free = [];
    this.waiters = [];
  }
}
