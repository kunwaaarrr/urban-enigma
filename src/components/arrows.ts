import { squareCenter } from '../chess/coords';
import type { ArrowColor } from '../data/types';

export const ARROW_COLORS: Record<ArrowColor, string> = {
  orange: '#ffaa00',
  red: '#fa412d',
  green: '#81b64c',
  blue: '#52a5ff',
  yellow: '#ffe066',
};

// Geometry in board units (one square = 1).
const SHAFT = 0.22; // shaft width
const HEAD_LEN = 0.42; // arrowhead length
const HEAD_W = 0.56; // arrowhead width
const MARGIN = 0.36; // gap from the start-square center, chess.com style

type Pt = { x: number; y: number };

const fmt = (n: number) => Math.round(n * 1000) / 1000;
const pts = (list: Pt[]) => list.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');

function straightPolygon(a: Pt, b: Pt): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const u = { x: dx / len, y: dy / len };
  const n = { x: -u.y, y: u.x };
  const s = { x: a.x + u.x * MARGIN, y: a.y + u.y * MARGIN };
  const e = { x: b.x - u.x * HEAD_LEN, y: b.y - u.y * HEAD_LEN };
  return pts([
    { x: s.x + n.x * SHAFT / 2, y: s.y + n.y * SHAFT / 2 },
    { x: e.x + n.x * SHAFT / 2, y: e.y + n.y * SHAFT / 2 },
    { x: e.x + n.x * HEAD_W / 2, y: e.y + n.y * HEAD_W / 2 },
    { x: b.x, y: b.y },
    { x: e.x - n.x * HEAD_W / 2, y: e.y - n.y * HEAD_W / 2 },
    { x: e.x - n.x * SHAFT / 2, y: e.y - n.y * SHAFT / 2 },
    { x: s.x - n.x * SHAFT / 2, y: s.y - n.y * SHAFT / 2 },
  ]);
}

/**
 * Bent knight arrow: long leg first, then the short leg with the head.
 * Both legs are axis-aligned, so the outline is built with simple offsets
 * and a mitered corner.
 */
function knightPolygon(a: Pt, b: Pt): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // Corner: travel the long axis first.
  const corner: Pt = Math.abs(dy) > Math.abs(dx) ? { x: a.x, y: b.y } : { x: b.x, y: a.y };
  const u1 = { x: Math.sign(corner.x - a.x), y: Math.sign(corner.y - a.y) }; // leg 1 dir
  const u2 = { x: Math.sign(b.x - corner.x), y: Math.sign(b.y - corner.y) }; // leg 2 dir
  const n1 = { x: -u1.y, y: u1.x };
  const n2 = { x: -u2.y, y: u2.x };
  // cross > 0 means the path turns "left" in svg coords; pick outer/inner sides.
  const cross = u1.x * u2.y - u1.y * u2.x;
  const s = { x: a.x + u1.x * MARGIN, y: a.y + u1.y * MARGIN };
  const e = { x: b.x - u2.x * HEAD_LEN, y: b.y - u2.y * HEAD_LEN };
  const h = SHAFT / 2;
  const side = (p: Pt, n: Pt, sign: number): Pt => ({ x: p.x + n.x * h * sign, y: p.y + n.y * h * sign });
  // Outer corner of the miter on each side of the L.
  const cornerSide = (sign: number): Pt => ({
    x: corner.x + (n1.x * sign + n2.x * sign) * h,
    y: corner.y + (n1.y * sign + n2.y * sign) * h,
  });
  void cross;
  return pts([
    side(s, n1, 1),
    cornerSide(1),
    side(e, n2, 1),
    { x: e.x + n2.x * HEAD_W / 2, y: e.y + n2.y * HEAD_W / 2 },
    { x: b.x, y: b.y },
    { x: e.x - n2.x * HEAD_W / 2, y: e.y - n2.y * HEAD_W / 2 },
    side(e, n2, -1),
    cornerSide(-1),
    side(s, n1, -1),
  ]);
}

export function isKnightMove(from: string, to: string): boolean {
  const dx = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
  const dy = Math.abs(parseInt(from[1], 10) - parseInt(to[1], 10));
  return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
}

/** Returns SVG polygon points for an arrow between two squares (viewBox 0 0 8 8). */
export function arrowPolygon(from: string, to: string, orientation: 'w' | 'b'): string {
  const a = squareCenter(from, orientation);
  const b = squareCenter(to, orientation);
  return isKnightMove(from, to) ? knightPolygon(a, b) : straightPolygon(a, b);
}
