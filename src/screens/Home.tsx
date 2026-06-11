import { OPENINGS, getLines } from '../data/openings';
import { ProgressBar, SideChip, TopBar } from '../components/ui';
import type { ProgressMap } from '../trainer/progress';

export function Home({ progress, navigate }: { progress: ProgressMap; navigate: (hash: string) => void }) {
  return (
    <div>
      <TopBar title="Opening Trainer" subtitle="Caro-Kann · Vienna Gambit" />
      <div class="home">
        <div class="home-hero">
          <div class="knight">♞</div>
          <p>Learn every line, then drill until it’s muscle memory.</p>
        </div>
        {OPENINGS.map((opening) => {
          const lines = getLines(opening.id);
          const mastered = lines.filter((l) => progress[l.id]?.mastered).length;
          return (
            <button key={opening.id} class="opening-card" onClick={() => navigate(`#/o/${opening.id}`)}>
              <div class="head">
                <h2>{opening.name}</h2>
                <SideChip side={opening.side} />
              </div>
              <div class="tagline">{opening.tagline}</div>
              <ProgressBar done={mastered} total={lines.length} />
            </button>
          );
        })}
        <button class="drill-everything" onClick={() => navigate('#/drill/all')}>
          🎯 Drill everything
        </button>
      </div>
    </div>
  );
}
