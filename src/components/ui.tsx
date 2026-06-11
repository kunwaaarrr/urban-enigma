import type { ComponentChildren } from 'preact';
import type { Badge } from '../data/types';

export function TopBar({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <div class="topbar">
      {onBack && (
        <button class="back" onClick={onBack} aria-label="Back">
          ←
        </button>
      )}
      <div class="titles">
        <h1>{title}</h1>
        {subtitle && <div class="subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

const BADGE_INLINE: Record<Badge, { bg: string; glyph: string }> = {
  book: { bg: '#a88865', glyph: '📖' },
  best: { bg: '#81b64c', glyph: '★' },
  great: { bg: '#749bbf', glyph: '!' },
  brilliant: { bg: '#26c2a3', glyph: '!!' },
  mistake: { bg: '#ffa459', glyph: '?' },
  idea: { bg: '#f7c045', glyph: '💡' },
};

export function BadgeIcon({ type }: { type: Badge }) {
  const s = BADGE_INLINE[type];
  return (
    <span class="badge-ico" style={{ background: s.bg }}>
      {s.glyph}
    </span>
  );
}

export function CoachBanner({
  title,
  body,
  sub,
  badge,
  chip,
}: {
  title: string;
  body?: string;
  sub?: string;
  badge?: Badge | null;
  chip?: string;
}) {
  return (
    <div class="coach">
      <div class="title-row">
        {badge && <BadgeIcon type={badge} />}
        <span>{title}</span>
        {chip && <span class="chip">{chip}</span>}
      </div>
      {body && <div class="body">{body}</div>}
      {sub && <div class="sub">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div class="progress-row">
      <div class="progress-track">
        <div class="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span class="pct">{pct}%</span>
      <span class="count">
        {done}/{total} lines
      </span>
    </div>
  );
}

export function SideChip({ side }: { side: 'w' | 'b' }) {
  return <span class={`side-chip ${side === 'w' ? 'white' : 'black'}`}>You play {side === 'w' ? 'White' : 'Black'}</span>;
}

export function Tool({
  icon,
  label,
  onClick,
  disabled,
  on,
}: {
  icon: ComponentChildren;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  on?: boolean;
}) {
  return (
    <button class={`tool ${on ? 'on' : ''}`} onClick={onClick} disabled={disabled}>
      <span class="ico">{icon}</span>
      {label}
    </button>
  );
}
