/** Audio playback for the trainer. Lazy, cached, and mute-aware. */
import type { SoundName } from './sound-map';

const FILES: Record<SoundName, string> = {
  move: 'move.mp3',
  capture: 'capture.mp3',
  check: 'check.mp3',
  castle: 'castle.mp3',
  promote: 'promote.mp3',
  complete: 'complete.mp3',
  start: 'start.mp3',
  error: 'error.mp3',
};

const MUTE_KEY = 'ot-muted';
const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
let unlocked = false;

function url(name: SoundName): string {
  return `${import.meta.env.BASE_URL}sounds/${FILES[name]}`;
}

function audio(name: SoundName): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  let el = cache[name];
  if (!el) {
    el = new Audio(url(name));
    el.preload = 'auto';
    cache[name] = el;
  }
  return el;
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/**
 * Prime audio on the first user gesture so later programmatic plays (e.g. the
 * opponent's auto-reply) are allowed by the browser's autoplay policy.
 */
export function unlockAudio(): void {
  if (unlocked || typeof Audio === 'undefined') return;
  unlocked = true;
  for (const name of Object.keys(FILES) as SoundName[]) {
    const el = audio(name);
    if (!el) continue;
    const prevVol = el.volume;
    el.volume = 0;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.volume = prevVol;
      })
      .catch(() => {
        el.volume = prevVol;
      });
  }
}

export function playSound(name: SoundName): void {
  if (isMuted()) return;
  const base = audio(name);
  if (!base) return;
  try {
    // Play a FRESH CLONE each time rather than the shared cached element.
    // unlockAudio() primes the cached elements at volume 0 and pauses them in a
    // later microtask; reusing the same element meant the first real play could
    // start at volume 0 and then get paused by the unlock cleanup — which is why
    // the drill sometimes seemed silent. A clone is independent (correct volume,
    // own playback) and also lets sounds overlap (e.g. move + check).
    const el = (typeof base.cloneNode === 'function' ? (base.cloneNode(true) as HTMLAudioElement) : base);
    el.volume = 1;
    el.currentTime = 0;
    void el.play().catch(() => {
      /* autoplay blocked or not yet unlocked — ignore */
    });
  } catch {
    /* ignore */
  }
}
