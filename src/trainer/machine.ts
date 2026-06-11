import type { PlayableLine } from '../data/types';

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
  | { type: 'record-result'; clean: boolean };

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
  };
}

function enterPly(state: TrainerState, plyIndex: number): ReduceResult {
  const base = { ...state, plyIndex, misses: 0, hintLevel: 0 as const, alsoNote: undefined, wrongSan: undefined };
  if (plyIndex >= state.line.plies.length) {
    const clean = state.totalMisses === 0 && state.hintsUsed === 0;
    return {
      state: { ...base, phase: 'complete' },
      effects: state.mode === 'drill' ? [{ type: 'record-result', clean }] : [],
    };
  }
  const ply = state.line.plies[plyIndex];
  if (ply.isUserMove) {
    return { state: { ...base, phase: 'await' }, effects: [] };
  }
  return { state: { ...base, phase: 'opponent' }, effects: [{ type: 'schedule-opponent' }] };
}

export function reduce(state: TrainerState, event: TrainerEvent): ReduceResult {
  switch (event.type) {
    case 'BEGIN':
      if (state.phase !== 'intro') return { state, effects: [] };
      return enterPly(state, 0);

    case 'OPPONENT_DONE':
      if (state.phase !== 'opponent') return { state, effects: [] };
      return enterPly(state, state.plyIndex + 1);

    case 'USER_MOVE': {
      if (state.phase !== 'await') return { state, effects: [] };
      const ply = state.line.plies[state.plyIndex];
      if (event.san === ply.san) {
        return enterPly(state, state.plyIndex + 1);
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
        effects: [{ type: 'flash-wrong' }],
      };
    }

    case 'HINT': {
      if (state.phase !== 'await' || state.mode !== 'drill') return { state, effects: [] };
      const hintLevel = Math.min(2, state.hintLevel + 1) as 0 | 1 | 2;
      return { state: { ...state, hintLevel, hintsUsed: state.hintsUsed + 1 }, effects: [] };
    }

    case 'SEEK': {
      if (state.mode !== 'learn') return { state, effects: [] };
      const index = Math.max(0, Math.min(event.index, state.line.plies.length));
      return enterPly({ ...state, totalMisses: 0, hintsUsed: 0 }, index);
    }

    case 'RESTART':
      return { state: initTrainer(state.line, state.mode), effects: [] };
  }
}

/** What hint content should currently be visible for the awaited user ply. */
export function visibleHints(state: TrainerState): { arrows: boolean; text: boolean } {
  if (state.phase !== 'await') return { arrows: false, text: false };
  if (state.mode === 'learn') return { arrows: true, text: true };
  return { arrows: state.hintLevel >= 1, text: state.hintLevel >= 2 };
}
