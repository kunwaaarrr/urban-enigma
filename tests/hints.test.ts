import { describe, expect, it } from 'vitest';
import { buildUserMoveShapes } from '../src/trainer/hints';
import type { ResolvedPly } from '../src/data/types';

function ply(partial: Partial<ResolvedPly>): ResolvedPly {
  return {
    san: 'Nge7',
    from: 'g8',
    to: 'e7',
    fenBefore: '',
    fenAfter: '',
    isUserMove: true,
    moveNumber: 8,
    color: 'b',
    ...partial,
  };
}

describe('buildUserMoveShapes', () => {
  it('always shows the move as a green arrow with the piece highlighted (full reveal)', () => {
    const shapes = buildUserMoveShapes(ply({}), 'full', true);
    expect(shapes.arrows).toContainEqual({ from: 'g8', to: 'e7', color: 'green' });
    expect(shapes.highlights).toContainEqual({ square: 'g8', color: 'yellow' });
  });

  it('converts an orange follow-up plan from the destination into a blue key square', () => {
    // The exact case from the screenshot: knight goes g8->e7, then heads to f5.
    const shapes = buildUserMoveShapes(
      ply({ arrows: [{ from: 'e7', to: 'f5', color: 'orange' }], highlights: [{ square: 'd4', color: 'blue' }] }),
      'full',
      true,
    );
    expect(shapes.arrows).toContainEqual({ from: 'g8', to: 'e7', color: 'green' }); // the move
    expect(shapes.arrows).toContainEqual({ from: 'e7', to: 'f5', color: 'blue' }); // recolored plan
    expect(shapes.highlights).toContainEqual({ square: 'f5', color: 'blue' }); // key square
    expect(shapes.highlights).toContainEqual({ square: 'd4', color: 'blue' }); // authored key square kept
  });

  it('keeps red threat arrows from the destination as red', () => {
    const shapes = buildUserMoveShapes(
      ply({ san: 'd5', from: 'd7', to: 'd5', arrows: [{ from: 'd5', to: 'e4', color: 'red' }] }),
      'full',
      true,
    );
    expect(shapes.arrows).toContainEqual({ from: 'd7', to: 'd5', color: 'green' });
    expect(shapes.arrows).toContainEqual({ from: 'd5', to: 'e4', color: 'red' });
  });

  it('does not draw the move arrow twice when an authored arrow equals the move', () => {
    const shapes = buildUserMoveShapes(
      ply({ san: 'Bf5', from: 'c8', to: 'f5', arrows: [{ from: 'c8', to: 'f5', color: 'green' }] }),
      'full',
      true,
    );
    const moveArrows = shapes.arrows.filter((a) => a.from === 'c8' && a.to === 'f5');
    expect(moveArrows).toHaveLength(1);
  });

  it('reveals only the piece (no move arrow) at the first drill hint', () => {
    const shapes = buildUserMoveShapes(ply({ arrows: [{ from: 'e7', to: 'f5', color: 'orange' }] }), 'piece', false);
    expect(shapes.arrows).toHaveLength(0);
    expect(shapes.highlights).toContainEqual({ square: 'g8', color: 'blue' });
  });

  it('shows nothing before any hint in drill', () => {
    const shapes = buildUserMoveShapes(ply({ arrows: [{ from: 'e7', to: 'f5', color: 'orange' }] }), 'none', false);
    expect(shapes.arrows).toHaveLength(0);
    expect(shapes.highlights).toHaveLength(0);
  });
});
