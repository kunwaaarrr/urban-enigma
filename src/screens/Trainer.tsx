import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { START_FEN } from '../chess/start';
import { analyzeLastMove } from '../chess/analysis';
import { Board, type BoardMove } from '../components/Board';
import { MoveStrip } from '../components/MoveStrip';
import { MiddlegameControls } from '../components/MiddlegameControls';
import { CoachBanner, Tool, TopBar } from '../components/ui';
import { resolveSample } from '../data/flatten';
import { initTrainer, reduce, visibleHints, type Mode, type TrainerEvent, type TrainerState } from '../trainer/machine';
import { recordResult } from '../trainer/progress';
import { buildUserMoveShapes, type Reveal } from '../trainer/hints';
import { isMuted, playSound, setMuted, unlockAudio } from '../trainer/sound';
import type { Arrow, Badge, Highlight, PlayableLine } from '../data/types';

const OPPONENT_DELAY_MS = 550;

interface Props {
  line: PlayableLine;
  mode: Mode;
  onBack: () => void;
  /** Provided when training a queue ("drill all"): advances to another line. */
  onNextLine?: () => void;
  onProgressChange?: () => void;
}

export function Trainer({ line, mode, onBack, onNextLine, onProgressChange }: Props) {
  const [state, setState] = useState<TrainerState>(() => initTrainer(line, mode));
  const [wrongFlash, setWrongFlash] = useState<{ square: string; key: number } | null>(null);
  const [showComputed, setShowComputed] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  // Middlegame explorer (complete screen): which plan is open + step into its sample.
  const [mg, setMg] = useState<{ plan: number; step: number } | null>(null);
  const timer = useRef<number | null>(null);
  const lastAttempt = useRef<BoardMove | null>(null);

  // Reset when the line changes (queue mode).
  useEffect(() => {
    setState(initTrainer(line, mode));
    setWrongFlash(null);
    setMg(null);
    lastAttempt.current = null;
  }, [line, mode]);

  // The explorer only lives on the complete screen.
  useEffect(() => {
    if (state.phase !== 'complete') setMg(null);
  }, [state.phase]);

  function dispatch(event: TrainerEvent) {
    unlockAudio(); // first call rides a user gesture (Start / board tap)
    setState((prev) => {
      const { state: next, effects } = reduce(prev, event);
      for (const effect of effects) {
        if (effect.type === 'schedule-opponent') {
          if (timer.current) clearTimeout(timer.current);
          timer.current = window.setTimeout(() => dispatch({ type: 'OPPONENT_DONE' }), OPPONENT_DELAY_MS);
        } else if (effect.type === 'flash-wrong') {
          const sq = lastAttempt.current?.to;
          if (sq) setWrongFlash({ square: sq, key: Date.now() });
        } else if (effect.type === 'record-result') {
          recordResult(prev.line.id, effect.clean);
          onProgressChange?.();
        } else if (effect.type === 'play-sound') {
          const LAND_SOUNDS = new Set(['move', 'capture', 'check', 'castle', 'promote']);
          if (LAND_SOUNDS.has(effect.sound)) {
            setTimeout(() => playSound(effect.sound), 300);
          } else {
            playSound(effect.sound);
          }
        }
      }
      return next;
    });
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Auto-begin: skip the intro phase wait for the very first opponent move in
  // learn mode happens via the Start button; nothing automatic here.

  const { plies } = state.line;
  // The live play frontier vs. what's shown: while reviewing (viewIndex set) the
  // board shows a past position without disturbing live play.
  const frontierPlayed = state.phase === 'complete' ? plies.length : state.plyIndex;
  const reviewing = state.viewIndex !== null;
  const played = state.viewIndex ?? frontierPlayed;
  const fen = played === 0 ? START_FEN : plies[played - 1].fenAfter;
  const lastPly = played > 0 ? plies[played - 1] : null;
  const currentPly = state.plyIndex < plies.length ? plies[state.plyIndex] : null;

  // Shapes on the board
  let arrows: Arrow[] = [];
  let highlights: Highlight[] = [];
  let badge: { square: string; type: Badge } | null = null;

  if (reviewing) {
    // Reviewing a past move: surface that move's own annotations (no hints).
    if (lastPly) {
      arrows = lastPly.arrows ?? [];
      highlights = lastPly.highlights ?? [];
      if (lastPly.badge) badge = { square: lastPly.to, type: lastPly.badge };
    }
  } else if (state.phase === 'await' && currentPly) {
    const reveal: Reveal =
      state.mode === 'learn' ? 'full' : state.hintLevel >= 2 ? 'full' : state.hintLevel >= 1 ? 'piece' : 'none';
    const showIdeas = state.mode === 'learn' || state.hintLevel >= 2;
    const shapes = buildUserMoveShapes(currentPly, reveal, showIdeas);
    arrows = shapes.arrows;
    highlights = shapes.highlights;
    if (reveal === 'full' && currentPly.badge) {
      badge = { square: currentPly.to, type: currentPly.badge };
    }
  } else if ((state.phase === 'opponent' || state.phase === 'complete') && lastPly) {
    // After an opponent move (or at the end), surface that move's annotations.
    if (lastPly.explain || state.phase === 'complete') {
      arrows = lastPly.arrows ?? [];
      highlights = lastPly.highlights ?? [];
    }
    if (state.phase === 'complete' && lastPly.badge) {
      badge = { square: lastPly.to, type: lastPly.badge };
    }
  }
  // Badge on the user's just-played move while the opponent "thinks".
  if (!reviewing && state.phase === 'opponent' && lastPly?.isUserMove && lastPly.badge) {
    badge = { square: lastPly.to, type: lastPly.badge };
  }

  const computed = useMemo(() => {
    if (!showComputed || !lastPly) return { arrows: [], highlights: [] };
    return analyzeLastMove(lastPly.fenAfter, lastPly.to);
  }, [showComputed, lastPly]);

  // --- Middlegame explorer (only on the complete screen, for authored lines) ---
  const guide = state.phase === 'complete' ? (state.line.middlegame ?? null) : null;
  const finalFen = plies.length ? plies[plies.length - 1].fenAfter : START_FEN;
  const activePlan = mg && guide ? (guide.plans[mg.plan] ?? null) : null;
  const mgSample = useMemo(() => {
    if (!activePlan?.sample) return [];
    try {
      return resolveSample(finalFen, activePlan.sample);
    } catch {
      return [];
    }
  }, [activePlan, finalFen]);
  const mgStep = mg ? Math.min(mg.step, mgSample.length) : 0;

  // Board props, with the explorer taking priority when a plan is open.
  let boardFen = fen;
  let boardArrows = arrows;
  let boardHighlights = highlights;
  let boardBadge = badge;
  let boardLastMove = lastPly ? { from: lastPly.from, to: lastPly.to } : null;
  let boardComputed = computed;
  if (guide && activePlan) {
    boardFen = mgStep === 0 ? finalFen : mgSample[mgStep - 1].fenAfter;
    boardArrows = mgStep === 0 ? (activePlan.arrows ?? []) : [];
    boardHighlights = mgStep === 0 ? (activePlan.highlights ?? []) : [];
    boardBadge = null;
    boardLastMove = mgStep > 0 ? { from: mgSample[mgStep - 1].from, to: mgSample[mgStep - 1].to } : boardLastMove;
    boardComputed = { arrows: [], highlights: [] };
  }

  function handleBoardMove(move: BoardMove) {
    lastAttempt.current = move;
    dispatch({ type: 'USER_MOVE', san: move.san });
  }

  let banner = bannerContent(state);
  if (guide) {
    if (activePlan) {
      const stepSan = mgStep > 0 ? mgSample[mgStep - 1].san : null;
      banner = {
        title: activePlan.name,
        body: stepSan ? `${stepSan} — ${activePlan.idea}` : activePlan.idea,
        badge: 'idea',
        chip: `Plan ${(mg!.plan + 1)}/${guide.plans.length}`,
      };
    } else {
      banner = {
        title: banner.title,
        body: guide.intro ?? banner.body,
        badge: banner.badge,
        sub: 'Tap a plan below to see the ideas and play out a sample.',
      };
    }
  }

  const interactive = state.phase === 'await' && !reviewing;
  const canStepBack = mode === 'learn' && state.phase !== 'intro' && played > 0;
  const canStepForward = mode === 'learn' && reviewing;

  function primaryAction() {
    if (reviewing) return { label: '▶ Resume', onClick: () => dispatch({ type: 'SEEK', index: frontierPlayed }) };
    if (state.phase === 'intro') return { label: 'Start', onClick: () => dispatch({ type: 'BEGIN' }) };
    if (state.phase === 'complete') {
      if (onNextLine) return { label: 'Next Line', onClick: onNextLine };
      return { label: 'Done', onClick: onBack };
    }
    if (mode === 'learn' && state.phase === 'await' && currentPly) {
      return { label: 'Next', onClick: () => dispatch({ type: 'USER_MOVE', san: currentPly.san }) };
    }
    return null;
  }
  const primary = primaryAction();

  return (
    <div class="trainer">
      <TopBar
        title={state.line.name}
        subtitle={`${state.line.eco} · ${state.line.branchName ?? 'Main line'} · ${mode === 'learn' ? 'Learn' : 'Drill'}`}
        onBack={onBack}
      />
      <CoachBanner title={banner.title} body={banner.body} sub={banner.sub} badge={banner.badge} chip={banner.chip} />
      <Board
        fen={boardFen}
        orientation={state.line.side}
        lastMove={boardLastMove}
        arrows={boardArrows}
        highlights={boardHighlights}
        computedArrows={boardComputed.arrows}
        computedHighlights={boardComputed.highlights}
        badge={boardBadge}
        wrongFlash={wrongFlash}
        interactive={interactive}
        onMove={handleBoardMove}
      />
      {guide && (
        <MiddlegameControls
          guide={guide}
          activePlan={mg ? mg.plan : null}
          onSelectPlan={(i) => setMg(i === null ? null : { plan: i, step: 0 })}
          sampleLength={mgSample.length}
          step={mgStep}
          onStepBack={() => setMg((m) => (m ? { ...m, step: Math.max(0, m.step - 1) } : m))}
          onStepForward={() => setMg((m) => (m ? { ...m, step: m.step + 1 } : m))}
        />
      )}
      <MoveStrip
        plies={plies}
        played={played}
        showChevrons={mode === 'learn' && !(state.phase === 'complete' && !!guide)}
        canBack={canStepBack}
        canForward={canStepForward}
        onBack={() => dispatch({ type: 'SEEK', index: played - 1 })}
        onForward={() => dispatch({ type: 'SEEK', index: played + 1 })}
      />
      <div class="actionbar">
        <Tool icon="↺" label="Restart" onClick={() => dispatch({ type: 'RESTART' })} disabled={state.phase === 'intro'} />
        {mode === 'drill' && (
          <Tool
            icon="💡"
            label="Hint"
            onClick={() => dispatch({ type: 'HINT' })}
            disabled={state.phase !== 'await' || state.hintLevel >= 2}
          />
        )}
        <Tool icon="👁" label="Activity" on={showComputed} onClick={() => setShowComputed((v) => !v)} disabled={!lastPly} />
        <Tool
          icon={muted ? '🔇' : '🔊'}
          label={muted ? 'Muted' : 'Sound'}
          on={!muted}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
          }}
        />
        {primary ? (
          <button class="btn-primary" onClick={primary.onClick}>
            {primary.label}
          </button>
        ) : (
          <button class="btn-primary" disabled>
            {state.phase === 'opponent' ? '…' : 'Your move'}
          </button>
        )}
      </div>
    </div>
  );
}

