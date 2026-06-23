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

/**
 * Fetch standard-chess games played within the last `days`, newest first.
 * Walks archives backward (newest month first) until past the cutoff, so a
 * 7-day window normally touches just the current month (and the previous one
 * near a month boundary).
 */
export async function getRecentGames(username: string, days = 7, now = Date.now()): Promise<ChessComGame[]> {
  const cutoff = now / 1000 - days * 86400;
  const archives = await listArchives(username);
  const out: ChessComGame[] = [];
  for (let i = archives.length - 1; i >= 0; i--) {
    const games = await getArchiveGames(archives[i]);
    let archiveHadOlder = false;
    for (const g of games) {
      if (g.rules !== 'chess') continue;
      if (g.end_time >= cutoff) out.push(g);
      else archiveHadOlder = true;
    }
    // Once we've seen a game older than the cutoff in this (newest-first)
    // sweep, earlier archives are entirely older — stop.
    if (archiveHadOlder) break;
  }
  return out.sort((a, b) => b.end_time - a.end_time);
}

/** Which color did `username` play in this game? */
export function playerColor(game: ChessComGame, username: string): 'w' | 'b' {
  return game.white.username.toLowerCase() === username.toLowerCase() ? 'w' : 'b';
}
