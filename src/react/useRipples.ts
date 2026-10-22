import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_POND_CONFIG,
  createPond,
  ripplesAt,
  tapPond,
  type Leaf,
  type MomentClock,
  type PondConfig,
  type PondState,
  type RippleView,
} from '../core';

export interface UseRipplesOptions {
  clock: MomentClock;
  /** Ripples fade in place instead of expanding. Renderers also keep leaves still. */
  reducedMotion?: boolean;
  config?: PondConfig;
}

export interface Ripples {
  /**
   * Ripples alive at the last tap, with their age at that moment. Renderers animate them
   * (CSS, Animated) from that age to the end of rippleLifetimeMs; expired ones are dropped on
   * the next tap, and the cap keeps the list short in between.
   */
  ripples: RippleView[];
  leaves: Leaf[];
  config: PondConfig;
  /** Tap at a normalised point (0..1 on each axis). */
  tap: (x: number, y: number) => void;
}

export function useRipples(options: UseRipplesOptions): Ripples {
  const { clock, reducedMotion = false, config = DEFAULT_POND_CONFIG } = options;
  const [pond, setPond] = useState<{ state: PondState; at: number }>(() => ({ state: createPond(), at: 0 }));

  const latest = useRef({ clock, config });
  useEffect(() => {
    latest.current = { clock, config };
  });

  const tap = useCallback((x: number, y: number) => {
    const { clock: c, config: cfg } = latest.current;
    const now = c.now();
    setPond((prev) => ({ state: tapPond(prev.state, x, y, now, cfg), at: now }));
  }, []);

  const ripples = useMemo(
    () => ripplesAt(pond.state, pond.at, { reducedMotion, config }),
    [pond, reducedMotion, config],
  );

  return { ripples, leaves: pond.state.leaves, config, tap };
}
