import type { PlayableLine } from '../data/types';
import { soundForSan, type SoundName } from './sound-map';

export type Mode = 'learn' | 'drill';
export type Phase = 'intro' | 'opponent' | 'await' | 'complete';

export interface TrainerState {
  line: PlayableLine;
  mode: Mode;
  /** Index of the next ply to be played. Board shows plies[0..plyIndex). */
  plyIndex: number;
  phase: Phase;
  /** Misses on the current user ply. */
  misses: number;
  totalMisses: number;
  hintsUsed: number;
  /** 0 = none, 1 = arrows, 2 = arrows + text. Learn mode ignores this (always 2). */
  hintLevel: 0 | 1 | 2;
  /**
   * Review cursor (Learn mode). `null` = live, sitting at the play frontier.
   * A number = viewing the position after that many plies WITHOUT disturbing
   * live play, so you can scrub back and forward freely. Stepping forward up to
   * the frontier returns to `null` (live).
   */
  viewIndex: number | null;
  /** Set when the user played a documented alternative move. */
  alsoNote?: string;
  /** Set when the user played a wrong move (cleared on next event). */
  wrongSan?: string;
}

export type TrainerEvent =
  | { type: 'BEGIN' }
  | { type: 'OPPONENT_DONE' }
  | { type: 'USER_MOVE'; san: string }
  | { type: 'HINT' }
  | { type: 'SEEK'; index: number }
  | { type: 'RESTART' };

export type TrainerEffect =
  | { type: 'schedule-opponent' }
  | { type: 'flash-wrong' }
  | { type: 'record-result'; clean: boolean }
  | { type: 'play-sound'; sound: SoundName };

export interface ReduceResult {
  state: TrainerState;
  effects: TrainerEffect[];
}

export function initTrainer(line: PlayableLine, mode: Mode): TrainerState {
  return {
    line,
    mode,
    plyIndex: 0,
    phase: 'intro',
    misses: 0,
    totalMisses: 0,
    hintsUsed: 0,
    hintLevel: 0,
    viewIndex: null,
  };
}

function enterPly(state: TrainerState, plyIndex: number): ReduceResult {
  const base = { ...state, plyIndex, misses: 0, hintLevel: 0 as const, viewIndex: null, alsoNote: undefined, wrongSan: undefined };
  if (plyIndex >= state.line.plies.length) {
    const clean = state.totalMisses === 0 && state.hintsUsed === 0;
    const effects: TrainerEffect[] = [{ type: 'play-sound', sound: 'complete' }];
    if (state.mode === 'drill') effects.push({ type: 'record-result', clean });
    return { state: { ...base, phase: 'complete' }, effects };
  }
  const ply = state.line.plies[plyIndex];
  if (ply.isUserMove) {
    return { state: { ...base, phase: 'await' }, effects: [] };
  }
  return { state: { ...base, phase: 'opponent' }, effects: [{ type: 'schedule-opponent' }] };
}

export function reduce(state: TrainerState, event: TrainerEvent): ReduceResult {
  switch (event.type) {
    case 'BEGIN': {
      if (state.phase !== 'intro') return { state, effects: [] };
      const r = enterPly(state, 0);
      return { state: r.state, effects: [{ type: 'play-sound', sound: 'start' }, ...r.effects] };
    }

    case 'OPPONENT_DONE': {
      if (state.phase !== 'opponent') return { state, effects: [] };
      const landed = state.line.plies[state.plyIndex];
      const r = enterPly(state, state.plyIndex + 1);
      return { state: r.state, effects: [{ type: 'play-sound', sound: soundForSan(landed.san) }, ...r.effects] };
    }

    case 'USER_MOVE': {
      if (state.phase !== 'await') return { state, effects: [] };
      const ply = state.line.plies[state.plyIndex];
      if (event.san === ply.san) {
        const r = enterPly(state, state.plyIndex + 1);
        return { state: r.state, effects: [{ type: 'play-sound', sound: soundForSan(ply.san) }, ...r.effects] };
      }
      if (ply.also?.includes(event.san)) {
        return {
          state: { ...state, alsoNote: event.san, wrongSan: undefined, hintLevel: 2 },
          effects: [],
        };
      }
      const misses = state.misses + 1;
      const hintLevel = state.mode === 'drill' ? (misses >= 3 ? 2 : misses >= 2 ? 1 : 0) : state.hintLevel;
      return {
        state: { ...state, misses, totalMisses: state.totalMisses + 1, hintLevel, wrongSan: event.san, alsoNote: undefined },
        effects: [{ type: 'flash-wrong' }, { type: 'play-sound', sound: 'error' }],
      };
    }

    case 'HINT': {
      if (state.phase !== 'await' || state.mode !== 'drill') return { state, effects: [] };
      const hintLevel = Math.min(2, state.hintLevel + 1) as 0 | 1 | 2;
      return { state: { ...state, hintLevel, hintsUsed: state.hintsUsed + 1 }, effects: [] };
    }

    case 'SEEK': {
      // Move the review cursor only — never disturb live play, so the user can
      // scrub back and forward without replaying. Stepping up to the frontier
      // returns to live (viewIndex = null).
      if (state.mode !== 'learn') return { state, effects: [] };
      const frontier = state.phase === 'complete' ? state.line.plies.length : state.plyIndex;
      const index = Math.max(0, Math.min(event.index, frontier));
      const viewIndex = index >= frontier ? null : index;
      return { state: { ...state, viewIndex }, effects: [] };
    }

    case 'RESTART':
      return { state: initTrainer(state.line, state.mode), effects: [] };
  }
}

/** What hint content should currently be visible for the awaited user ply. */
export function visibleHints(state: TrainerState): { arrows: boolean; text: boolean } {
  if (state.viewIndex !== null) return { arrows: false, text: false };
  if (state.phase !== 'await') return { arrows: false, text: false };
  if (state.mode === 'learn') return { arrows: true, text: true };
  return { arrows: state.hintLevel >= 1, text: state.hintLevel >= 2 };
}
