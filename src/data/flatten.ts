import { Chess } from 'chess.js';
import type { Opening, PlayableLine, ResolvedPly, SamplePly, Step, Variation } from './types';

interface PathLeaf {
  steps: Step[];
  branchNames: string[];
  weight: number;
}

/**
 * Enumerate every root-to-leaf path through a step list. A step with
 * `branches` forks: the step itself (plus the rest of the list) is the main
 * branch; each BranchAlt replaces the step and the remainder.
 */
function enumeratePaths(line: Step[]): PathLeaf[] {
  for (let i = 0; i < line.length; i++) {
    const step = line[i];
    if (!step.branches || step.branches.length === 0) continue;

    const prefix = line.slice(0, i);
    const mainRest = [{ ...step, branches: undefined }, ...line.slice(i + 1)];
    const leaves: PathLeaf[] = [];

    for (const tail of enumeratePaths(mainRest)) {
      leaves.push({ ...tail, weight: tail.weight * 2 });
    }
    for (const alt of step.branches) {
      for (const tail of enumeratePaths(alt.line)) {
        leaves.push({
          steps: tail.steps,
          branchNames: [alt.name, ...tail.branchNames],
          weight: (alt.weight ?? 1) * tail.weight,
        });
      }
    }
    return leaves.map((leaf) => ({ ...leaf, steps: [...prefix, ...leaf.steps] }));
  }
  return [{ steps: line, branchNames: [], weight: 1 }];
}

function resolvePlies(steps: Step[], userSide: 'w' | 'b', context: string): ResolvedPly[] {
  const chess = new Chess();
  return steps.map((step) => {
    const fenBefore = chess.fen();
    const color = chess.turn();
    const moveNumber = chess.moveNumber();
    let move;
    try {
      move = chess.move(step.san);
    } catch (err) {
      throw new Error(`Illegal move "${step.san}" in ${context} at ${fenBefore}: ${err}`);
    }
    return {
      san: move.san,
      from: move.from,
      to: move.to,
      fenBefore,
      fenAfter: chess.fen(),
      isUserMove: color === userSide,
      moveNumber,
      color,
      explain: step.explain,
      arrows: step.arrows,
      highlights: step.highlights,
      badge: step.badge,
      also: step.also,
    };
  });
}

export function flattenVariation(opening: Opening, variation: Variation): PlayableLine[] {
  return enumeratePaths(variation.line).map((leaf) => {
    const branchPath = leaf.branchNames.join(' / ');
    return {
      id: branchPath ? `${variation.id}#${branchPath}` : variation.id,
      variationId: variation.id,
      openingId: opening.id,
      name: variation.name,
      branchName: branchPath || undefined,
      eco: variation.eco,
      side: variation.side,
      preamble: variation.preamble,
      plies: resolvePlies(leaf.steps, variation.side, `${variation.id}${branchPath ? '#' + branchPath : ''}`),
      weight: leaf.weight,
      // The guide is authored against the main line's final position, so only
      // attach it there — sidelines (branches) end elsewhere.
      middlegame: branchPath ? undefined : variation.middlegame,
    };
  });
}

export function flattenOpening(opening: Opening): PlayableLine[] {
  return opening.variations.flatMap((v) => flattenVariation(opening, v));
}

/**
 * Resolve a sample middlegame continuation (SAN) from a line's final FEN into
 * concrete moves for the step-through. Throws on an illegal move, so authored
 * samples are validated the same way lines are.
 */
export function resolveSample(finalFen: string, sans: string[]): SamplePly[] {
  const chess = new Chess(finalFen);
  return sans.map((san) => {
    let move;
    try {
      move = chess.move(san);
    } catch (err) {
      throw new Error(`Illegal sample move "${san}" from ${finalFen}: ${err}`);
    }
    return { san: move.san, from: move.from, to: move.to, fenAfter: chess.fen() };
  });
}
