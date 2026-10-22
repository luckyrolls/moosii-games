import { z } from 'zod';
import { blankFreeText, formatIssues, nonEmptyString, type Exact } from '../schemaRules';
import type { MomentValidation } from './clock';

/** Inhale and exhale: 2–10 s. Holds: 0–2 s only (no long breath-holding). */
export const BREATH_LIMITS = {
  inhale_s: { min: 2, max: 10 },
  hold_in_s: { min: 0, max: 2 },
  exhale_s: { min: 2, max: 10 },
  hold_out_s: { min: 0, max: 2 },
} as const;

export interface BreathingPattern {
  id: string;
  /** Shown in the pattern picker. */
  label: string;
  inhale_s: number;
  hold_in_s: number;
  exhale_s: number;
  hold_out_s: number;
}

/** A breathing-patterns config file (clinician-owned). */
export interface BreathingPatternsFile {
  schema_version: 1;
  kind: 'breathing_patterns';
  patterns: BreathingPattern[];
}

export type BreathPhase = 'inhale' | 'hold_in' | 'exhale' | 'hold_out';

/** The only words shown for each phase. */
export const BREATH_PHASE_TEXT: Record<BreathPhase, string> = {
  inhale: 'Breathe in',
  hold_in: 'Pause',
  exhale: 'Breathe out',
  hold_out: 'Pause',
};

const seconds = (field: keyof typeof BREATH_LIMITS) => {
  const { min, max } = BREATH_LIMITS[field];
  return z
    .number({ invalid_type_error: 'must be a number of seconds' })
    .finite()
    .min(min, `must be between ${min} and ${max} seconds`)
    .max(max, `must be between ${min} and ${max} seconds`);
};

const patternSchema = z
  .object({
    id: nonEmptyString,
    label: blankFreeText,
    inhale_s: seconds('inhale_s'),
    hold_in_s: seconds('hold_in_s'),
    exhale_s: seconds('exhale_s'),
    hold_out_s: seconds('hold_out_s'),
  })
  .strict();

const fileSchema = z
  .object({
    schema_version: z.literal(1, { errorMap: () => ({ message: 'must be 1' }) }),
    kind: z.literal('breathing_patterns', { errorMap: () => ({ message: 'must be "breathing_patterns"' }) }),
    patterns: z.array(patternSchema).min(1, 'must contain at least one pattern'),
  })
  .strict()
  .superRefine((file, ctx) => {
    const seen = new Map<string, number>();
    file.patterns.forEach((p, i) => {
      const prev = seen.get(p.id);
      if (prev !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patterns', i, 'id'], message: `id "${p.id}" is already used by patterns[${prev}]` });
      } else {
        seen.set(p.id, i);
      }
    });
  });

const patternMatches: Exact<z.infer<typeof patternSchema>, BreathingPattern> = true;
const fileMatches: Exact<z.infer<typeof fileSchema>, BreathingPatternsFile> = true;
void patternMatches;
void fileMatches;

export function validateBreathingPattern(input: unknown): MomentValidation<BreathingPattern> {
  const r = patternSchema.safeParse(input);
  return r.success ? { ok: true, value: r.data } : { ok: false, errors: formatIssues(r.error) };
}

export function validateBreathingPatterns(input: unknown): MomentValidation<BreathingPatternsFile> {
  const r = fileSchema.safeParse(input);
  return r.success ? { ok: true, value: r.data } : { ok: false, errors: formatIssues(r.error) };
}

/** Phases with their durations in ms, skipping zero-length holds. */
export function breathSegments(pattern: BreathingPattern): { phase: BreathPhase; ms: number }[] {
  const all: { phase: BreathPhase; ms: number }[] = [
    { phase: 'inhale', ms: pattern.inhale_s * 1000 },
    { phase: 'hold_in', ms: pattern.hold_in_s * 1000 },
    { phase: 'exhale', ms: pattern.exhale_s * 1000 },
    { phase: 'hold_out', ms: pattern.hold_out_s * 1000 },
  ];
  return all.filter((s) => s.ms > 0);
}

