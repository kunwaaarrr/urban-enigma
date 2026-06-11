import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { ResolvedPly } from '../data/types';

interface Props {
  plies: ResolvedPly[];
  /** Number of plies already on the board. */
  played: number;
  showChevrons: boolean;
  onBack?: () => void;
  onForward?: () => void;
  canBack?: boolean;
  canForward?: boolean;
}

export function MoveStrip({ plies, played, showChevrons, onBack, onForward, canBack, canForward }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [played]);

  const items: ComponentChildren[] = [];
  for (let i = 0; i < played; i++) {
    const ply = plies[i];
    if (ply.color === 'w') {
      items.push(
        <span key={`n${i}`} class="num">
          {ply.moveNumber}.
        </span>,
      );
    }
    items.push(
      <span key={i} class={`mv ${i === played - 1 ? 'current' : ''}`}>
        {ply.san}
      </span>,
    );
  }

  return (
    <div class="movestrip">
      {showChevrons && (
        <button class="chev" onClick={onBack} disabled={!canBack} aria-label="Previous move">
          ‹
        </button>
      )}
      <div class="moves" ref={scroller}>
        {items.length ? items : <span class="num">Moves will appear here</span>}
      </div>
      {showChevrons && (
        <button class="chev" onClick={onForward} disabled={!canForward} aria-label="Next move">
          ›
        </button>
      )}
    </div>
  );
}
