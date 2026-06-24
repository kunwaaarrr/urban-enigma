import { Chess } from 'chess.js';
import type { ChessComGame } from './chesscom';
import type { ErrorTag, MoveError, Phase } from './review';

export interface GameReview {
  game: ChessComGame;
  side: 'w' | 'b';
  errors: MoveError[];
}

export type Outcome = 'win' | 'loss' | 'draw';

/** A single find-the-better-move puzzle distilled from a flagged mistake. */
export interface DrillPuzzle {
  /** Position to solve (before the mistake) — the player is to move. */
  fen: string;
  orientation: 'w' | 'b';
  bestFrom: string;
  bestTo: string;
  bestSan: string;
  /** The move the player actually played in the game (for "same move" detection). */
  playedSan: string;
  playedFrom: string;
  playedTo: string;
  tag: ErrorTag;
  phase: Phase;
  loss: number;
  moveNumber: number;
  gameUrl: string;
}

/** A drill is solved if the played move matches the engine's best move. */
export function isCorrectMove(p: DrillPuzzle, from: string, to: string): boolean {
  return from === p.bestFrom && to === p.bestTo;
}

const TAG_RANK: Record<ErrorTag, number> = { blunder: 0, mistake: 1, inaccuracy: 2 };

/**
 * Flatten flagged mistakes into drill puzzles, worst first (blunders before
 * mistakes, then by centipawn loss). Inaccuracies are dropped — drilling
 * focuses on the moves that actually cost games.
 */
export function buildDrills(reviews: GameReview[], maxPuzzles = 60): DrillPuzzle[] {
  const puzzles: DrillPuzzle[] = [];
  for (const r of reviews) {
    for (const e of r.errors) {
      if (e.tag === 'inaccuracy') continue;
      if (!e.bestFrom || !e.bestTo) continue;
      puzzles.push({
        fen: e.fenBefore,
        orientation: r.side,
        bestFrom: e.bestFrom,
        bestTo: e.bestTo,
        bestSan: e.bestSan,
        playedSan: e.san,
        playedFrom: e.from,
        playedTo: e.to,
        tag: e.tag,
        phase: e.phase,
        loss: e.loss,
        moveNumber: e.moveNumber,
        gameUrl: r.game.url,
      });
    }
  }
  puzzles.sort((a, b) => TAG_RANK[a.tag] - TAG_RANK[b.tag] || b.loss - a.loss);
  return puzzles.slice(0, maxPuzzles);
}

const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
]);

/** Outcome for the player's side from chess.com's per-side result string. */
export function outcome(game: ChessComGame, side: 'w' | 'b'): Outcome {
  const r = (side === 'w' ? game.white.result : game.black.result) ?? '';
  if (r === 'win') return 'win';
  if (DRAW_RESULTS.has(r)) return 'draw';
  return 'loss';
}

/** Human opening name from chess.com PGN headers (ECOUrl slug), else ECO code. */
export function openingName(pgn: string): string {
  const url = pgn.match(/\[ECOUrl "([^"]+)"\]/)?.[1];
  if (url) {
    const slug = url.split('/').pop() ?? '';
    const name = decodeURIComponent(slug).replace(/-/g, ' ').trim();
    // Trim trailing move tokens chess.com appends, e.g. "...-3...d5-4.Nc3".
    return name.replace(/\s+\d+\.?\.?\.?[A-Za-z].*$/, '').trim() || name;
  }
  return pgn.match(/\[ECO "([^"]+)"\]/)?.[1] ?? 'Unknown opening';
}

/** Count the player's own moves in a game (for per-move rates). */
function userMoveCount(pgn: string, side: 'w' | 'b'): number {
  const c = new Chess();
  try {
    c.loadPgn(pgn);
  } catch {
    return 0;
  }
  const total = c.history().length;
  return side === 'w' ? Math.ceil(total / 2) : Math.floor(total / 2);
}

type TagCounts = Record<ErrorTag, number>;
const zeroTags = (): TagCounts => ({ blunder: 0, mistake: 0, inaccuracy: 0 });

export interface OpeningStat {
  name: string;
  games: number;
  scorePct: number; // (wins + 0.5*draws) / games * 100
  losses: number;
}

export interface Profile {
  username: string;
  gamesAnalyzed: number;
  userMoves: number;
  record: { wins: number; losses: number; draws: number };
  byTag: TagCounts;
  byPhase: Record<Phase, TagCounts>;
  /** Serious mistakes (blunder+mistake) per game, rounded to 1 dp. */
  seriousPerGame: number;
  worstOpenings: OpeningStat[];
  bestOpenings: OpeningStat[];
  strengths: string[];
  improvements: string[];
}

