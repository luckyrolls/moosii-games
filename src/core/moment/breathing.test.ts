import { describe, expect, it } from 'vitest';
import {
  BREATH_PHASE_TEXT,
  breathCycleMs,
  nextPace,
  paceAllowed,
  paceText,
  phaseAt,
  scalePattern,
  validateBreathingPattern,
  validateBreathingPatterns,
  type BreathingPattern,
} from './breathing';

const p = (inhale: number, holdIn: number, exhale: number, holdOut: number): BreathingPattern => ({
  id: 'p',
  label: 'Test',
  inhale_s: inhale,
  hold_in_s: holdIn,
  exhale_s: exhale,
  hold_out_s: holdOut,
});

describe('phaseAt', () => {
  const four6 = p(4, 0, 6, 0);
  const withHolds = p(4, 1, 5, 2);

  it('starts with the inhale at progress 0', () => {
    expect(phaseAt(four6, 0)).toEqual({ phase: 'inhale', progress: 0, cycle: 0, phaseStartMs: 0, phaseDurationMs: 4000 });
  });

  it('reports progress within a phase', () => {
    expect(phaseAt(four6, 1000).progress).toBeCloseTo(0.25);
    expect(phaseAt(four6, 7000)).toMatchObject({ phase: 'exhale', progress: 0.5, phaseStartMs: 4000, phaseDurationMs: 6000 });
  });

  it('a boundary belongs to the phase that starts there', () => {
    expect(phaseAt(four6, 3999).phase).toBe('inhale');
    expect(phaseAt(four6, 4000)).toMatchObject({ phase: 'exhale', progress: 0 });
    expect(phaseAt(four6, 10000)).toMatchObject({ phase: 'inhale', progress: 0, cycle: 1, phaseStartMs: 10000 });
  });

  it('skips zero-length holds', () => {
    const phases = new Set(Array.from({ length: 100 }, (_, i) => phaseAt(four6, i * 100).phase));
    expect([...phases].sort()).toEqual(['exhale', 'inhale']);
  });

  it('walks every phase in order when holds are set', () => {
    expect(phaseAt(withHolds, 0).phase).toBe('inhale');
    expect(phaseAt(withHolds, 4000).phase).toBe('hold_in');
    expect(phaseAt(withHolds, 5000).phase).toBe('exhale');
    expect(phaseAt(withHolds, 10000).phase).toBe('hold_out');
    expect(phaseAt(withHolds, 11999).phase).toBe('hold_out');
    expect(phaseAt(withHolds, 12000)).toMatchObject({ phase: 'inhale', cycle: 1 });
    expect(breathCycleMs(withHolds)).toBe(12000);
  });

  it('counts cycles over a long session and treats negative time as the start', () => {
    expect(phaseAt(four6, 3 * 10000 + 5000)).toMatchObject({ phase: 'exhale', cycle: 3, phaseStartMs: 34000 });
    expect(phaseAt(four6, -50)).toMatchObject({ phase: 'inhale', progress: 0, cycle: 0 });
  });

  it('uses only the agreed words on screen', () => {
    expect(BREATH_PHASE_TEXT).toEqual({ inhale: 'Breathe in', hold_in: 'Pause', exhale: 'Breathe out', hold_out: 'Pause' });
  });
});

