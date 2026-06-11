export interface LineProgress {
  attempts: number;
  cleanRuns: number;
  mastered: boolean;
  lastSeen: string;
}

export type ProgressMap = Record<string, LineProgress>;

const KEY = 'oct:v1:progress';

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function recordResult(lineId: string, clean: boolean): ProgressMap {
  const map = loadProgress();
  const prev = map[lineId] ?? { attempts: 0, cleanRuns: 0, mastered: false, lastSeen: '' };
  const next: LineProgress = {
    attempts: prev.attempts + 1,
    cleanRuns: prev.cleanRuns + (clean ? 1 : 0),
    mastered: prev.mastered || clean,
    lastSeen: new Date().toISOString(),
  };
  map[lineId] = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // private mode etc. — progress just won't persist
  }
  return map;
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