const PHASES: Phase[] = ['opening', 'middlegame', 'endgame'];
const PHASE_LABEL: Record<Phase, string> = {
  opening: 'opening',
  middlegame: 'middlegame',
  endgame: 'endgame',
};

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

export function buildProfile(reviews: GameReview[], username: string): Profile {
  const record = { wins: 0, losses: 0, draws: 0 };
  const byTag = zeroTags();
  const byPhase: Record<Phase, TagCounts> = {
    opening: zeroTags(),
    middlegame: zeroTags(),
    endgame: zeroTags(),
  };
  let userMoves = 0;

  // name -> { games, score, losses }
  const openings = new Map<string, { games: number; score: number; losses: number }>();

  for (const r of reviews) {
    const oc = outcome(r.game, r.side);
    record[oc === 'win' ? 'wins' : oc === 'loss' ? 'losses' : 'draws']++;
    userMoves += userMoveCount(r.game.pgn, r.side);

    for (const e of r.errors) {
      byTag[e.tag]++;
      byPhase[e.phase][e.tag]++;
    }

    const name = openingName(r.game.pgn);
    const o = openings.get(name) ?? { games: 0, score: 0, losses: 0 };
    o.games++;
    o.score += oc === 'win' ? 1 : oc === 'draw' ? 0.5 : 0;
    if (oc === 'loss') o.losses++;
    openings.set(name, o);
  }

  const openingStats: OpeningStat[] = [...openings.entries()].map(([name, o]) => ({
    name,
    games: o.games,
    scorePct: pct(o.score, o.games),
    losses: o.losses,
  }));
  // Only rank openings you've played enough to be meaningful.
  const ranked = openingStats.filter((o) => o.games >= 2);
  const worstOpenings = [...ranked].sort((a, b) => a.scorePct - b.scorePct).slice(0, 3);
  const bestOpenings = [...ranked].sort((a, b) => b.scorePct - a.scorePct).slice(0, 3);

  const games = reviews.length || 1;
  const serious = byTag.blunder + byTag.mistake;
  const seriousPerGame = Math.round((serious / games) * 10) / 10;

  // Which phase holds the most serious mistakes?
  const phaseSerious = PHASES.map((p) => ({ p, n: byPhase[p].blunder + byPhase[p].mistake }));
  const worstPhase = [...phaseSerious].sort((a, b) => b.n - a.n)[0];

  const strengths: string[] = [];
  const improvements: string[] = [];

  // --- Strengths ---
  if (byTag.blunder / games < 0.5) {
    strengths.push(`You rarely hang material — just ${byTag.blunder} blunder${byTag.blunder === 1 ? '' : 's'} across ${reviews.length} games.`);
  }
  if (serious > 0 && phaseSerious.find((x) => x.p === 'opening')!.n / serious < 0.2) {
    strengths.push('Your openings are solid — very few mistakes come in the first dozen moves.');
  }
  if (serious > 0 && phaseSerious.find((x) => x.p === 'endgame')!.n / serious < 0.2) {
    strengths.push('You hold up well in endgames — few mistakes once material thins out.');
  }
  if (bestOpenings[0] && bestOpenings[0].scorePct >= 60) {
    strengths.push(`Strong results in the ${bestOpenings[0].name} (${bestOpenings[0].scorePct}% score over ${bestOpenings[0].games} games).`);
  }
  if (strengths.length === 0) {
    strengths.push('Consistent play — no single area stands out as a glaring leak, so small refinements will move the needle.');
  }

  // --- Improvements (the focus) ---
  if (serious > 0) {
    improvements.push(
      `Most of your serious mistakes (${pct(worstPhase.n, serious)}%) happen in the ${PHASE_LABEL[worstPhase.p]} — that's where to spend your reps.`,
    );
  }
  if (byTag.blunder / games >= 0.5) {
    improvements.push(`You average ${seriousPerGame} serious mistakes a game, including ${byTag.blunder} outright blunders — slow down on critical moves and check for hanging pieces.`);
  }
  for (const o of worstOpenings) {
    if (o.scorePct < 45) {
      improvements.push(`You're scoring just ${o.scorePct}% in the ${o.name} (${o.games} games) — this opening is costing you points.`);
    }
  }
  if (byTag.inaccuracy > serious * 2 && byTag.inaccuracy > 5) {
    improvements.push('Lots of small inaccuracies add up — tightening these will steadily raise your accuracy.');
  }
  if (improvements.length === 0) {
    improvements.push('No major recurring leak detected in this sample — analyze more games (try 50–100) to surface subtler patterns.');
  }

  return {
    username,
    gamesAnalyzed: reviews.length,
    userMoves,
    record,
    byTag,
    byPhase,
    seriousPerGame,
    worstOpenings,
    bestOpenings,
    strengths,
    improvements,
  };
}
