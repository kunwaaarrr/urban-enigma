import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { START_FEN } from '../chess/start';
import { analyzeLastMove } from '../chess/analysis';
import { Board, type BoardMove } from '../components/Board';
import { MoveStrip } from '../components/MoveStrip';
import { CoachBanner, Tool, TopBar } from '../components/ui';
import { initTrainer, reduce, visibleHints, type Mode, type TrainerEvent, type TrainerState } from '../trainer/machine';
import { recordResult } from '../trainer/progress';
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
  const timer = useRef<number | null>(null);
  const lastAttempt = useRef<BoardMove | null>(null);

  // Reset when the line changes (queue mode).
  useEffect(() => {
    setState(initTrainer(line, mode));
    setWrongFlash(null);
    lastAttempt.current = null;
  }, [line, mode]);

  function dispatch(event: TrainerEvent) {
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
  const played = state.phase === 'complete' ? plies.length : state.plyIndex;
  const fen = played === 0 ? START_FEN : plies[played - 1].fenAfter;
  const lastPly = played > 0 ? plies[played - 1] : null;
  const currentPly = state.plyIndex < plies.length ? plies[state.plyIndex] : null;
  const hints = visibleHints(state);

  // Shapes on the board
  let arrows: Arrow[] = [];
  let highlights: Highlight[] = [];
  let badge: { square: string; type: Badge } | null = null;

  if (state.phase === 'await' && currentPly && hints.arrows) {
    arrows = currentPly.arrows ?? [];
    highlights = currentPly.highlights ?? [];
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
  if (state.phase === 'opponent' && lastPly?.isUserMove && lastPly.badge) {
    badge = { square: lastPly.to, type: lastPly.badge };
  }

  const computed = useMemo(() => {
    if (!showComputed || !lastPly) return { arrows: [], highlights: [] };
    return analyzeLastMove(lastPly.fenAfter, lastPly.to);
  }, [showComputed, lastPly]);

  function handleBoardMove(move: BoardMove) {
    lastAttempt.current = move;
    dispatch({ type: 'USER_MOVE', san: move.san });
  }

  const banner = bannerContent(state);

  const interactive = state.phase === 'await';
  const canSeekBack = mode === 'learn' && state.phase !== 'intro' && state.plyIndex > 0;

  function primaryAction() {
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
        fen={fen}
        orientation={state.line.side}
        lastMove={lastPly ? { from: lastPly.from, to: lastPly.to } : null}
        arrows={arrows}
        highlights={highlights}
        computedArrows={computed.arrows}
        computedHighlights={computed.highlights}
        badge={badge}
        wrongFlash={wrongFlash}
        interactive={interactive}
        onMove={handleBoardMove}
      />
      <MoveStrip
        plies={plies}
        played={played}
        showChevrons={mode === 'learn'}
        canBack={canSeekBack}
        canForward={false}
        onBack={() => dispatch({ type: 'SEEK', index: Math.max(0, state.plyIndex - 2) })}
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
