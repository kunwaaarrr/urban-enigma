import { describe, expect, it } from 'vitest';
import { gamePhase, type AltMove, type MoveError, type ErrorTag, type Phase } from '../src/chess/review';
import {
  buildDrills,
  buildProfile,
  gradeDrillMove,
  isCorrectMove,
  openingName,
  outcome,
  type DrillPuzzle,
  type GameReview,
} from '../src/chess/profile';
import type { ChessComGame } from '../src/chess/chesscom';

function err(tag: ErrorTag, phase: Phase, loss: number, extra: Partial<MoveError> = {}): MoveError {
  return {
    ply: 10,
    moveNumber: 6,
    color: 'w',
    san: 'Qh5',
    from: 'd1',
    to: 'h5',
    bestSan: 'Nf3',
    bestFrom: 'g1',
    bestTo: 'f3',
    loss,
    tag,
    phase,
    fenBefore: 'startpos',
    fenAfter: 'startpos',
    ...extra,
  };
}

function mkGame(over: Partial<ChessComGame>): ChessComGame {
  return {
    url: 'https://chess.com/game/1',
    pgn: '1. e4 e5',
    time_control: '600',
    end_time: 1,
    rated: true,
    time_class: 'rapid',
    rules: 'chess',
    white: { username: 'me', result: 'win' },
    black: { username: 'opp', result: 'checkmated' },
    ...over,
  };
}

