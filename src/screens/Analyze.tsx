import { useMemo, useRef, useState } from 'preact/hooks';
import { Board } from '../components/Board';
import { TopBar } from '../components/ui';
import { getRecentGames, playerColor, type ChessComGame } from '../chess/chesscom';
import { Engine } from '../chess/engine';
import { reviewGame, type MoveError } from '../chess/review';

const LS_USER = 'ot-chesscom-user';

interface GameReview {
  game: ChessComGame;
  side: 'w' | 'b';
  errors: MoveError[];
}

type Phase = 'idle' | 'fetching' | 'analyzing' | 'done' | 'error';

const TAG_LABEL = { blunder: '?? Blunder', mistake: '? Mistake', inaccuracy: '?! Inaccuracy' } as const;
const TAG_COLOR = { blunder: 'red', mistake: 'orange', inaccuracy: 'yellow' } as const;

export function Analyze({ navigate }: { navigate: (hash: string) => void }) {
  const [username, setUsername] = useState(() => localStorage.getItem(LS_USER) || 'Kunwar101');
  const [days, setDays] = useState(7);
  const [depth, setDepth] = useState(12);
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('');
  const [reviews, setReviews] = useState<GameReview[]>([]);
  const [selected, setSelected] = useState<MoveError | null>(null);
  const engineRef = useRef<Engine | null>(null);

  async function run() {
    localStorage.setItem(LS_USER, username);
    setReviews([]);
    setSelected(null);
    setPhase('fetching');
    setStatus(`Fetching ${username}'s last ${days} days of games…`);
    try {
      const games = await getRecentGames(username, days);
      if (games.length === 0) {
        setPhase('done');
        setStatus('No standard games found in that window.');
        return;
      }
      const engine = engineRef.current ?? (engineRef.current = new Engine());
      setPhase('analyzing');
      const out: GameReview[] = [];
      for (let g = 0; g < games.length; g++) {
        const game = games[g];
        const side = playerColor(game, username);
        const errors = await reviewGame(game.pgn, (fen, d) => engine.evaluate(fen, d), {
          depth,
          side,
          onProgress: (doneP, totalP) =>
            setStatus(`Game ${g + 1}/${games.length} — analyzing move ${doneP}/${totalP}…`),
        });
        out.push({ game, side, errors });
        setReviews([...out]);
      }
      setPhase('done');
      setStatus(`Analyzed ${games.length} game${games.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setPhase('error');
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  const totals = useMemo(() => {
    const t = { blunder: 0, mistake: 0, inaccuracy: 0 };
    for (const r of reviews) for (const e of r.errors) t[e.tag]++;
    return t;
  }, [reviews]);

  const busy = phase === 'fetching' || phase === 'analyzing';

  return (
    <div>
      <TopBar title="Game Review" subtitle="chess.com → Stockfish" onBack={() => navigate('#/')} />
      <div class="analyze">
        <div class="az-form">
          <label>
            chess.com username
            <input value={username} onInput={(e) => setUsername((e.target as HTMLInputElement).value)} disabled={busy} />
          </label>
          <label>
            Days back
            <input
              type="number"
              min={1}
              max={31}
              value={days}
              onInput={(e) => setDays(Number((e.target as HTMLInputElement).value) || 7)}
              disabled={busy}
            />
          </label>
          <label>
            Depth
            <input
              type="number"
              min={8}
              max={20}
              value={depth}
              onInput={(e) => setDepth(Number((e.target as HTMLInputElement).value) || 12)}
              disabled={busy}
            />
          </label>
          <button class="az-run" onClick={run} disabled={busy || !username.trim()}>
            {busy ? 'Working…' : 'Analyze my games'}
          </button>
        </div>

        {status && <div class={`az-status ${phase === 'error' ? 'err' : ''}`}>{status}</div>}

        {reviews.length > 0 && (
          <div class="az-totals">
            <span class="az-pill red">{totals.blunder} blunders</span>
            <span class="az-pill orange">{totals.mistake} mistakes</span>
            <span class="az-pill yellow">{totals.inaccuracy} inaccuracies</span>
          </div>
        )}

        {selected && (
          <div class="az-board">
            <Board
              fen={selected.fenBefore}
              orientation={selected.color}
              arrows={[
                { from: selected.from, to: selected.to, color: 'red' },
                { from: selected.bestFrom, to: selected.bestTo, color: 'green' },
              ]}
              highlights={[]}
              interactive={false}
            />
            <div class="az-board-cap">
              You played <b>{selected.san}</b> (−{(selected.loss / 100).toFixed(1)}). Best was{' '}
              <b class="good">{selected.bestSan}</b>.
            </div>
          </div>
        )}

        {reviews.map((r) => (
          <div class="az-game" key={r.game.url}>
            <div class="az-game-head">
              <a href={r.game.url} target="_blank" rel="noreferrer">
                {r.game.white.username} vs {r.game.black.username}
              </a>
              <span class="az-game-meta">
                {r.game.time_class} · you played {r.side === 'w' ? 'White' : 'Black'}
              </span>
            </div>
            {r.errors.length === 0 ? (
              <div class="az-clean">No mistakes flagged 🎉</div>
            ) : (
              <ul class="az-errs">
                {r.errors.map((e) => (
                  <li key={e.ply}>
                    <button class="az-err" onClick={() => setSelected(e)}>
                      <span class={`az-dot ${TAG_COLOR[e.tag]}`} />
                      <span class="az-mv">
                        {e.moveNumber}
                        {e.color === 'w' ? '.' : '…'} {e.san}
                      </span>
                      <span class="az-tag">{TAG_LABEL[e.tag]}</span>
                      <span class="az-loss">−{(e.loss / 100).toFixed(1)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
