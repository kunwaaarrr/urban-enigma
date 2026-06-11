/** Board geometry helpers. Board units: 8x8, origin top-left of the rendered board. */

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Center of a square in board units (0..8), orientation-aware. */
export function squareCenter(square: string, orientation: 'w' | 'b'): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97; // a=0
  const rank = parseInt(square[1], 10) - 1; // 1=0
  const col = orientation === 'w' ? file : 7 - file;
  const row = orientation === 'w' ? 7 - rank : rank;
  return { x: col + 0.5, y: row + 0.5 };
}

/** Top-left percentage offsets for a square, for absolutely-positioned pieces. */
export function squarePercent(square: string, orientation: 'w' | 'b'): { left: number; top: number } {
  const { x, y } = squareCenter(square, orientation);
  return { left: (x - 0.5) * 12.5, top: (y - 0.5) * 12.5 };
}

/** Square name from a board-relative position in [0,1) x [0,1). */
export function squareFromFraction(fx: number, fy: number, orientation: 'w' | 'b'): string | null {
  const col = Math.floor(fx * 8);
  const row = Math.floor(fy * 8);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const file = orientation === 'w' ? col : 7 - col;
  const rank = orientation === 'w' ? 7 - row : row;
  return FILES[file] + (rank + 1);
}

export function isLightSquare(square: string): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10) - 1;
  return (file + rank) % 2 === 1;
}