function bannerContent(state: TrainerState): { title: string; body?: string; sub?: string; badge?: Badge | null; chip?: string } {
  const { plies } = state.line;
  const currentPly = state.plyIndex < plies.length ? plies[state.plyIndex] : null;
  const lastPly = state.plyIndex > 0 ? plies[state.plyIndex - 1] : null;
  const hints = visibleHints(state);

  if (state.viewIndex !== null) {
    const viewed = state.viewIndex > 0 ? plies[state.viewIndex - 1] : null;
    if (!viewed) {
      return { title: 'Start position', body: 'Use ‹ › to step through the line; ▶ Resume returns to play.', chip: state.line.eco };
    }
    return {
      title: viewed.san,
      body: viewed.explain ?? 'Reviewing. Use ‹ › to step; ▶ Resume returns to play.',
      badge: viewed.badge ?? 'book',
      chip: moveLabel(viewed.moveNumber, viewed.color),
    };
  }

  if (state.phase === 'intro') {
    return {
      title: state.line.branchName ? `${state.line.name} — ${state.line.branchName}` : state.line.name,
      body: state.line.preamble ?? 'Play through the line. Arrows show you what matters.',
      chip: state.line.eco,
      badge: 'book',
    };
  }

  if (state.phase === 'complete') {
    const clean = state.totalMisses === 0 && state.hintsUsed === 0;
    return {
      title: clean ? 'Line complete — flawless! 🎉' : 'Line complete 🎉',
      body:
        state.mode === 'drill'
          ? clean
            ? 'Mastered. This line is checked off.'
            : `${state.totalMisses} miss${state.totalMisses === 1 ? '' : 'es'}${state.hintsUsed ? `, ${state.hintsUsed} hint${state.hintsUsed === 1 ? '' : 's'}` : ''} — drill it again for a clean run to master it.`
          : 'Now try it in Drill mode to make it stick.',
      badge: clean ? 'brilliant' : 'great',
    };
  }

  if (state.phase === 'opponent') {
    return { title: 'Opponent is moving…', body: lastPly?.isUserMove && lastPly.explain ? lastPly.explain : undefined };
  }

  // await
  if (!currentPly) return { title: 'Your move' };

  if (state.alsoNote) {
    return {
      title: `${state.alsoNote} also works!`,
      body: `Good chess — but our repertoire continues with ${currentPly.san}. Follow the arrows.`,
      badge: 'great',
    };
  }

  if (state.wrongSan && state.mode === 'drill') {
    return {
      title: `${state.wrongSan} isn’t the move`,
      body:
        state.hintLevel >= 2 && currentPly.explain
          ? currentPly.explain
          : state.hintLevel >= 1
            ? 'Follow the hint arrow.'
            : 'Try again — think about what the position needs.',
      badge: 'mistake',
      sub: opponentContext(lastPly),
    };
  }

  if (state.mode === 'learn') {
    return {
      title: `Play ${currentPly.san}`,
      body: currentPly.explain ?? 'Make the move shown by the arrows.',
      badge: currentPly.badge ?? 'book',
      chip: moveLabel(currentPly.moveNumber, currentPly.color),
      sub: opponentContext(lastPly),
    };
  }

  // drill await
  return {
    title: 'Your move',
    body: hints.text && currentPly.explain ? currentPly.explain : 'Find the repertoire move.',
    sub: opponentContext(lastPly),
    badge: hints.text ? (currentPly.badge ?? 'book') : null,
    chip: moveLabel(currentPly.moveNumber, currentPly.color),
  };
}

function opponentContext(lastPly: { isUserMove: boolean; explain?: string; san: string } | null): string | undefined {
  if (lastPly && !lastPly.isUserMove && lastPly.explain) {
    return `${lastPly.san}: ${lastPly.explain}`;
  }
  return undefined;
}

function moveLabel(moveNumber: number, color: 'w' | 'b'): string {
  return color === 'w' ? `Move ${moveNumber}` : `Move ${moveNumber}…`;
}
