/**
 * Minimal client for chess.com's free public API (no auth, CORS-enabled).
 * Docs: https://www.chess.com/news/view/published-data-api
 *
 * Note: chess.com lowercases usernames in API paths. These calls are blocked
 * from the build sandbox by network policy, but work from a real browser since
 * the API sends `Access-Control-Allow-Origin: *`.
 */

export interface ChessComPlayerRef {
  username: string;
  rating?: number;
  result?: string; // 'win' | 'checkmated' | 'resigned' | 'timeout' | 'agreed' | ...
}

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number; // unix seconds
  rated: boolean;
  time_class: string; // 'bullet' | 'blitz' | 'rapid' | 'daily'
  rules: string; // 'chess' for standard
  white: ChessComPlayerRef;
  black: ChessComPlayerRef;
  fen?: string;
}

const API = 'https://api.chess.com/pub';

/** A required, descriptive UA — chess.com blocks generic/empty agents. */
const HEADERS = { Accept: 'application/json' };
/** Per-request ceiling; a single archive/list call can't hang longer than this. */
const FETCH_TIMEOUT_MS = 15_000;

/** Time left until `deadline`, clamped to a sane per-request window. */
function remainingTimeout(deadline?: number): number {
  if (deadline === undefined) return FETCH_TIMEOUT_MS;
  return Math.max(1_000, Math.min(FETCH_TIMEOUT_MS, deadline - Date.now()));
}

async function getJSON<T>(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { headers: HEADERS, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Chess.com API timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) throw new Error(`Not found: ${url} (check the username)`);
  if (!res.ok) throw new Error(`chess.com API ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

/** Monthly archive URLs, oldest → newest. */
export async function listArchives(username: string, timeoutMs?: number): Promise<string[]> {
  const { archives } = await getJSON<{ archives: string[] }>(
    `${API}/player/${username.toLowerCase()}/games/archives`,
    timeoutMs,
  );
  return archives;
}

/** All games in one monthly archive URL (as returned by listArchives). */
export async function getArchiveGames(archiveUrl: string, timeoutMs?: number): Promise<ChessComGame[]> {
  const { games } = await getJSON<{ games: ChessComGame[] }>(archiveUrl, timeoutMs);
  return games;
}

/** 'all' accepts any time class; otherwise must match exactly. */
export type TimeClass = 'all' | 'rapid' | 'blitz' | 'bullet' | 'daily';

export interface FetchOptions {
  /** Stop once this many matching games are collected. */
  max: number;
  /** Restrict to a single time class, or 'all'. */
  timeClass?: TimeClass;
  /** Progress callback as games are pulled. */
  onProgress?: (collected: number, max: number) => void;
  /**
   * Wall-clock deadline (ms timestamp, as from Date.now()). When set, the walk
   * stops between archive fetches once the deadline passes and returns whatever
   * was collected so far, rather than walking every archive. Each individual
   * request is also capped to the time remaining. Omit for no deadline.
   */
  deadline?: number;
}

/**
 * Fetch the `max` most recent standard-chess games (optionally filtered to one
 * time class), newest first. Walks monthly archives newest → oldest and stops
 * as soon as enough matching games are collected, so asking for 25 rapid games
 * normally touches only the latest archive or two.
 */
export async function getGames(username: string, opts: FetchOptions): Promise<ChessComGame[]> {
  const { max, timeClass = 'all', onProgress, deadline } = opts;
  const archives = await listArchives(username, remainingTimeout(deadline));
  const out: ChessComGame[] = [];
  for (let i = archives.length - 1; i >= 0 && out.length < max; i--) {
    // Budget exhausted — return what we have rather than walking more archives.
    if (deadline !== undefined && Date.now() >= deadline) break;
    const games = await getArchiveGames(archives[i], remainingTimeout(deadline));
    // Archive is chronological; take newest first within it too.
    for (let j = games.length - 1; j >= 0 && out.length < max; j--) {
      const g = games[j];
      if (g.rules !== 'chess') continue;
      if (timeClass !== 'all' && g.time_class !== timeClass) continue;
      out.push(g);
      onProgress?.(out.length, max);
    }
  }
  return out.sort((a, b) => b.end_time - a.end_time);
}

/** Per-attempt wall-clock budget for the progressive fallback. */
const ATTEMPT_BUDGET_MS = 10_000;

/**
 * Robust front door for the analyzer. Tries to fetch `desired` games within a
 * short time budget; if that comes back nearly empty (slow/flaky API), it backs
 * off to progressively smaller targets — 50, 25, 10, 5, 3, 2, 1 — each with its
 * own budget. The first attempt that pulls a useful number of games wins. If
 * even a single-game fetch fails, the API is genuinely unreachable (or the
 * username is wrong), and we throw a clear error instead of hanging.
 *
 * @param onStatus surfaces human-readable progress for the UI.
 */
export async function getGamesProgressive(
  username: string,
  desired: number,
  timeClass: TimeClass = 'all',
  onStatus?: (msg: string) => void,
): Promise<ChessComGame[]> {
  const label = timeClass === 'all' ? '' : timeClass + ' ';
  // Descending target sizes, capped at `desired`, always ending at 1.
  const targets = [...new Set([desired, 50, 25, 10, 5, 3, 2, 1].filter((t) => t >= 1 && t <= desired))];
  let lastErr: Error | null = null;

  for (const target of targets) {
    onStatus?.(`Fetching ${username}'s ${target} most recent ${label}game${target === 1 ? '' : 's'} (≤${ATTEMPT_BUDGET_MS / 1000}s)…`);
    try {
      const games = await getGames(username, {
        max: target,
        timeClass,
        deadline: Date.now() + ATTEMPT_BUDGET_MS,
        onProgress: (collected) =>
          onStatus?.(`Fetched ${collected}/${target} ${label}game${collected === 1 ? '' : 's'}…`),
      });
      // The big initial request must clear a low bar (>10) to be worth keeping;
      // smaller fallbacks accept whatever they manage to pull.
      const bar = target > 10 ? 11 : 1;
      if (games.length >= bar) return games;
      // Too few for this target within the budget — step down and try again.
      onStatus?.(`Only got ${games.length} in ${ATTEMPT_BUDGET_MS / 1000}s — trying fewer…`);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      onStatus?.(`Fetching ${target} timed out — trying fewer…`);
    }
  }

  // Even a 1-game fetch failed: it's a real problem, not just slowness.
  throw new Error(
    lastErr
      ? `Couldn't fetch even one game — ${lastErr.message}`
      : `No ${label}games found for "${username}". Double-check the username and time class.`,
  );
}

/** Which color did `username` play in this game? */
export function playerColor(game: ChessComGame, username: string): 'w' | 'b' {
  return game.white.username.toLowerCase() === username.toLowerCase() ? 'w' : 'b';
}
