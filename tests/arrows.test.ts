import { describe, expect, it } from 'vitest';
import { arrowPolygon, isKnightMove } from '../src/components/arrows';
import { squareCenter, squareFromFraction } from '../src/chess/coords';

function parsePoints(points: string): Array<[number, number]> {
  return points.split(' ').map((p) => p.split(',').map(Number) as [number, number]);
}

describe('coords', () => {
  it('maps squares for white orientation', () => {
    expect(squareCenter('a1', 'w')).toEqual({ x: 0.5, y: 7.5 });
    expect(squareCenter('h8', 'w')).toEqual({ x: 7.5, y: 0.5 });
    expect(squareCenter('e4', 'w')).toEqual({ x: 4.5, y: 4.5 });
  });

  it('flips for black orientation', () => {
    expect(squareCenter('a1', 'b')).toEqual({ x: 7.5, y: 0.5 });
    expect(squareCenter('h8', 'b')).toEqual({ x: 0.5, y: 7.5 });
  });

  it('inverts via squareFromFraction', () => {
    for (const orientation of ['w', 'b'] as const) {
      for (const sq of ['a1', 'e4', 'h8', 'c6']) {
        const c = squareCenter(sq, orientation);
        expect(squareFromFraction(c.x / 8, c.y / 8, orientation)).toBe(sq);
      }
    }
    expect(squareFromFraction(1.2, 0.5, 'w')).toBeNull();
  });
});

describe('arrows', () => {
  it('detects knight moves', () => {
    expect(isKnightMove('g1', 'f3')).toBe(true);
    expect(isKnightMove('b1', 'c3')).toBe(true);
    expect(isKnightMove('e2', 'e4')).toBe(false);
    expect(isKnightMove('c8', 'f5')).toBe(false);
  });

  it('straight arrow tip lands on the target square center', () => {
    const pts = parsePoints(arrowPolygon('e2', 'e4', 'w'));
    expect(pts).toHaveLength(7);
    const target = squareCenter('e4', 'w');
    expect(pts.some(([x, y]) => x === target.x && y === target.y)).toBe(true);
  });

  it('knight arrow bends through the long-leg corner', () => {
    const pts = parsePoints(arrowPolygon('g1', 'f3', 'w'));
    expect(pts).toHaveLength(9);
    const target = squareCenter('f3', 'w');
    expect(pts.some(([x, y]) => x === target.x && y === target.y)).toBe(true);
    // Long leg first: from g1 the vertical distance (2) exceeds horizontal (1),
    // so the corner sits at (g-file, rank 3) = board coords of g3.
    const corner = squareCenter('g3', 'w');
    const nearCorner = pts.filter(([x, y]) => Math.abs(x - corner.x) < 0.5 && Math.abs(y - corner.y) < 0.5);
    expect(nearCorner.length).toBeGreaterThanOrEqual(2);
  });

  it('every generated point stays on the board for both orientations', () => {
    const cases: Array<[string, string]> = [
      ['g1', 'f3'],
      ['b1', 'c3'],
      ['f3', 'g5'],
      ['a1', 'h8'],
      ['e2', 'e4'],
      ['h4', 'g5'],
    ];
    for (const orientation of ['w', 'b'] as const) {
      for (const [from, to] of cases) {
        for (const [x, y] of parsePoints(arrowPolygon(from, to, orientation))) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(8);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(8);
        }
      }
    }
  });
});
