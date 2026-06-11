import { ARROW_COLORS, arrowPolygon } from './arrows';
import { squareCenter } from '../chess/coords';
import type { Arrow, Badge, Highlight } from '../data/types';

const BADGE_STYLE: Record<Badge, { bg: string; glyph: string }> = {
  book: { bg: '#a88865', glyph: '📖' },
  best: { bg: '#81b64c', glyph: '★' },
  great: { bg: '#749bbf', glyph: '!' },
  brilliant: { bg: '#26c2a3', glyph: '!!' },
  mistake: { bg: '#ffa459', glyph: '?' },
  idea: { bg: '#f7c045', glyph: '💡' },
};

interface Props {
  orientation: 'w' | 'b';
  arrows: Arrow[];
  highlights: Highlight[];
  /** Dimmer computed shapes drawn beneath the authored ones. */
  computedArrows?: Arrow[];
  computedHighlights?: Highlight[];
  badge?: { square: string; type: Badge } | null;
}

export function ArrowLayer({ orientation, arrows, highlights, computedArrows = [], computedHighlights = [], badge }: Props) {
  return (
    <svg class="shapes" viewBox="0 0 8 8">
      {computedHighlights.map((h, i) => {
        const c = squareCenter(h.square, orientation);
        return (
          <rect key={`ch${i}`} x={c.x - 0.5} y={c.y - 0.5} width="1" height="1" fill={ARROW_COLORS[h.color]} opacity="0.3" />
        );
      })}
      {highlights.map((h, i) => {
        const c = squareCenter(h.square, orientation);
        return (
          <rect key={`h${i}`} x={c.x - 0.5} y={c.y - 0.5} width="1" height="1" fill={ARROW_COLORS[h.color]} opacity="0.45" />
        );
      })}
      {computedArrows.map((a, i) => (
        <polygon key={`ca${i}`} points={arrowPolygon(a.from, a.to, orientation)} fill={ARROW_COLORS[a.color]} opacity="0.45" />
      ))}
      {arrows.map((a, i) => (
        <polygon key={`a${i}`} points={arrowPolygon(a.from, a.to, orientation)} fill={ARROW_COLORS[a.color]} opacity="0.85" />
      ))}
      {badge && <BadgeMark square={badge.square} type={badge.type} orientation={orientation} />}
    </svg>
  );
}

function BadgeMark({ square, type, orientation }: { square: string; type: Badge; orientation: 'w' | 'b' }) {
  const c = squareCenter(square, orientation);
  const { bg, glyph } = BADGE_STYLE[type];
  const isEmoji = glyph.length > 2 || glyph.charCodeAt(0) > 0x2100;
  return (
    <g>
      <circle cx={c.x + 0.38} cy={c.y - 0.38} r="0.26" fill={bg} stroke="#fff" stroke-width="0.035" />
      <text
        x={c.x + 0.38}
        y={c.y - 0.38}
        text-anchor="middle"
        dominant-baseline="central"
        font-size={isEmoji ? 0.3 : 0.34}
        font-weight="bold"
        fill="#fff"
      >
        {glyph}
      </text>
    </g>
  );
}
