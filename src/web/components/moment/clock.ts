import type { MomentClock } from '../../../core';

/**
 * The browser time source for Take a Moment. This is the only place the components schedule
 * anything: it paces the breathing phases. It never drives a countdown or dismisses messages,
 * and the puzzles never use it.
 */
export const browserClock: MomentClock = {
  now: () => performance.now(),
  after: (ms, callback) => {
    const id = window.setTimeout(callback, ms);
    return () => window.clearTimeout(id);
  },
};
