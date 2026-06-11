import { Chess } from 'chess.js';
import type { Arrow, Highlight } from '../data/types';

export interface ComputedOverlay {
  arrows: Arrow[];
  highlights: Highlight[];
}

/**
 * Computed "what's going on" overlay for the piece that just moved:
 *  - red arrows: enemy pieces it now attacks
 *  - green arrows: friendly pieces it now defends
 *  - red highlights: pieces (either side) that are hanging
 */
export function analyzeLastMove(fenAfter: string, lastTo: string): ComputedOverlay {
  const chess = new Chess(fenAfter);
  const arrows: Arrow[] = [];
  const highlights: Highlight[] = [];
  const moved = chess.get(lastTo as never);
  if (!moved) return { arrows, highlights };

  const board = chess.board().flat().filter((p) => p !== null);
  for (const piece of board) {
    if (piece.square === lastTo) continue;
    const attackers = chess.attackers(piece.square, moved.color);
    if (!attackers.includes(lastTo as never)) continue;
    if (piece.color !== moved.color) {
      arrows.push({ from: lastTo, to: piece.square, color: 'red' });
    } else {
      arrows.push({ from: lastTo, to: piece.square, color: 'green' });
    }
  }

  for (const piece of board) {
    if (piece.type === 'k') continue;
    const enemy = piece.color === 'w' ? 'b' : 'w';
    const attacked = chess.attackers(piece.square, enemy).length > 0;
    const defended = chess.attackers(piece.square, piece.color).length > 0;
    if (attacked && !defended) {
      highlights.push({ square: piece.square, color: 'red' });
    }
  }
  return { arrows, highlights };
}
