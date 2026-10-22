/**
 * Time source injected by the platform (web components, React Native host).
 * Take a Moment paces animations with it; the shared layers never touch timers themselves.
 */
export interface MomentClock {
  /** Monotonic milliseconds. */
  now(): number;
  /** Call `callback` after roughly `ms` milliseconds. Returns a cancel function. */
  after(ms: number, callback: () => void): () => void;
}

/** Validation result for Take a Moment config files. */
export type MomentValidation<T> = { ok: true; value: T } | { ok: false; errors: string[] };
