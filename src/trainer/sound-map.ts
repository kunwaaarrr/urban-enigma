/**
 * Pure sound naming + SAN→sound mapping. No DOM access here so the state
 * machine can import it and stay testable. Actual playback lives in sound.ts.
 */
export type SoundName =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'complete'
  | 'start'
  | 'error';

/**
 * Pick the sound for a move from its SAN, mirroring chess.com's emphasis:
 * castle > promotion > check/mate > capture > plain move.
 */
export function soundForSan(san: string): SoundName {
  if (san.startsWith('O-O')) return 'castle';
  if (san.includes('=')) return 'promote';
  if (san.includes('+') || san.includes('#')) return 'check';
  if (san.includes('x')) return 'capture';
  return 'move';
}
