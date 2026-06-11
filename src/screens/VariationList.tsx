import { getLinesByVariation, getOpening } from '../data/openings';
import { SideChip, TopBar } from '../components/ui';
import type { ProgressMap } from '../trainer/progress';

export function VariationList({
  openingId,
  progress,
  navigate,
}: {
  openingId: string;
  progress: ProgressMap;
  navigate: (hash: string) => void;
}) {
  const opening = getOpening(openingId);
  if (!opening) {
    navigate('#/');
    return null;
  }
  const groups = getLinesByVariation(openingId);

  return (
    <div>
      <TopBar title={opening.name} subtitle={opening.tagline} onBack={() => navigate('#/')} />
      <div class="varlist">
        <div style={{ padding: '0 2px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SideChip side={opening.side} />
          <button class="mini-btn drill" onClick={() => navigate(`#/drill/${opening.id}`)}>
            🎯 Drill all
          </button>
        </div>
        {opening.variations.map((variation) => {
          const lines = groups.get(variation.id) ?? [];
          const preview = lines[0]
            ? lines[0].plies
                .slice(0, 6)
                .map((p) => (p.color === 'w' ? `${p.moveNumber}.${p.san}` : p.san))
                .join(' ')
            : '';
          return (
            <div key={variation.id} class="vargroup">
              <div class="vhead">
                <h3>{variation.name}</h3>
                <span class="eco-chip">{variation.eco}</span>
              </div>
              <div class="var-preview">{preview} …</div>
              {lines.map((line) => {
                const mastered = progress[line.id]?.mastered;
                const attempted = (progress[line.id]?.attempts ?? 0) > 0;
                return (
                  <div key={line.id} class="line-row">
                    <span class="mastery">{mastered ? '✅' : attempted ? '◔' : '○'}</span>
                    <span class="lname">
                      {line.branchName ?? 'Main line'} <span class="dim">· {Math.ceil(line.plies.length / 2)} moves</span>
                    </span>
                    <button class="mini-btn learn" onClick={() => navigate(`#/t/${encodeURIComponent(line.id)}/learn`)}>
                      Learn
                    </button>
                    <button class="mini-btn drill" onClick={() => navigate(`#/t/${encodeURIComponent(line.id)}/drill`)}>
                      Drill
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
