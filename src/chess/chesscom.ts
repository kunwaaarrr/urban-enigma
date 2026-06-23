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

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) throw new Error(`Not found: ${url} (check the username)`);
  if (!res.ok) throw new Error(`chess.com API ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

/** Monthly archive URLs, oldest → newest. */
export async function listArchives(username: string): Promise<string[]> {
  const { archives } = await getJSON<{ archives: string[] }>(
    `${API}/player/${username.toLowerCase()}/games/archives`,
  );
  return archives;
}

/** All games in one monthly archive URL (as returned by listArchives). */
export async function getArchiveGames(archiveUrl: string): Promise<ChessComGame[]> {
  const { games } = await getJSON<{ games: ChessComGame[] }>(archiveUrl);
  return games;
}

/** 'all' accepts any time class; otherwise must match exactly. */
export type TimeClass = 'all' | 'rapid' | 'blitz' | 'bullet' | 'daily';

export interface FetchOptions {
  /** Stop once this many matching games are collected. */
  max: number;
  /** Restrict to a single time class, or 'all'. */
  timeClass?: TimeClass;
  /** Progress callback as archives are pulled. */
  onProgress?: (collected: number, max: number) => void;
}

/**
 * Fetch the `max` most recent standard-chess games (optionally filtered to one
 * time class), newest first. Walks monthly archives newest → oldest and stops
 * as soon as enough matching games are collected, so asking for 25 rapid games
 * normally touches only the latest archive or two.
 */
export async function getGames(username: string, opts: FetchOptions): Promise<ChessComGame[]> {
  const { max, timeClass = 'all', onProgress } = opts;
  const archives = await listArchives(username);
  const out: ChessComGame[] = [];
  for (let i = archives.length - 1; i >= 0 && out.length < max; i--) {
    const games = await getArchiveGames(archives[i]);
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

/** Which color did `username` play in this game? */
export function playerColor(game: ChessComGame, username: string): 'w' | 'b' {
  return game.white.username.toLowerCase() === username.toLowerCase() ? 'w' : 'b';
}
