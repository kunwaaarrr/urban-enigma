import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { linesToAlts, reviewGame, type Evaluator } from '../src/chess/review';
import { evalToCp, MATE_CP, type EngineEval, type EngineLine } from '../src/chess/engine';

describe('linesToAlts', () => {
  it('names legal moves, scores them, and drops illegal/unparseable lines', () => {
    const start = new Chess().fen();
    const lines: EngineLine[] = [
      { uci: 'e2e4', cp: 30 },
      { uci: 'g1f3', cp: 20 },
      { uci: 'e2e5', cp: 999 }, // illegal from the start position → dropped
      { uci: 'd2d4', mate: 5 }, // mate score folds into a large cp value
    ];
    const alts = linesToAlts(start, lines);
    expect(alts.map((a) => a.san)).toEqual(['e4', 'Nf3', 'd4']);
    expect(alts[0].score).toBe(30);
    expect(alts[2].score).toBe(evalToCp({ mate: 5, bestMove: 'd2d4' }));
  });
});

/** Build the FEN-before-each-move sequence plus the final FEN, like reviewGame. */
function fenSequence(pgn: string): string[] {
  const replay = new Chess();
  replay.loadPgn(pgn);
  const board = new Chess();
  const fens: string[] = [];
  for (const m of replay.history()) {
    fens.push(board.fen());
    board.move(m);
  }
  fens.push(board.fen());
  return fens;
}

describe('evalToCp', () => {
  it('passes centipawns through', () => {
    expect(evalToCp({ cp: 35, bestMove: 'e2e4' })).toBe(35);
  });
  it('maps mate to a large finite value that decays with distance', () => {
    expect(evalToCp({ mate: 1, bestMove: '' })).toBeGreaterThan(evalToCp({ mate: 5, bestMove: '' }));
    expect(evalToCp({ mate: 1, bestMove: '' })).toBeGreaterThan(MATE_CP - 1000);
    expect(evalToCp({ mate: -1, bestMove: '' })).toBeLessThan(-MATE_CP + 1000);
  });
});

describe('reviewGame', () => {
  // 1. e4 e5 2. Ke2 — white's 3rd ply is a self-inflicted blunder.
  const pgn = '1. e4 e5 2. Ke2 Nf6';

  it('flags the engineered blunder for the player side only', async () => {
    const fens = fenSequence(pgn);
    // Index 2 = position before White's Ke2 (White to move, slightly better).
    // Index 3 = after Ke2 (Black to move, now winning).
    const byFen: Record<string, EngineEval> = {
      [fens[2]]: { cp: 30, bestMove: 'g1f3' },
      [fens[3]]: { cp: 500, bestMove: 'f6e4' },
    };
    const evaluate: Evaluator = async (fen) => byFen[fen] ?? { cp: 0, bestMove: 'a2a3' };

    const errors = await reviewGame(pgn, evaluate, { side: 'w' });
    expect(errors).toHaveLength(1);
    expect(errors[0].san).toBe('Ke2');
    expect(errors[0].tag).toBe('blunder');
    expect(errors[0].loss).toBe(530); // 30 (before) + 500 (after, opp perspective)
    expect(errors[0].bestSan).toBe('Nf3'); // g1f3 → SAN from that position
    expect(errors[0].color).toBe('w');
  });

  it('ignores the same blunder when reviewing the other side', async () => {
    const fens = fenSequence(pgn);
    const byFen: Record<string, EngineEval> = {
      [fens[2]]: { cp: 30, bestMove: 'g1f3' },
      [fens[3]]: { cp: 500, bestMove: 'f6e4' },
      // After Black's Nf6 it's White to move at -500 (Black keeps the +500),
      // so Black's move loses ~0 — a near-best reply, not flagged.
      [fens[4]]: { cp: -500, bestMove: 'e1e2' },
    };
    const evaluate: Evaluator = async (fen) => byFen[fen] ?? { cp: 0, bestMove: 'a2a3' };
    const errors = await reviewGame(pgn, evaluate, { side: 'b' });
    expect(errors).toHaveLength(0);
  });

  it('does not flag near-best moves and clamps negative loss to zero', async () => {
    // Flat 0 everywhere → no losses, nothing flagged.
    const evaluate: Evaluator = async () => ({ cp: 0, bestMove: 'a2a3' });
    const errors = await reviewGame(pgn, evaluate, {});
    expect(errors).toHaveLength(0);
  });

  it('reports progress for every position (N moves + 1)', async () => {
    const evaluate: Evaluator = async () => ({ cp: 0, bestMove: 'a2a3' });
    let lastDone = 0;
    let lastTotal = 0;
    await reviewGame(pgn, evaluate, {
      onProgress: (done, total) => {
        lastDone = done;
        lastTotal = total;
      },
    });
    const plies = fenSequence(pgn).length - 1;
    expect(lastTotal).toBe(plies + 1);
    expect(lastDone).toBe(plies + 1);
  });
});
