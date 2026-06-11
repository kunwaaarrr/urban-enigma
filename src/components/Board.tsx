import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Chess, type Square } from 'chess.js';
import { FILES, isLightSquare, squareFromFraction, squarePercent } from '../chess/coords';
import { ArrowLayer } from './ArrowLayer';
import type { Arrow, Badge, Highlight } from '../data/types';

export interface BoardMove {
  from: string;
  to: string;
  san: string;
}

interface Props {
  fen: string;
  orientation: 'w' | 'b';
  lastMove?: { from: string; to: string } | null;
  arrows: Arrow[];
  highlights: Highlight[];
  computedArrows?: Arrow[];
  computedHighlights?: Highlight[];
  badge?: { square: string; type: Badge } | null;
  /** Square flashed red after a wrong attempt; pass a fresh object each time. */
  wrongFlash?: { square: string; key: number } | null;
  interactive: boolean;
  onMove?: (move: BoardMove) => void;
}

interface PieceView {
  id: number;
  type: string;
  color: 'w' | 'b';
  square: string;
  noanim: boolean;
}

let nextId = 1;

function piecesFromFen(fen: string): Omit<PieceView, 'id' | 'noanim'>[] {
  const chess = new Chess(fen);
  return chess
    .board()
    .flat()
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ type: p.type, color: p.color, square: p.square }));
}

/** Match the new position against the previous one so moved pieces keep their id (CSS animates). */
function diffPieces(prev: PieceView[], fen: string): PieceView[] {
  const target = piecesFromFen(fen);
  const used = new Set<number>();
  const result: PieceView[] = [];
  const pending: typeof target = [];

  for (const t of target) {
    const same = prev.find((p) => !used.has(p.id) && p.square === t.square && p.type === t.type && p.color === t.color);
    if (same) {
      used.add(same.id);
      result.push({ ...same, noanim: false });
    } else {
      pending.push(t);
    }
  }
  let movedCount = 0;
  for (const t of pending) {
    const moved =
      prev.find((p) => !used.has(p.id) && p.type === t.type && p.color === t.color) ??
      // promotion: a pawn of the same color disappeared
      prev.find((p) => !used.has(p.id) && p.type === 'p' && p.color === t.color);
    if (moved) {
      used.add(moved.id);
      movedCount++;
      result.push({ id: moved.id, type: t.type, color: t.color, square: t.square, noanim: false });
    } else {
      result.push({ id: nextId++, type: t.type, color: t.color, square: t.square, noanim: true });
    }
  }
  // A jump bigger than one move (seek/restart): skip the animation entirely.
  if (movedCount > 3 || prev.length === 0) {
    return target.map((t) => ({ ...t, id: nextId++, noanim: true }));
  }
  return result;
}

export function Board({
  fen,
  orientation,
  lastMove,
  arrows,
  highlights,
  computedArrows,
  computedHighlights,
  badge,
  wrongFlash,
  interactive,
  onMove,
}: Props) {
  const [pieces, setPieces] = useState<PieceView[]>(() => piecesFromFen(fen).map((t) => ({ ...t, id: nextId++, noanim: true })));
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ square: string; x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fenRef = useRef(fen);

  useEffect(() => {
    if (fenRef.current !== fen) {
      fenRef.current = fen;
      setPieces((prev) => diffPieces(prev, fen));
      setSelected(null);
      setDragging(null);
    }
  }, [fen]);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const legalTargets = useMemo(() => {
    if (!selected) return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    for (const m of chess.moves({ square: selected as Square, verbose: true })) {
      map.set(m.to, Boolean(m.captured));
    }
    return map;
  }, [chess, selected]);

  function squareAt(clientX: number, clientY: number): string | null {
    const el = wrapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return squareFromFraction((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height, orientation);
  }

  function tryMove(from: string, to: string): boolean {
    if (from === to) return false;
    const probe = new Chess(fen);
    try {
      const m = probe.move({ from, to, promotion: 'q' });
      onMove?.({ from: m.from, to: m.to, san: m.san });
      return true;
    } catch {
      return false;
    }
  }

  function handlePointerDown(e: PointerEvent) {
    if (!interactive) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq) return;
    e.preventDefault();
    const piece = chess.get(sq as Square);

    if (selected && legalTargets.has(sq)) {
      tryMove(selected, sq);
      setSelected(null);
      return;
    }
    if (piece && piece.color === chess.turn()) {
      setSelected(sq);
      setDragging({ square: sq, x: e.clientX, y: e.clientY });
      wrapRef.current?.setPointerCapture(e.pointerId);
    } else {
      setSelected(null);
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return;
    setDragging({ ...dragging, x: e.clientX, y: e.clientY });
  }

  function handlePointerUp(e: PointerEvent) {
    if (!dragging) return;
    const drop = squareAt(e.clientX, e.clientY);
    const from = dragging.square;
    setDragging(null);
    if (drop && drop !== from) {
      if (tryMove(from, drop)) setSelected(null);
    }
    // drop on the same square: keep selection (tap-tap flow)
  }

  const rows = orientation === 'w' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const rect = wrapRef.current?.getBoundingClientRect();

  return (
    <div
      class="board-wrap"
      ref={wrapRef}
      onPointerDown={handlePointerDown as never}
      onPointerMove={handlePointerMove as never}
      onPointerUp={handlePointerUp as never}
      onPointerCancel={() => setDragging(null)}
    >
      <div class="board-squares">
        {rows.map((rank, ri) =>
          cols.map((file, ci) => {
            const sq = FILES[file] + (rank + 1);
            const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isWrong = wrongFlash && wrongFlash.square === sq;
            return (
              <div key={sq} class={`sq ${isLightSquare(sq) ? 'light' : 'dark'}`}>
                {isLast && <div class="overlay lastmove" />}
                {selected === sq && <div class="overlay selected" />}
                {isWrong && <div key={wrongFlash.key} class="overlay wrongflash" />}
                {ci === 0 && <span class="coord rank">{rank + 1}</span>}
                {ri === 7 && <span class="coord file">{FILES[file]}</span>}
                {legalTargets.has(sq) && <div class={`dot ${legalTargets.get(sq) ? 'capture' : ''}`} />}
              </div>
            );
          }),
        )}
      </div>
      {pieces.map((p) => {
        const pos = squarePercent(p.square, orientation);
        const isDragged = dragging?.square === p.square;
        let style: Record<string, string> = { left: `${pos.left}%`, top: `${pos.top}%` };
        if (isDragged && rect) {
          style = {
            left: `${((dragging.x - rect.left) / rect.width) * 100 - 6.25}%`,
            top: `${((dragging.y - rect.top) / rect.height) * 100 - 6.25}%`,
          };
        }
        return (
          <div key={p.id} class={`piece ${p.noanim ? 'noanim' : ''} ${isDragged ? 'dragging' : ''}`} style={style}>
            <img src={`${import.meta.env.BASE_URL}pieces/${p.color}${p.type.toUpperCase()}.svg`} alt={`${p.color}${p.type}`} draggable={false} />
          </div>
        );
      })}
      <ArrowLayer
        orientation={orientation}
        arrows={arrows}
        highlights={highlights}
        computedArrows={computedArrows}
        computedHighlights={computedHighlights}
        badge={badge}
      />
    </div>
  );
}
