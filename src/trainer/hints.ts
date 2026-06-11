import type { Arrow, Highlight, ResolvedPly } from '../data/types';

export type Reveal = 'none' | 'piece' | 'full';

export interface MoveShapes {
  arrows: Arrow[];
  highlights: Highlight[];
}

/**
 * Build the on-board indicators for the move the user must play.
 *  - the move itself is always a green arrow (from -> to) with the moving
 *    piece's square highlighted, so "this piece goes here" is unmistakable;
 *  - an authored orange "plan" arrow that starts from the move's destination
 *    (where the piece is heading next) becomes a blue key square + blue arrow;
 *  - authored threat/defense arrows (red/green/etc.) are kept as-is.
 *
 * `reveal` controls how much of the answer is shown:
 *  - 'full'  : the move arrow + ideas (Learn, or Drill after enough misses)
 *  - 'piece' : just highlight which piece moves (Drill, first hint)
 *  - 'none'  : nothing (Drill, before any hint)
 */
export function buildUserMoveShapes(ply: ResolvedPly, reveal: Reveal, showIdeas: boolean): MoveShapes {
  const arrows: Arrow[] = [];
  const highlights: Highlight[] = [];

  if (reveal === 'full') {
    arrows.push({ from: ply.from, to: ply.to, color: 'green' });
    highlights.push({ square: ply.from, color: 'yellow' });
  } else if (reveal === 'piece') {
    highlights.push({ square: ply.from, color: 'blue' });
  }

  if (showIdeas) {
    for (const a of ply.arrows ?? []) {
      if (a.from === ply.from && a.to === ply.to) continue; // duplicate of the move arrow
      if (a.color === 'orange' && a.from === ply.to) {
        arrows.push({ from: a.from, to: a.to, color: 'blue' });
        highlights.push({ square: a.to, color: 'blue' });
      } else {
        arrows.push(a);
      }
    }
    for (const h of ply.highlights ?? []) highlights.push(h);
  }

  return { arrows, highlights };
}
