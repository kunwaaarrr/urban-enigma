import { caroKann } from './caroKann';
import { vienna } from './vienna';
import { flattenOpening } from './flatten';
import type { Opening, PlayableLine } from './types';

export const OPENINGS: Opening[] = [caroKann, vienna];

const linesByOpening = new Map<string, PlayableLine[]>(
  OPENINGS.map((o) => [o.id, flattenOpening(o)]),
);

export function getOpening(id: string): Opening | undefined {
  return OPENINGS.find((o) => o.id === id);
}

export function getLines(openingId: string): PlayableLine[] {
  return linesByOpening.get(openingId) ?? [];
}

export function getAllLines(): PlayableLine[] {
  return OPENINGS.flatMap((o) => getLines(o.id));
}

export function getLine(lineId: string): PlayableLine | undefined {
  return getAllLines().find((l) => l.id === lineId);
}

/** Lines grouped per variation, preserving authoring order. */
export function getLinesByVariation(openingId: string): Map<string, PlayableLine[]> {
  const map = new Map<string, PlayableLine[]>();
  for (const line of getLines(openingId)) {
    const list = map.get(line.variationId) ?? [];
    list.push(line);
    map.set(line.variationId, list);
  }
  return map;
}
