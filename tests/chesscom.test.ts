import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRecentGames, playerColor, type ChessComGame } from '../src/chess/chesscom';

function game(partial: Partial<ChessComGame> & { end_time: number }): ChessComGame {
  return {
    url: `https://chess.com/game/${partial.end_time}`,
    pgn: '1. e4 e5',
    time_control: '600',
    rated: true,
    time_class: 'rapid',
    rules: 'chess',
    white: { username: 'kunwar101' },
    black: { username: 'opp' },
    ...partial,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('playerColor', () => {
  it('is case-insensitive on username', () => {
    const g = game({ end_time: 0, white: { username: 'Kunwar101' }, black: { username: 'x' } });
    expect(playerColor(g, 'kunwar101')).toBe('w');
    expect(playerColor(g, 'X')).toBe('b');
  });
});

describe('getRecentGames', () => {
  const NOW = 1_700_000_000_000; // fixed "now" in ms
  const day = 86400;
  const sec = NOW / 1000;

  function stubFetch(byUrl: Record<string, unknown>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () => byUrl[url],
      })),
    );
  }

  it('keeps only standard games inside the window, newest first', async () => {
    const archive = 'https://api.chess.com/pub/player/kunwar101/games/2023/11';
    stubFetch({
      'https://api.chess.com/pub/player/kunwar101/games/archives': { archives: [archive] },
      [archive]: {
        games: [
          game({ end_time: sec - 1 * day }), // in window
          game({ end_time: sec - 3 * day }), // in window
          game({ end_time: sec - 20 * day }), // too old
          game({ end_time: sec - 2 * day, rules: 'chess960' }), // wrong variant
        ],
      },
    });

    const games = await getRecentGames('Kunwar101', 7, NOW);
    expect(games).toHaveLength(2);
    expect(games[0].end_time).toBeGreaterThan(games[1].end_time); // sorted newest-first
    expect(games.every((g) => g.rules === 'chess')).toBe(true);
  });

  it('stops walking once an archive contains older-than-cutoff games', async () => {
    const nov = 'https://api.chess.com/pub/player/kunwar101/games/2023/11';
    const oct = 'https://api.chess.com/pub/player/kunwar101/games/2023/10';
    const octFetched = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/archives')) return { ok: true, status: 200, json: async () => ({ archives: [oct, nov] }) };
        if (url === nov)
          return {
            ok: true,
            status: 200,
            json: async () => ({ games: [game({ end_time: sec - 1 * day }), game({ end_time: sec - 40 * day })] }),
          };
        octFetched();
        return { ok: true, status: 200, json: async () => ({ games: [] }) };
      }),
    );

    const games = await getRecentGames('kunwar101', 7, NOW);
    expect(games).toHaveLength(1);
    expect(octFetched).not.toHaveBeenCalled(); // earlier archive never touched
  });

  it('throws a helpful error on 404 (bad username)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    await expect(getRecentGames('nope', 7, NOW)).rejects.toThrow(/check the username/);
  });
});
