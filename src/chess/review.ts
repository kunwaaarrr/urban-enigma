import { Chess } from 'chess.js';
import { evalToCp, type EngineEval } from './engine';

/** Anything that can score a FEN (the real Engine, or a fake in tests). */
export type Evaluator = (fen: string, depth?: number) => Promise<EngineEval>;

export type ErrorTag = 'inaccuracy' | 'mistake' | 'blunder';
export type Phase = 'opening' | 'middlegame' | 'endgame';

/** Coarse phase from material + move number, for grouping mistakes. */
export function gamePhase(fen: string, moveNumber: number): Phase {
  const placement = fen.split(' ')[0];
  // Minor + major pieces still on the board (exclude kings and pawns).
  const heavy = (placement.match(/[qrbnQRBN]/g) ?? []).length;
  if (heavy <= 6) return 'endgame';
  if (moveNumber <= 12) return 'opening';
  return 'middlegame';
}

export interface MoveError {
  /** Ply index within the game (0-based). */
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  /** The move the player actually made (SAN). */
  san: string;
  from: string;
  to: string;
  /** The engine's preferred move (SAN, from the position before the move). */
  bestSan: string;
  bestFrom: string;
  bestTo: string;
  /** Centipawns lost vs. the best move (>= 0). */
  loss: number;
  tag: ErrorTag;
  phase: Phase;
  fenBefore: string;
  fenAfter: string;
}

export interface ReviewThresholds {
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

export const DEFAULT_THRESHOLDS: ReviewThresholds = { inaccuracy: 50, mistake: 100, blunder: 200 };

function classify(loss: number, t: ReviewThresholds): ErrorTag | null {
  if (loss >= t.blunder) return 'blunder';
  if (loss >= t.mistake) return 'mistake';
  if (loss >= t.inaccuracy) return 'inaccuracy';
  return null;
}

/** UCI long move (e2e4, e7e8q) → SAN from a given position, best-effort. */
function uciToSan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) return uci;
  const chess = new Chess(fen);
  try {
    const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    return move.san;
  } catch {
    return uci;
  }
}

export interface ReviewOptions {
  depth?: number;
  thresholds?: ReviewThresholds;
  /** Only flag moves by this color (the player). Omit to flag both sides. */
  side?: 'w' | 'b';
  /** Progress callback: (pliesDone, pliesTotal). */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Walk a game's PGN, evaluate every position once, and flag the player's
 * inaccuracies/mistakes/blunders by centipawn loss vs. the engine's best move.
 *
 * Centipawn loss for a move by side S = eval(before, S-perspective) +
 * eval(after, opponent-perspective): the second term is the achieved value
 * negated into S's frame, so a hung queen yields ~+900 + ~+900 → ~900 lost.
 */
export async function reviewGame(pgn: string, evaluate: Evaluator, opts: ReviewOptions = {}): Promise<MoveError[]> {
  const { depth = 12, thresholds = DEFAULT_THRESHOLDS, side, onProgress } = opts;

  const replay = new Chess();
  replay.loadPgn(pgn);
  const history = replay.history({ verbose: true });

  // Reconstruct the FEN before each move (history[i] is played from fens[i]).
  const board = new Chess();
  const fens: string[] = [];
  for (const m of history) {
    fens.push(board.fen());
    board.move(m.san);
  }
  const fenFinal = board.fen();

  const total = history.length + 1;
  let done = 0;
  const report = () => onProgress?.(++done, total);

  // Evaluate every position 0..N (N = after the last move).
  const evalsByCp: number[] = [];
  const bestUci: string[] = [];
  for (let i = 0; i < fens.length; i++) {
    const e = await evaluate(fens[i], depth);
    evalsByCp.push(evalToCp(e));
    bestUci.push(e.bestMove);
    report();
  }
  const eAfterFinal = await evaluate(fenFinal, depth);
  evalsByCp.push(evalToCp(eAfterFinal));
  report();

  const errors: MoveError[] = [];
  for (let i = 0; i < history.length; i++) {
    const mv = history[i];
    if (side && mv.color !== side) continue;
    const before = evalsByCp[i]; // S-to-move perspective at fens[i]
    const afterOpp = evalsByCp[i + 1]; // opponent perspective after the move
    const loss = Math.max(0, before + afterOpp);
    const tag = classify(loss, thresholds);
    if (!tag) continue;
    const best = bestUci[i] ?? '';
    const moveNumber = Math.floor(i / 2) + 1;
    errors.push({
      ply: i,
      moveNumber,
      color: mv.color,
      san: mv.san,
      from: mv.from,
      to: mv.to,
      bestSan: uciToSan(fens[i], best),
      bestFrom: best.slice(0, 2),
      bestTo: best.slice(2, 4),
      loss,
      tag,
      phase: gamePhase(fens[i], moveNumber),
      fenBefore: fens[i],
      fenAfter: i + 1 < fens.length ? fens[i + 1] : fenFinal,
    });
  }
  return errors;
}