describe('gamePhase', () => {
  it('classifies by material and move number', () => {
    expect(gamePhase('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 2)).toBe('opening');
    expect(gamePhase('r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 20', 20)).toBe('middlegame');
    expect(gamePhase('8/5k2/8/8/8/3K4/4P3/8 w - - 0 50', 50)).toBe('endgame');
  });
});

describe('outcome', () => {
  it('reads the player-side result string', () => {
    expect(outcome(mkGame({ white: { username: 'me', result: 'win' } }), 'w')).toBe('win');
    expect(outcome(mkGame({ black: { username: 'opp', result: 'agreed' } }), 'b')).toBe('draw');
    expect(outcome(mkGame({ black: { username: 'opp', result: 'resigned' } }), 'b')).toBe('loss');
  });
});

describe('openingName', () => {
  it('humanizes an ECOUrl slug', () => {
    const pgn = '[ECOUrl "https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation"]\n\n1. e4 c6';
    expect(openingName(pgn)).toBe('Caro Kann Defense Advance Variation');
  });
  it('strips trailing move tokens and falls back to ECO code', () => {
    const withMoves = '[ECOUrl "https://www.chess.com/openings/Kings-Pawn-Opening-2.Nf3"]';
    expect(openingName(withMoves)).toBe('Kings Pawn Opening');
    expect(openingName('[ECO "B12"]')).toBe('B12');
    expect(openingName('no headers here')).toBe('Unknown opening');
  });
});

describe('buildProfile', () => {
  const reviews: GameReview[] = [
    {
      game: mkGame({
        url: 'g1',
        pgn: '[ECOUrl "https://www.chess.com/openings/Sicilian-Defense"]\n\n1. e4 c5',
        white: { username: 'me', result: 'win' },
      }),
      side: 'w',
      errors: [err('blunder', 'middlegame', 400), err('inaccuracy', 'opening', 60)],
    },
    {
      game: mkGame({
        url: 'g2',
        pgn: '[ECOUrl "https://www.chess.com/openings/Sicilian-Defense"]\n\n1. e4 c5',
        white: { username: 'me', result: 'checkmated' },
      }),
      side: 'w',
      errors: [err('mistake', 'middlegame', 150), err('blunder', 'middlegame', 500)],
    },
  ];

  it('aggregates record, tags and phases', () => {
    const p = buildProfile(reviews, 'me');
    expect(p.gamesAnalyzed).toBe(2);
    expect(p.record).toEqual({ wins: 1, losses: 1, draws: 0 });
    expect(p.byTag).toEqual({ blunder: 2, mistake: 1, inaccuracy: 1 });
    expect(p.byPhase.middlegame.blunder).toBe(2);
    expect(p.byPhase.opening.inaccuracy).toBe(1);
  });

  it('points the improvement focus at the worst phase and ranks openings', () => {
    const p = buildProfile(reviews, 'me');
    expect(p.improvements.join(' ')).toMatch(/middlegame/);
    // Sicilian played twice, 50% score → appears in the ranked openings.
    expect(p.worstOpenings[0].name).toBe('Sicilian Defense');
    expect(p.worstOpenings[0].games).toBe(2);
    expect(p.worstOpenings[0].scorePct).toBe(50);
    expect(p.strengths.length).toBeGreaterThan(0);
    expect(p.improvements.length).toBeGreaterThan(0);
  });
});

describe('buildDrills', () => {
  const reviews: GameReview[] = [
    {
      game: mkGame({ url: 'g1' }),
      side: 'w',
      errors: [
        err('mistake', 'middlegame', 150, { fenBefore: 'fenM' }),
        err('inaccuracy', 'opening', 60, { fenBefore: 'fenI' }),
        err('blunder', 'middlegame', 500, { fenBefore: 'fenB' }),
      ],
    },
  ];

  it('drops inaccuracies and orders blunders before mistakes by loss', () => {
    const drills = buildDrills(reviews);
    expect(drills.map((d) => d.fen)).toEqual(['fenB', 'fenM']); // blunder first
    expect(drills.every((d) => d.tag !== 'inaccuracy')).toBe(true);
    expect(drills[0].orientation).toBe('w');
    // played move fields come from the error's from/to
    expect(drills[0].playedFrom).toBe('d1');
    expect(drills[0].playedTo).toBe('h5');
  });

  it('caps the number of puzzles', () => {
    const many: GameReview[] = [
      { game: mkGame({}), side: 'w', errors: Array.from({ length: 80 }, () => err('blunder', 'middlegame', 300)) },
    ];
    expect(buildDrills(many, 60)).toHaveLength(60);
  });
});

describe('isCorrectMove', () => {
  it('matches the engine best move squares', () => {
    const [drill] = buildDrills([
      { game: mkGame({}), side: 'w', errors: [err('blunder', 'middlegame', 300, { bestFrom: 'g1', bestTo: 'f3' })] },
    ]);
    expect(isCorrectMove(drill, 'g1', 'f3')).toBe(true);
    expect(isCorrectMove(drill, 'd1', 'h5')).toBe(false);
  });
});

describe('gradeDrillMove', () => {
  // Best Nf3 (+50), 2nd Bc4 (+30, -20 from best), 3rd d4 (-40, -90 from best).
  const alts: AltMove[] = [
    { san: 'Nf3', from: 'g1', to: 'f3', score: 50 },
    { san: 'Bc4', from: 'f1', to: 'c4', score: 30 },
    { san: 'd4', from: 'd2', to: 'd4', score: -40 },
  ];
  const puzzle: DrillPuzzle = {
    fen: 'startpos',
    orientation: 'w',
    bestFrom: 'g1',
    bestTo: 'f3',
    bestSan: 'Nf3',
    playedSan: 'Qh5',
    playedFrom: 'd1',
    playedTo: 'h5',
    tag: 'blunder',
    phase: 'opening',
    loss: 300,
    moveNumber: 6,
    gameUrl: 'g',
    alts,
  };

  it('accepts the engine best move', () => {
    expect(gradeDrillMove(puzzle, 'g1', 'f3')).toEqual({ kind: 'correct' });
  });

  it('recognizes a near-best alternative', () => {
    const v = gradeDrillMove(puzzle, 'f1', 'c4');
    expect(v.kind).toBe('good-alt');
    expect('message' in v && v.message).toMatch(/almost as good/);
  });

  it('recognizes a decent-but-worse alternative', () => {
    const v = gradeDrillMove(puzzle, 'd2', 'd4');
    expect(v.kind).toBe('good-alt');
    expect('message' in v && v.message).toMatch(/not the worst|playable/i);
  });

  it('calls out repeating the exact game move', () => {
    const v = gradeDrillMove(puzzle, 'd1', 'h5');
    expect(v.kind).toBe('same-move');
  });

  it('rejects an unrelated move not in the top list', () => {
    const v = gradeDrillMove(puzzle, 'a2', 'a3');
    expect(v.kind).toBe('wrong');
  });

  it('falls back gracefully when no alternatives are stored', () => {
    const noAlts = { ...puzzle, alts: undefined };
    expect(gradeDrillMove(noAlts, 'g1', 'f3').kind).toBe('correct');
    expect(gradeDrillMove(noAlts, 'd1', 'h5').kind).toBe('same-move');
    expect(gradeDrillMove(noAlts, 'a2', 'a3').kind).toBe('wrong');
  });
});
