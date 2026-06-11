import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { OPENINGS, getAllLines, getLines } from '../src/data/openings';

const SQUARE = /^[a-h][1-8]$/;

describe('authored opening lines', () => {
  it('flattens every opening without illegal moves', () => {
    // flattenOpening throws on any illegal SAN; just force evaluation.
    const lines = getAllLines();
    expect(lines.length).toBeGreaterThan(15);
  });

  for (const opening of OPENINGS) {
    describe(opening.name, () => {
      const lines = getLines(opening.id);

      it('has lines', () => {
        expect(lines.length).toBeGreaterThan(0);
      });

      for (const line of lines) {
        describe(line.id, () => {
          it('ends on a user move', () => {
            const last = line.plies[line.plies.length - 1];
            expect(last.isUserMove).toBe(true);
          });

          it('user side matches the opening side', () => {
            for (const ply of line.plies) {
              expect(ply.isUserMove).toBe(ply.color === opening.side);
            }
          });

          it('has valid annotation squares and arrow sources', () => {
            for (const ply of line.plies) {
              const before = new Chess(ply.fenBefore);
              for (const arrow of ply.arrows ?? []) {
                expect(arrow.from).toMatch(SQUARE);
                expect(arrow.to).toMatch(SQUARE);
                expect(arrow.from).not.toBe(arrow.to);
                // Arrows describe the position the move creates (or the move
                // itself): the from-square must hold a piece either before or
                // after the move is played.
                const after = new Chess(ply.fenAfter);
                const occupied =
                  before.get(arrow.from as never) || after.get(arrow.from as never);
                expect(occupied, `${line.id}: arrow ${arrow.from}->${arrow.to} on ${ply.san} starts on an empty square`).toBeTruthy();
              }
              for (const h of ply.highlights ?? []) {
                expect(h.square).toMatch(SQUARE);
              }
            }
          });

          it('"also" alternatives are legal at their positions', () => {
            for (const ply of line.plies) {
              if (!ply.also || !ply.isUserMove) continue;
              for (const alt of ply.also) {
                const chess = new Chess(ply.fenBefore);
                expect(() => chess.move(alt), `${line.id}: also-move ${alt} at ${ply.fenBefore}`).not.toThrow();
              }
            }
          });

          it('every user ply has guidance (explain or arrows)', () => {
            for (const ply of line.plies) {
              if (!ply.isUserMove) continue;
              expect(
                Boolean(ply.explain || (ply.arrows && ply.arrows.length)),
                `${line.id}: user move ${ply.moveNumber}.${ply.san} has no explain/arrows`,
              ).toBe(true);
            }
          });
        });
      }
    });
  }
});