describe('validateBreathingPattern', () => {
  it('accepts gentle patterns and limits at the edges', () => {
    expect(validateBreathingPattern(p(4, 0, 6, 0)).ok).toBe(true);
    expect(validateBreathingPattern(p(2, 2, 10, 2)).ok).toBe(true);
    expect(validateBreathingPattern(p(3.5, 0.5, 6.5, 0)).ok).toBe(true);
  });

  const cases: [string, unknown, RegExp][] = [
    ['inhale too short', p(1.5, 0, 6, 0), /^inhale_s: must be between 2 and 10 seconds/],
    ['inhale too long', p(11, 0, 6, 0), /^inhale_s: must be between 2 and 10 seconds/],
    ['exhale too short', p(4, 0, 1, 0), /^exhale_s: must be between 2 and 10 seconds/],
    ['exhale too long', p(4, 0, 12, 0), /^exhale_s: must be between 2 and 10 seconds/],
    ['long breath hold after inhale', p(4, 7, 8, 0), /^hold_in_s: must be between 0 and 2 seconds/],
    ['long hold after exhale', p(4, 0, 6, 3), /^hold_out_s: must be between 0 and 2 seconds/],
    ['negative hold', p(4, -1, 6, 0), /^hold_in_s: must be between 0 and 2 seconds/],
    ['non-number', { ...p(4, 0, 6, 0), inhale_s: '4' }, /^inhale_s: must be a number of seconds/],
    ['infinite', { ...p(4, 0, 6, 0), exhale_s: Infinity }, /^exhale_s:/],
    ['missing hold', (() => { const x: Partial<BreathingPattern> = p(4, 0, 6, 0); delete x.hold_out_s; return x; })(), /^hold_out_s: is required/],
    ['unknown field', { ...p(4, 0, 6, 0), effect: 'calm' }, /^puzzle: unknown field\(s\) "effect"/],
    ['label with a blank', { ...p(4, 0, 6, 0), label: 'In for ___' }, /^label: use a word instead of a blank/],
  ];

  it.each(cases)('rejects %s', (_name, input, expected) => {
    const r = validateBreathingPattern(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => expected.test(e)), r.errors.join(' | ')).toBe(true);
  });
});

describe('validateBreathingPatterns (file)', () => {
  const file = { schema_version: 1, kind: 'breathing_patterns', patterns: [p(4, 0, 6, 0), { ...p(5, 0, 5, 0), id: 'q' }] };

  it('accepts a valid file', () => {
    expect(validateBreathingPatterns(file).ok).toBe(true);
  });

  it.each([
    ['wrong kind', { ...file, kind: 'grounding_script' }, /^kind: must be "breathing_patterns"/],
    ['no patterns', { ...file, patterns: [] }, /^patterns: must contain at least one pattern/],
    ['duplicate id', { ...file, patterns: [p(4, 0, 6, 0), p(5, 0, 5, 0)] }, /^patterns\[1\]\.id: id "p" is already used by patterns\[0\]/],
    ['bad pattern inside', { ...file, patterns: [p(4, 5, 6, 0)] }, /^patterns\[0\]\.hold_in_s:/],
    ['unknown top-level field', { ...file, version: 2 }, /unknown field\(s\) "version"/],
  ] as const)('rejects %s', (_name, input, expected) => {
    const r = validateBreathingPatterns(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => expected.test(e)), r.errors.join(' | ')).toBe(true);
  });
});

describe('pace', () => {
  it('scales every duration', () => {
    expect(scalePattern(p(4, 1, 6, 0), 1.5)).toMatchObject({ inhale_s: 6, hold_in_s: 1.5, exhale_s: 9, hold_out_s: 0 });
  });

  it('only allows paces that stay inside the validated limits', () => {
    const fourSix = p(4, 0, 6, 0);
    expect(paceAllowed(fourSix, 1.5)).toBe(true); // 6 / 9 s
    expect(paceAllowed(fourSix, 1.7)).toBe(false); // exhale 10.2 s
    expect(paceAllowed(p(2, 0, 6, 0), 0.9)).toBe(false); // inhale 1.8 s
    expect(paceAllowed(p(4, 2, 6, 0), 1.15)).toBe(false); // hold 2.3 s
    expect(paceAllowed(p(4, 0, 6, 0), 0.7)).toBe(true); // a 0 hold stays 0
  });

  it('steps slower and faster, stopping at the bounds', () => {
    const tight = p(3, 0, 8, 0); // exhale limits slower, inhale limits faster
    expect(nextPace(tight, 1, 'slower')).toBe(1.15);
    expect(nextPace(tight, 1.15, 'slower')).toBeNull(); // 1.3 would make the exhale 10.4 s
    expect(nextPace(tight, 1, 'faster')).toBe(0.9);
    expect(nextPace(tight, 0.7, 'faster')).toBeNull();
    expect(nextPace(p(2, 0, 6, 0), 1, 'faster')).toBeNull();
  });

  it('describes the pace in plain words, with no numbers or claims', () => {
    expect(paceText(1)).toBe('Usual pace');
    expect(paceText(1.15)).toBe('A little slower');
    expect(paceText(1.3)).toBe('Slower');
    expect(paceText(1.5)).toBe('Much slower');
    expect(paceText(0.9)).toBe('A little faster');
    expect(paceText(0.7)).toBe('Much faster');
  });
});
