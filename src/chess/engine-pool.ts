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
  private engines: Engine[];
  private free: Engine[];
  private waiters: ((e: Engine) => void)[] = [];

  /**
   * @param makeEngine factory (overridable in tests); defaults to a real Engine
   *   with the given hash budget.
   */
  constructor(size: number, hashMb = 64, makeEngine: () => Engine = () => new Engine(undefined, hashMb)) {
    this.engines = Array.from({ length: Math.max(1, size) }, makeEngine);
    this.free = [...this.engines];
  }

  get size(): number {
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
