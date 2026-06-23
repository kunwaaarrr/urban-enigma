import { useEffect, useMemo, useState } from 'preact/hooks';
import { Home } from './screens/Home';
import { VariationList } from './screens/VariationList';
import { Trainer } from './screens/Trainer';
import { Analyze } from './screens/Analyze';
import { getAllLines, getLine, getLines } from './data/openings';
import { loadProgress, type ProgressMap } from './trainer/progress';
import type { PlayableLine } from './data/types';

function useHash(): [string, (hash: string) => void] {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return [hash, (h: string) => (location.hash = h)];
}

/** Weighted pick favoring unmastered lines; avoids immediate repeats. */
function pickDrillLine(pool: PlayableLine[], progress: ProgressMap, excludeId?: string): PlayableLine {
  const candidates = pool.length > 1 && excludeId ? pool.filter((l) => l.id !== excludeId) : pool;
  const weighted = candidates.map((l) => ({ l, w: (progress[l.id]?.mastered ? 1 : 3) * l.weight }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const { l, w } of weighted) {
    r -= w;
    if (r <= 0) return l;
  }
  return weighted[weighted.length - 1].l;
}

export function App() {
  const [hash, navigate] = useHash();
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress());
  const refreshProgress = () => setProgress(loadProgress());

  const parts = hash.replace(/^#\/?/, '').split('/');

  if (parts[0] === 'o' && parts[1]) {
    return <VariationList openingId={parts[1]} progress={progress} navigate={navigate} />;
  }

  if (parts[0] === 't' && parts[1] && parts[2]) {
    const line = getLine(decodeURIComponent(parts[1]));
    const mode = parts[2] === 'drill' ? 'drill' : 'learn';
    if (!line) {
      navigate('#/');
      return null;
    }
    return (
      <Trainer
        line={line}
        mode={mode}
        onBack={() => navigate(`#/o/${line.openingId}`)}
        onProgressChange={refreshProgress}
      />
    );
  }

  if (parts[0] === 'analyze') {
    return <Analyze navigate={navigate} />;
  }

  if (parts[0] === 'drill' && parts[1]) {
    return <DrillAll scope={parts[1]} progress={progress} navigate={navigate} onProgressChange={refreshProgress} />;
  }

  return <Home progress={progress} navigate={navigate} />;
}

function DrillAll({
  scope,
  progress,
  navigate,
  onProgressChange,
}: {
  scope: string;
  progress: ProgressMap;
  navigate: (hash: string) => void;
  onProgressChange: () => void;
}) {
  const pool = useMemo(() => (scope === 'all' ? getAllLines() : getLines(scope)), [scope]);
  const [line, setLine] = useState<PlayableLine>(() => pickDrillLine(pool, loadProgress()));
  void progress;

  if (pool.length === 0) {
    navigate('#/');
    return null;
  }

  return (
    <Trainer
      line={line}
      mode="drill"
      onBack={() => navigate(scope === 'all' ? '#/' : `#/o/${scope}`)}
      onNextLine={() => setLine(pickDrillLine(pool, loadProgress(), line.id))}
      onProgressChange={onProgressChange}
    />
  );
}
