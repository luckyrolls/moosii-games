import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BREATH_PHASE_TEXT,
  breathCycleMs,
  nextPace,
  paceText,
  phaseAt,
  scalePattern,
  type BreathPhase,
  type BreathingPattern,
  type MomentClock,
} from '../core';

export interface UseBreathingOptions {
  /** Time source from the platform. */
  clock: MomentClock;
  /** Session length; null (default) runs until stopped. A session always ends at the end of a breath. */
  sessionMs?: number | null;
}

export interface Breathing {
  running: boolean;
  phase: BreathPhase | null;
  /** "Breathe in", "Breathe out" or "Pause"; null when not running. */
  phaseText: string | null;
  /** Full length of the current phase at the current pace. */
  phaseDurationMs: number;
  /** Time left in the current phase when this phase was reported (equals phaseDurationMs at a fresh boundary). */
  phaseRemainingMs: number;
  /** Increments each time a phase starts, so renderers can restart their animation. */
  phaseSerial: number;
  /** Pace factor the player chose (> 1 is slower). Takes effect at the next breath while running. */
  pace: number;
  paceText: string;
  canSlower: boolean;
  canFaster: boolean;
  start: () => void;
  stop: () => void;
  slower: () => void;
  faster: () => void;
}

interface Run {
  sessionStart: number;
  /** Start of the current breath cycle. */
  cycleStart: number;
  /** Pace in force for the current cycle. */
  pace: number;
}

interface PhaseView {
  phase: BreathPhase;
  absStart: number;
  durationMs: number;
  remainingMs: number;
  serial: number;
}

export function useBreathing(pattern: BreathingPattern, options: UseBreathingOptions): Breathing {
  const { clock, sessionMs = null } = options;
  const [running, setRunning] = useState(false);
  const [pace, setPace] = useState(1);
  const [view, setView] = useState<PhaseView | null>(null);

  // Latest values for the scheduled callback, which outlives a single render.
  const latest = useRef({ clock, sessionMs, pattern, pace });
  useEffect(() => {
    latest.current = { clock, sessionMs, pattern, pace };
  });
  const run = useRef<Run | null>(null);

  const stop = useCallback(() => {
    run.current = null;
    setRunning(false);
    setView(null);
  }, []);

  const start = useCallback(() => {
    if (run.current) return;
    const now = latest.current.clock.now();
    run.current = { sessionStart: now, cycleStart: now, pace: latest.current.pace };
    setRunning(true);
  }, []);

  // A different pattern starts over.
  useEffect(() => stop, [pattern.id, stop]);

  useEffect(() => {
    if (!running) return;
    let cancel = () => {};

    const tick = () => {
      const current = run.current;
      if (!current) return;
      const { clock: c, pattern: p, sessionMs: limit, pace: wantedPace } = latest.current;
      const now = c.now();
      let info = phaseAt(scalePattern(p, current.pace), now - current.cycleStart);

      if (info.cycle > 0) {
        // One or more whole breaths have ended (more than one if the app was in the background).
        current.cycleStart += info.cycle * breathCycleMs(scalePattern(p, current.pace));
        if (limit !== null && current.cycleStart - current.sessionStart >= limit) {
          stop();
          return;
        }
        current.pace = wantedPace;
        info = phaseAt(scalePattern(p, current.pace), now - current.cycleStart);
      }

      const absStart = current.cycleStart + info.phaseStartMs;
      const remainingMs = info.phaseDurationMs * (1 - info.progress);
      setView((prev) =>
        prev && prev.absStart === absStart
          ? prev
          : { phase: info.phase, absStart, durationMs: info.phaseDurationMs, remainingMs, serial: (prev?.serial ?? 0) + 1 },
      );
      cancel = c.after(Math.max(1, remainingMs), tick);
    };

    tick();
    return () => cancel();
  }, [running, stop]);

  const slower = useCallback(() => setPace((f) => nextPace(latest.current.pattern, f, 'slower') ?? f), []);
  const faster = useCallback(() => setPace((f) => nextPace(latest.current.pattern, f, 'faster') ?? f), []);

  return {
    running,
    phase: view?.phase ?? null,
    phaseText: view ? BREATH_PHASE_TEXT[view.phase] : null,
    phaseDurationMs: view?.durationMs ?? 0,
    phaseRemainingMs: view?.remainingMs ?? 0,
    phaseSerial: view?.serial ?? 0,
    pace,
    paceText: paceText(pace),
    canSlower: nextPace(pattern, pace, 'slower') !== null,
    canFaster: nextPace(pattern, pace, 'faster') !== null,
    start,
    stop,
    slower,
    faster,
  };
}
