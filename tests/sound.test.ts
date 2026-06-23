import { describe, expect, it } from 'vitest';
import { soundForSan } from '../src/trainer/sound-map';
import { initTrainer, reduce } from '../src/trainer/machine';
import { getLines } from '../src/data/openings';

describe('soundForSan', () => {
  it('maps SAN to the right sound with chess.com-style priority', () => {
    expect(soundForSan('e4')).toBe('move');
    expect(soundForSan('Nf3')).toBe('move');
    expect(soundForSan('exd5')).toBe('capture');
    expect(soundForSan('Bxf7+')).toBe('check'); // check beats capture
    expect(soundForSan('Qh5#')).toBe('check');
    expect(soundForSan('O-O')).toBe('castle');
    expect(soundForSan('O-O-O')).toBe('castle');
    expect(soundForSan('e8=Q')).toBe('promote');
    expect(soundForSan('exd8=Q+')).toBe('promote'); // promotion beats check/capture
  });
});

describe('machine sound effects', () => {
  const ckLine = getLines('caro-kann')[0]; // starts with opponent 1.e4

  it('plays a start sound on BEGIN', () => {
    const { effects } = reduce(initTrainer(ckLine, 'learn'), { type: 'BEGIN' });
    expect(effects).toContainEqual({ type: 'play-sound', sound: 'start' });
  });

  it('plays the move sound for the opponent reply and the user move', () => {
    let s = reduce(initTrainer(ckLine, 'learn'), { type: 'BEGIN' }).state;
    const opp = reduce(s, { type: 'OPPONENT_DONE' }); // 1.e4 lands
    expect(opp.effects).toContainEqual({ type: 'play-sound', sound: 'move' });
    s = opp.state;
    const user = reduce(s, { type: 'USER_MOVE', san: s.line.plies[s.plyIndex].san }); // 1...c6
    expect(user.effects).toContainEqual({ type: 'play-sound', sound: 'move' });
  });

  it('plays an error sound on a wrong move', () => {
    let s = reduce(initTrainer(ckLine, 'drill'), { type: 'BEGIN' }).state;
    s = reduce(s, { type: 'OPPONENT_DONE' }).state;
    const wrong = reduce(s, { type: 'USER_MOVE', san: 'a6' });
    expect(wrong.effects).toContainEqual({ type: 'play-sound', sound: 'error' });
  });

  it('plays a complete sound when the line finishes', () => {
    let s = reduce(initTrainer(ckLine, 'learn'), { type: 'BEGIN' }).state;
    const userSans = ckLine.plies.filter((p) => p.isUserMove).map((p) => p.san);
    for (let i = 0; i < userSans.length - 1; i++) {
      if (s.phase === 'opponent') s = reduce(s, { type: 'OPPONENT_DONE' }).state;
      s = reduce(s, { type: 'USER_MOVE', san: userSans[i] }).state;
    }
    if (s.phase === 'opponent') s = reduce(s, { type: 'OPPONENT_DONE' }).state;
    const last = reduce(s, { type: 'USER_MOVE', san: userSans[userSans.length - 1] });
    expect(last.state.phase).toBe('complete');
    expect(last.effects).toContainEqual({ type: 'play-sound', sound: 'complete' });
  });
});
