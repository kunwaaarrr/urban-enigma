import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGames, playerColor, type ChessComGame } from '../src/chess/chesscom';

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

describe('getGames', () => {
  function stubFetch(byUrl: Record<string, unknown>, onFetch?: (url: string) => void) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        onFetch?.(url);
        return { ok: true, status: 200, json: async () => byUrl[url] };
      }),
    );
  }

  const archivesUrl = 'https://api.chess.com/pub/player/kunwar101/games/archives';
  const nov = 'https://api.chess.com/pub/player/kunwar101/games/2023/11';
  const oct = 'https://api.chess.com/pub/player/kunwar101/games/2023/10';

  it('filters by time class and returns newest first', async () => {
    stubFetch({
      [archivesUrl]: { archives: [nov] },
      [nov]: {
        games: [
          game({ end_time: 100, time_class: 'rapid' }),
          game({ end_time: 200, time_class: 'blitz' }),
          game({ end_time: 300, time_class: 'rapid' }),
        ],
      },
    });
    const games = await getGames('Kunwar101', { max: 10, timeClass: 'rapid' });
    expect(games.map((g) => g.end_time)).toEqual([300, 100]); // only rapid, newest first
  });

  it('stops once max matching games are collected, without reading older archives', async () => {
    const seen: string[] = [];
    stubFetch(
      {
        [archivesUrl]: { archives: [oct, nov] },
        [nov]: { games: [game({ end_time: 1 }), game({ end_time: 2 }), game({ end_time: 3 })] },
        [oct]: { games: [game({ end_time: 0 })] },
      },
      (u) => seen.push(u),
    );
    const games = await getGames('kunwar101', { max: 2, timeClass: 'all' });
    expect(games).toHaveLength(2);
    expect(games.map((g) => g.end_time)).toEqual([3, 2]); // newest two
    expect(seen).not.toContain(oct); // earlier archive never fetched
  });

  it('skips non-standard variants', async () => {
    stubFetch({
      [archivesUrl]: { archives: [nov] },
      [nov]: { games: [game({ end_time: 5, rules: 'chess960' }), game({ end_time: 6 })] },
    });
    const games = await getGames('kunwar101', { max: 10, timeClass: 'all' });
    expect(games).toHaveLength(1);
    expect(games[0].end_time).toBe(6);
  });

  it('throws a helpful error on 404 (bad username)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    await expect(getGames('nope', { max: 5 })).rejects.toThrow(/check the username/);
  });
});
