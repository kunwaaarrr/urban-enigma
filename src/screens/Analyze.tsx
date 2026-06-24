import { useEffect, useRef, useState } from 'preact/hooks';
import { TopBar } from '../components/ui';
import { getGames, getGamesProgressive, playerColor, type TimeClass } from '../chess/chesscom';
import { EnginePool, poolPlan } from '../chess/engine-pool';
import { reviewGame } from '../chess/review';
import { buildDrills, buildProfile, type GameReview, type Profile } from '../chess/profile';
import { clearAnalysis, loadAnalysis, saveAnalysis, savedSizeKb } from '../chess/store';

const LS_USER = 'ot-chesscom-user';
const COUNTS = [10, 25, 50, 100];
const TIME_CLASSES: { value: TimeClass; label: string }[] = [
  { value: 'rapid', label: 'Rapid' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'all', label: 'All' },
];

type Phase = 'idle' | 'fetching' | 'analyzing' | 'done' | 'error';

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Analyze({ navigate }: { navigate: (hash: string) => void }) {
  const [username, setUsername] = useState(() => localStorage.getItem(LS_USER) || 'Kunwar101');
  const [count, setCount] = useState(25);
  const [timeClass, setTimeClass] = useState<TimeClass>('rapid');
  const [waitForAll, setWaitForAll] = useState(false);
  const [depth] = useState(14);
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [drillCount, setDrillCount] = useState(0);
  const [savedKb, setSavedKb] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const poolRef = useRef<EnginePool | null>(null);
  const tick = useRef<number | null>(null);

  // Show the last saved report immediately on open.
  useEffect(() => {
    const saved = loadAnalysis();
    if (saved) {
      setProfile(saved.profile);
      setDrillCount(saved.drills.length);
      setSavedKb(savedSizeKb());
      setUsername(saved.username);
      setCount(saved.params.count);
      setTimeClass(saved.params.timeClass);
      setStatus(`Showing your last review (${new Date(saved.savedAt).toLocaleString()}).`);
      setPhase('done');
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
      poolRef.current?.dispose();
      poolRef.current = null;
    };
  }, []);

  const heavyWarning = count >= 50;

  async function run() {
    localStorage.setItem(LS_USER, username);
    setProfile(null);
    setDrillCount(0);
    setElapsed(0);
    setPhase('fetching');
    setStatus(`Fetching ${username}'s ${count} most recent ${timeClass === 'all' ? '' : timeClass + ' '}games…`);
    const startedAt = Date.now();
    if (tick.current) clearInterval(tick.current);
    tick.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);

    try {
      const label = timeClass === 'all' ? '' : timeClass + ' ';
      const games = waitForAll
        ? await getGames(username, {
            max: count,
            timeClass,
            onProgress: (c, m) => setStatus(`Fetching all ${m} ${label}games — ${c}/${m} so far (no time limit)…`),
          })
        : await getGamesProgressive(username, count, timeClass, setStatus);
      if (games.length === 0) {
        finish('No games found for that username / time class.');
        return;
      }
      const plan = poolPlan();
      // Always create a fresh pool — stale engines from a previous run can be
      // in an unknown state (terminated workers, pending queue items, wrong
      // MultiPV setting). Dispose any leftover pool before creating a new one.
      poolRef.current?.dispose();
      poolRef.current = new EnginePool(plan.size, plan.hashMb);
      const pool = poolRef.current;
      setPhase('analyzing');
      setStatus(`Loading ${plan.size} engine worker${plan.size === 1 ? '' : 's'} (Stockfish WASM)…`);
      // Analyze games concurrently — one per worker — for a near-linear speedup.
      // Report per-position so the UI keeps moving even within a single game
      // (each game is ~30s of engine time, so game-level updates alone look hung).
      let gamesDone = 0;
      let positions = 0;
      let lastShown = 0;
      const showProgress = () => {
        setStatus(`Analyzing… ${gamesDone}/${games.length} games · ${positions} positions evaluated (${plan.size} engines)`);
      };
      const onPosition = () => {
        positions++;
        const now = Date.now();
        if (now - lastShown > 250) {
          lastShown = now;
          showProgress();
        }
      };
      const reviews = await Promise.all(
        games.map((game) =>
          pool.run(async (engine) => {
            const side = playerColor(game, username);
            const errors = await reviewGame(game.pgn, (fen, d) => engine.evaluate(fen, d), {
              depth,
              side,
              analyze: (fen, d, mpv) => engine.analyze(fen, d, mpv),
              onProgress: onPosition,
            });
            gamesDone++;
            showProgress();
            return { game, side, errors } as GameReview;
          }),
        ),
      );

      const prof = buildProfile(reviews, username);
      const drills = buildDrills(reviews);
      saveAnalysis({
        version: 1,
        savedAt: Date.now(),
        username,
        params: { count, timeClass, depth },
        profile: prof,
        drills,
      });
      setProfile(prof);
      setDrillCount(drills.length);
      setSavedKb(savedSizeKb());
      finish(`Done — analyzed ${games.length} games in ${fmtClock(Math.floor((Date.now() - startedAt) / 1000))}.`);
    } catch (err) {
      setPhase('error');
      setStatus(err instanceof Error ? err.message : String(err));
      if (tick.current) clearInterval(tick.current);
    }
  }

  function finish(msg: string) {
    setPhase('done');
    setStatus(msg);
    if (tick.current) clearInterval(tick.current);
  }

  function onClear() {
    clearAnalysis();
    setProfile(null);
    setDrillCount(0);
    setSavedKb(0);
    setStatus('Saved review cleared from this device.');
    setPhase('idle');
  }

  const busy = phase === 'fetching' || phase === 'analyzing';

  return (
    <div>
      <TopBar title="Game Review" subtitle="chess.com → Stockfish" onBack={() => navigate('#/')} />
      <div class="analyze">
        <div class="az-form">
          <label class="grow">
            chess.com username
            <input value={username} onInput={(e) => setUsername((e.target as HTMLInputElement).value)} disabled={busy} />
          </label>
        </div>

        <div class="az-presets">
          <span class="az-lbl">Games</span>
          {COUNTS.map((c) => (
            <button key={c} class={`az-chip ${count === c ? 'on' : ''}`} disabled={busy} onClick={() => setCount(c)}>
              {c}
            </button>
          ))}
        </div>
        <div class="az-presets">
          <span class="az-lbl">Type</span>
          {TIME_CLASSES.map((t) => (
            <button
              key={t.value}
              class={`az-chip ${timeClass === t.value ? 'on' : ''}`}
              disabled={busy}
              onClick={() => setTimeClass(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div class="az-presets">
          <span class="az-lbl">Fetch</span>
          <button
            class={`az-chip ${waitForAll ? 'on' : ''}`}
            disabled={busy}
            title="Pull exactly the requested count, however long it takes (no time-budget step-down)."
            onClick={() => setWaitForAll((v) => !v)}
          >
            {waitForAll ? '✓ Wait for all' : 'Wait for all'}
          </button>
        </div>

        {heavyWarning && !busy && (
          <div class="az-note">
            ⏳ {count} games at depth {depth} runs entirely in your browser — expect several minutes for the full
            personality profile. You can leave this tab open and come back; a timer shows progress.
          </div>
        )}

        <button class="az-run" onClick={run} disabled={busy || !username.trim()}>
          {busy ? `Working… ${fmtClock(elapsed)}` : 'Analyze my games'}
        </button>

        {status && <div class={`az-status ${phase === 'error' ? 'err' : ''}`}>{status}</div>}

        {profile && <Report profile={profile} />}

        {profile && (
          <div class="az-actions">
            {drillCount > 0 && (
              <button class="az-drill" onClick={() => navigate('#/wdrill')}>
                🎯 Drill my weaknesses ({drillCount})
              </button>
            )}
            {savedKb > 0 && (
              <div class="az-saved">
                Saved on your device ({savedKb} KB) ·{' '}
                <button class="az-link" onClick={onClear}>
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Report({ profile: p }: { profile: Profile }) {
  const { record } = p;
  const total = record.wins + record.losses + record.draws || 1;
  const scorePct = Math.round(((record.wins + record.draws * 0.5) / total) * 100);
  return (
    <div class="report">
      <div class="rp-summary">
        <div class="rp-stat">
          <b>{p.gamesAnalyzed}</b>
          <span>games</span>
        </div>
        <div class="rp-stat">
          <b>
            {record.wins}–{record.losses}–{record.draws}
          </b>
          <span>W–L–D · {scorePct}%</span>
        </div>
        <div class="rp-stat">
          <b>{p.seriousPerGame}</b>
          <span>serious mistakes / game</span>
        </div>
        <div class="rp-stat">
          <b>{p.byTag.blunder}</b>
          <span>blunders</span>
        </div>
      </div>

      <div class="rp-cols">
        <div class="rp-card good">
          <h3>✅ What you do well</h3>
          <ul>
            {p.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div class="rp-card work">
          <h3>🎯 Focus on improving</h3>
          <ul>
            {p.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div class="rp-phases">
        <h3>Where mistakes happen</h3>
        {(['opening', 'middlegame', 'endgame'] as const).map((ph) => {
          const t = p.byPhase[ph];
          const n = t.blunder + t.mistake + t.inaccuracy;
          return (
            <div class="rp-phase" key={ph}>
              <span class="rp-phase-name">{ph}</span>
              <span class="rp-phase-bars">
                <span class="rp-bar red" style={{ flexGrow: t.blunder }} />
                <span class="rp-bar orange" style={{ flexGrow: t.mistake }} />
                <span class="rp-bar yellow" style={{ flexGrow: t.inaccuracy }} />
              </span>
              <span class="rp-phase-n">{n}</span>
            </div>
          );
        })}
        <div class="rp-legend">
          <span><i class="dot red" /> blunder</span>
          <span><i class="dot orange" /> mistake</span>
          <span><i class="dot yellow" /> inaccuracy</span>
        </div>
      </div>

      {p.worstOpenings.length > 0 && (
        <div class="rp-openings">
          <h3>Openings costing you points</h3>
          {p.worstOpenings.map((o) => (
            <div class="rp-open" key={o.name}>
              <span class="rp-open-name">{o.name}</span>
              <span class="rp-open-score">
                {o.scorePct}% · {o.games} games
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
