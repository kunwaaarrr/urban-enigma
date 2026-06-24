import type { DrillPuzzle, Profile } from './profile';
import type { TimeClass } from './chesscom';

/**
 * The latest game-review result, persisted to localStorage so the report and
 * the weakness drills survive a reload. This is small first-party app data
 * (tens of KB even for 100 games) — not tracking cookies — so it needs no
 * consent banner; a visible "Clear" control covers the user who wants it gone.
 */
export interface SavedAnalysis {
  version: 1;
  savedAt: number;
  username: string;
  params: { count: number; timeClass: TimeClass; depth: number };
  profile: Profile;
  drills: DrillPuzzle[];
}

const KEY = 'ot-analysis-v1';

export function saveAnalysis(a: SavedAnalysis): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
    return true;
  } catch {
    // Quota exceeded or storage disabled — the report still shows this session.
    return false;
  }
}

export function loadAnalysis(): SavedAnalysis | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedAnalysis;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAnalysis(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Approx size of the saved blob in KB, for the "saved on your device" note. */
export function savedSizeKb(): number {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? Math.round((raw.length / 1024) * 10) / 10 : 0;
  } catch {
    return 0;
  }
}
