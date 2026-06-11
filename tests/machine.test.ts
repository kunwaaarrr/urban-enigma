import { describe, expect, it } from 'vitest';
import { initTrainer, reduce, visibleHints, type TrainerState } from '../src/trainer/machine';
import { getLines } from '../src/data/openings';

// Caro-Kann lines start with the opponent (1.e4); Vienna lines start with the user.
const ckLine = getLines('caro-kann')[0];
const viennaLine = getLines('vienna')[0];

function play(state: TrainerState, sans: string[]): TrainerState {
  let s = state;
  for (const san of sans) {
    if (s.phase === 'opponent') {
      s = reduce(s, { type: 'OPPONENT_DONE' }).state;
    }
    expect(s.phase).toBe('await');
    expect(s.line.plies[s.plyIndex].san).toBe(san);
    s = reduce(s, { type: 'USER_MOVE', san }).state;
  }
  return s;
}

describe('trainer machine', () => {
  it('begins with the opponent when the user plays Black', () => {
    const s0 = initTrainer(ckLine, 'drill');
    expect(s0.phase).toBe('intro');
    const { state: s1, effects } = reduce(s0, { type: 'BEGIN' });
    expect(s1.phase).toBe('opponent');
    expect(effects).toEqual([{ type: 'schedule-opponent' }]);
    const { state: s2 } = reduce(s1, { type: 'OPPONENT_DONE' });
    expect(s2.phase).toBe('await');
    expect(s2.line.plies[s2.plyIndex].isUserMove).toBe(true);
  });

  it('begins with the user when the user plays White', () => {
    const { state } = reduce(initTrainer(viennaLine, 'drill'), { type: 'BEGIN' });
    expect(state.phase).toBe('await');
    expect(state.plyIndex).toBe(0);
  });

  it('accepts the correct move and schedules the opponent reply', () => {
    let s = reduce(initTrainer(ckLine, 'drill'), { type: 'BEGIN' }).state;
    s = reduce(s, { type: 'OPPONENT_DONE' }).state; // 1.e4 played
    const expected = s.line.plies[s.plyIndex].san; // c6
    const { state, effects } = reduce(s, { type: 'USER_MOVE', san: expected });
    expect(state.phase).toBe('opponent');
    expect(effects).toContainEqual({ type: 'schedule-opponent' });
  });

  it('escalates hints after misses in drill mode', () => {
    let s = reduce(initTrainer(ckLine, 'drill'), { type: 'BEGIN' }).state;
    s = reduce(s, { type: 'OPPONENT_DONE' }).state;

    const r1 = reduce(s, { type: 'USER_MOVE', san: 'a6' });
    expect(r1.effects).toContainEqual({ type: 'flash-wrong' });
    expect(r1.state.misses).toBe(1);
    expect(visibleHints(r1.state)).toEqual({ arrows: false, text: false });

    const r2 = reduce(r1.state, { type: 'USER_MOVE', san: 'h6' });
    expect(r2.state.hintLevel).toBe(1);
    expect(visibleHints(r2.state)).toEqual({ arrows: true, text: false });

    const r3 = reduce(r2.state, { type: 'USER_MOVE', san: 'b6' });
    expect(r3.state.hintLevel).toBe(2);
    expect(visibleHints(r3.state)).toEqual({ arrows: true, text: true });

    // Correct move still accepted after misses, and the counters reset.
    const ok = reduce(r3.state, { type: 'USER_MOVE', san: 'c6' });
    expect(ok.state.misses).toBe(0);
    expect(ok.state.totalMisses).toBe(3);
  });

  it('learn mode always shows hints and never penalizes', () => {
    let s = reduce(initTrainer(ckLine, 'learn'), { type: 'BEGIN' }).state;
    s = reduce(s, { type: 'OPPONENT_DONE' }).state;
    expect(visibleHints(s)).toEqual({ arrows: true, text: true });
    const wrong = reduce(s, { type: 'USER_MOVE', san: 'a6' });
    expect(wrong.state.hintLevel).toBe(0); // unchanged — learn derives visibility from mode
    expect(visibleHints(wrong.state)).toEqual({ arrows: true, text: true });
  });

  it('completes a full drill run cleanly and records mastery', () => {
    let s = reduce(initTrainer(ckLine, 'drill'), { type: 'BEGIN' }).state;
    const userSans = ckLine.plies.filter((p) => p.isUserMove).map((p) => p.san);
    s = play(s, userSans.slice(0, -1));
    if (s.phase === 'opponent') s = reduce(s, { type: 'OPPONENT_DONE' }).state;
    const last = reduce(s, { type: 'USER_MOVE', san: userSans[userSans.length - 1] });
    expect(last.state.phase).toBe('complete');
    expect(last.effects).toContainEqual({ type: 'record-result', clean: true });
  });

  it('does not record results in learn mode', () => {
    let s = reduce(initTrainer(ckLine, 'learn'), { type: 'BEGIN' }).state;
    const userSans = ckLine.plies.filter((p) => p.isUserMove).map((p) => p.san);
    s = play(s, userSans);
    expect(s.phase).toBe('complete');
    // play() already consumed all effects; replay last transition to inspect:
    const before = play(reduce(initTrainer(ckLine, 'learn'), { type: 'BEGIN' }).state, userSans.slice(0, -1));
    let pre = before;
    if (pre.phase === 'opponent') pre = reduce(pre, { type: 'OPPONENT_DONE' }).state;
    const { effects } = reduce(pre, { type: 'USER_MOVE', san: userSans[userSans.length - 1] });
    expect(effects.find((e) => e.type === 'record-result')).toBeUndefined();
  });

  it('treats documented alternatives as "also" without penalty', () => {
    const panov = getLines('caro-kann').find((l) => l.id.startsWith('ck-panov'));
    expect(panov).toBeDefined();
    let s = reduce(initTrainer(panov!, 'drill'), { type: 'BEGIN' }).state;
    const idx = panov!.plies.findIndex((p) => p.also?.length);
    expect(idx).toBeGreaterThan(0);
    const userSans = panov!.plies.filter((p, i) => p.isUserMove && i < idx).map((p) => p.san);
    s = play(s, userSans);
    if (s.phase === 'opponent') s = reduce(s, { type: 'OPPONENT_DONE' }).state;
    const alt = panov!.plies[idx].also![0];
    const r = reduce(s, { type: 'USER_MOVE', san: alt });
    expect(r.state.alsoNote).toBe(alt);
    expect(r.state.totalMisses).toBe(0);
    expect(r.effects).toEqual([]);
  });

  it('seeks backward in learn mode only', () => {
    let s = reduce(initTrainer(ckLine, 'learn'), { type: 'BEGIN' }).state;
    s = reduce(s, { type: 'OPPONENT_DONE' }).state;
    s = reduce(s, { type: 'USER_MOVE', san: 'c6' }).state;
    expect(s.plyIndex).toBe(2);
    const back = reduce(s, { type: 'SEEK', index: 0 });
    expect(back.state.plyIndex).toBe(0);
    expect(back.state.phase).toBe('opponent');

    const drill = reduce(initTrainer(ckLine, 'drill'), { type: 'BEGIN' }).state;
    const denied = reduce(drill, { type: 'SEEK', index: 0 });
    expect(denied.state).toBe(drill);
  });
});
