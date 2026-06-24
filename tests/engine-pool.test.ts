import { describe, expect, it } from 'vitest';
import { EnginePool, poolPlan } from '../src/chess/engine-pool';
import type { Engine } from '../src/chess/engine';

// A fake engine — the pool only ever creates, hands out, and disposes them.
function fakeEngine(): Engine {
  return { dispose() {} } as unknown as Engine;
}

describe('EnginePool', () => {
  it('never runs more tasks concurrently than its size', async () => {
    const pool = new EnginePool(2, 64, fakeEngine);
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
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => pool.run(async () => i * 2)),
    );
    expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    pool.dispose();
  });

  it('releases the engine even when a task throws', async () => {
    const pool = new EnginePool(1, 64, fakeEngine);
    await expect(pool.run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    // If the engine wasn't released, this second task would hang forever.
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
