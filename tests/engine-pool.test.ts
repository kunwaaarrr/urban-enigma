import { describe, expect, it } from 'vitest';
import { EnginePool, poolPlan } from '../src/chess/engine-pool';
import type { Engine } from '../src/chess/engine';

// A fake engine — the pool only ever warms up, hands out, and disposes them.
function fakeEngine(): Engine {
  return { whenReady: () => Promise.resolve(), dispose() {} } as unknown as Engine;
}

// A fake engine factory whose engines fail to initialize (reject whenReady).
function deadEngine(message = 'init failed'): () => Engine {
  return () => ({ whenReady: () => Promise.reject(new Error(message)), dispose() {} }) as unknown as Engine;
}

describe('EnginePool', () => {
  it('never runs more tasks concurrently than its size', async () => {
    const pool = new EnginePool(2, 64, fakeEngine);
    expect(await pool.warmup()).toBe(2);
    let active = 0;
    let peak = 0;
    const task = () =>
      pool.run(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
      });
    await Promise.all(Array.from({ length: 6 }, task));
    expect(peak).toBeLessThanOrEqual(2);
    expect(peak).toBeGreaterThan(0);
    pool.dispose();
  });

  it('runs every queued task to completion', async () => {
    const pool = new EnginePool(3, 64, fakeEngine);
    await pool.warmup();
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => pool.run(async () => i * 2)),
    );
    expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    pool.dispose();
  });

  it('releases the engine even when a task throws', async () => {
    const pool = new EnginePool(1, 64, fakeEngine);
    await pool.warmup();
    await expect(pool.run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    // If the engine wasn't released, this second task would hang forever.
    await expect(pool.run(async () => 'ok')).resolves.toBe('ok');
    pool.dispose();
  });

  it('warmup brings up engines one at a time and reports the count', async () => {
    const pool = new EnginePool(3, 64, fakeEngine);
    const seen: number[] = [];
    const n = await pool.warmup((ready) => seen.push(ready));
    expect(n).toBe(3);
    expect(seen).toEqual([1, 2, 3]); // sequential, not all-at-once
    expect(pool.size).toBe(3);
    pool.dispose();
  });

  it('throws the diagnostic error when the first engine fails to start', async () => {
    const pool = new EnginePool(4, 64, deadEngine('stockfish.wasm: HTTP 404'));
    await expect(pool.warmup()).rejects.toThrow(/HTTP 404/);
    expect(pool.size).toBe(0);
    pool.dispose();
  });

  it('proceeds with survivors when a later engine fails', async () => {
    let made = 0;
    const flaky = (): Engine => {
      made++;
      const ok = made <= 2; // first two start, third dies
      return {
        whenReady: () => (ok ? Promise.resolve() : Promise.reject(new Error('died'))),
        dispose() {},
      } as unknown as Engine;
    };
    const pool = new EnginePool(4, 64, flaky);
    expect(await pool.warmup()).toBe(2); // kept the two that came up
    await expect(pool.run(async () => 'ok')).resolves.toBe('ok');
    pool.dispose();
  });
});

describe('poolPlan', () => {
  it('returns a sane, bounded plan', () => {
    const plan = poolPlan();
    expect(plan.size).toBeGreaterThanOrEqual(1);
    expect(plan.size).toBeLessThanOrEqual(4);
    expect(plan.hashMb).toBeGreaterThan(0);
  });
});