export function breathCycleMs(pattern: BreathingPattern): number {
  return breathSegments(pattern).reduce((sum, s) => sum + s.ms, 0);
}

export interface PhaseInfo {
  phase: BreathPhase;
  /** 0 at the start of the phase, approaching 1 at its end. */
  progress: number;
  /** Whole cycles completed before this one. */
  cycle: number;
  /** When this phase started, in ms on the same timeline as `elapsedMs`. */
  phaseStartMs: number;
  phaseDurationMs: number;
}

/**
 * Where the breathing timeline is at `elapsedMs` since it started. A boundary belongs to the
 * phase that begins there (at exactly the end of the inhale, the phase is the next one).
 */
export function phaseAt(pattern: BreathingPattern, elapsedMs: number): PhaseInfo {
  const segments = breathSegments(pattern);
  const cycleMs = breathCycleMs(pattern);
  const elapsed = Math.max(0, elapsedMs);
  const cycle = Math.floor(elapsed / cycleMs);
  let t = elapsed - cycle * cycleMs;
  let start = cycle * cycleMs;
  for (const s of segments) {
    if (t < s.ms) {
      return { phase: s.phase, progress: t / s.ms, cycle, phaseStartMs: start, phaseDurationMs: s.ms };
    }
    t -= s.ms;
    start += s.ms;
  }
  // Unreachable for a valid pattern (t < cycleMs); fall back to the start of the next cycle.
  const first = segments[0] as { phase: BreathPhase; ms: number };
  return { phase: first.phase, progress: 0, cycle: cycle + 1, phaseStartMs: start, phaseDurationMs: first.ms };
}

/** Multiply every duration by `factor` (> 1 is slower). */
export function scalePattern(pattern: BreathingPattern, factor: number): BreathingPattern {
  return {
    ...pattern,
    inhale_s: pattern.inhale_s * factor,
    hold_in_s: pattern.hold_in_s * factor,
    exhale_s: pattern.exhale_s * factor,
    hold_out_s: pattern.hold_out_s * factor,
  };
}

/** Pace steps offered by Slower / Faster. 1 is the pattern as written. */
export const PACE_FACTORS = [0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5] as const;

const EPSILON = 1e-9;

/** True if the pattern at this pace still stays inside BREATH_LIMITS. */
export function paceAllowed(pattern: BreathingPattern, factor: number): boolean {
  const scaled = scalePattern(pattern, factor);
  return (Object.keys(BREATH_LIMITS) as (keyof typeof BREATH_LIMITS)[]).every((field) => {
    const v = scaled[field];
    const { min, max } = BREATH_LIMITS[field];
    // A hold of 0 stays 0 at any pace.
    if (v === 0 && min === 0) return true;
    return v >= min - EPSILON && v <= max + EPSILON;
  });
}

/** The next allowed pace in a direction, or null if there isn't one. */
export function nextPace(pattern: BreathingPattern, current: number, direction: 'slower' | 'faster'): number | null {
  const ordered = direction === 'slower' ? [...PACE_FACTORS] : [...PACE_FACTORS].reverse();
  const candidate = ordered.find((f) => (direction === 'slower' ? f > current + EPSILON : f < current - EPSILON) && paceAllowed(pattern, f));
  return candidate ?? null;
}

/** Plain words for a pace, e.g. "Usual pace", "A little slower". */
export function paceText(factor: number): string {
  const index = PACE_FACTORS.findIndex((f) => Math.abs(f - factor) < EPSILON);
  const steps = index === -1 ? Math.sign(factor - 1) : index - PACE_FACTORS.indexOf(1);
  if (steps === 0) return 'Usual pace';
  const n = Math.abs(steps);
  if (n === 1) return steps > 0 ? 'A little slower' : 'A little faster';
  if (n === 2) return steps > 0 ? 'Slower' : 'Faster';
  return steps > 0 ? 'Much slower' : 'Much faster';
}
