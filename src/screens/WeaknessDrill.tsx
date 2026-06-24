import { useMemo, useState } from 'preact/hooks';
import { Board, type BoardMove } from '../components/Board';
import { TopBar } from '../components/ui';
import { ProgressBar } from '../components/ui';
import { isCorrectMove, type DrillPuzzle } from '../chess/profile';
import { loadAnalysis } from '../chess/store';
import { playSound, unlockAudio } from '../trainer/sound';
import { soundForSan } from '../trainer/sound-map';

type Status = 'solving' | 'correct' | 'revealed';

const TAG_LABEL = { blunder: 'a blunder', mistake: 'a mistake', inaccuracy: 'an inaccuracy' } as const;

export function WeaknessDrill({ navigate }: { navigate: (hash: string) => void }) {
  const drills = useMemo<DrillPuzzle[]>(() => loadAnalysis()?.drills ?? [], []);
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(0);
  const [status, setStatus] = useState<Status>('solving');
  const [wrongFlash, setWrongFlash] = useState<{ square: string; key: number } | null>(null);
  const [tries, setTries] = useState(0);
  const [sameMove, setSameMove] = useState(false);

  if (drills.length === 0) {
    return (
      <div>
        <TopBar title="Weakness Drills" onBack={() => navigate('#/analyze')} />
        <div class="analyze">
          <div class="az-status">No saved drills yet — run a game review first.</div>
          <button class="az-run" onClick={() => navigate('#/analyze')}>
            Go to Game Review
          </button>
        </div>
      </div>
    );
  }

  if (index >= drills.length) {
    return (
      <div>
        <TopBar title="Weakness Drills" onBack={() => navigate('#/analyze')} />
        <div class="analyze">
          <div class="wd-done">
            <div class="complete-burst">🏁</div>
            <h2>
              {solved} / {drills.length} solved
            </h2>
            <p>Nice work. Re-run them anytime — repetition is what makes the fixes stick.</p>
            <button
              class="az-run"
              onClick={() => {
                setIndex(0);
                setSolved(0);
                setStatus('solving');
                setTries(0);
                setSameMove(false);
              }}
            >
              Drill again
            </button>
            <button class="az-link" onClick={() => navigate('#/analyze')}>
              Back to report
            </button>
          </div>
        </div>
      </div>
    );
  }

  const p = drills[index];
  const showBest = status !== 'solving';

  function onMove(move: BoardMove) {
    unlockAudio();
    if (status !== 'solving') return;
    if (isCorrectMove(p, move.from, move.to)) {
      playSound(soundForSan(move.san));
      setStatus('correct');
      setSolved((s) => s + 1);
      setSameMove(false);
    } else {
      playSound('error');
      const repeated = move.from === p.playedFrom && move.to === p.playedTo;
      setSameMove(repeated);
      setTries((t) => t + 1);
      setWrongFlash({ square: move.to, key: Date.now() });
    }
  }

  function next() {
    setIndex((i) => i + 1);
    setStatus('solving');
    setTries(0);
    setWrongFlash(null);
    setSameMove(false);
  }

  return (
    <div>
      <TopBar title="Weakness Drills" subtitle="Find the move you missed" onBack={() => navigate('#/analyze')} />
      <div class="analyze">
        <ProgressBar done={index} total={drills.length} />

        <div class="wd-prompt">
          <span class={`az-dot ${p.tag === 'blunder' ? 'red' : 'orange'}`} />
          In one of your games you played <b>{p.playedSan}</b> here ({TAG_LABEL[p.tag]} in the {p.phase}). You're{' '}
          {p.orientation === 'w' ? 'White' : 'Black'} — find the better move.
        </div>

        <div class="az-board">
          <Board
            fen={p.fen}
            orientation={p.orientation}
            arrows={showBest ? [{ from: p.bestFrom, to: p.bestTo, color: 'green' }] : []}
            highlights={[]}
            wrongFlash={wrongFlash}
            interactive={status === 'solving'}
            onMove={onMove}
          />
        </div>

        {status === 'correct' && (
          <div class="wd-feedback good">
            ✅ Yes — <b>{p.bestSan}</b> was best{tries > 0 ? `, after ${tries} miss${tries === 1 ? '' : 'es'}` : ''}.
          </div>
        )}
        {status === 'revealed' && (
          <div class="wd-feedback">
            The move was <b>{p.bestSan}</b>. Play it on the board to feel it, then continue.
          </div>
        )}
        {status === 'solving' && sameMove && (
          <div class="wd-feedback bad">That's the same move you played in the game — think again!</div>
        )}
        {status === 'solving' && tries > 0 && !sameMove && (
          <div class="wd-feedback bad">Not the best — try again, or reveal the answer.</div>
        )}

        <div class="wd-controls">
          {status === 'solving' ? (
            <button class="az-link" onClick={() => setStatus('revealed')}>
              Show answer
            </button>
          ) : (
            <button class="az-run" onClick={next}>
              {index + 1 < drills.length ? 'Next →' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
