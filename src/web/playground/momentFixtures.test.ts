import { describe, expect, it } from 'vitest';
import { BREATH_LIMITS, validateBreathingPatterns, validateGroundingScript } from '../../core';
import { fixtures, momentFixtures, wordFixtures } from './fixtures';

const MARK = 'FIXTURE — PENDING CLINICIAN REVIEW';
const get = (path: string) => momentFixtures.find((f) => f.path === path)?.data;

describe('Take a Moment fixtures', () => {
  it('breathing patterns are valid, gentle, marked pending review, and include 4-0-6-0 and 5-0-5-0', () => {
    const r = validateBreathingPatterns(get('fixtures/moment/breathing-patterns.json'));
    if (!r.ok) throw new Error(r.errors.join('\n'));
    const shapes = r.value.patterns.map((p) => [p.inhale_s, p.hold_in_s, p.exhale_s, p.hold_out_s].join('-'));
    expect(shapes).toEqual(expect.arrayContaining(['4-0-6-0', '5-0-5-0']));
    for (const p of r.value.patterns) {
      expect(p.label).toContain(MARK);
      expect(p.hold_in_s).toBeLessThanOrEqual(BREATH_LIMITS.hold_in_s.max);
    }
  });

  it('grounding script is valid, 5-4-3-2-1 and marked pending review', () => {
    const r = validateGroundingScript(get('fixtures/moment/grounding.json'));
    if (!r.ok) throw new Error(r.errors.join('\n'));
    expect(r.value.title).toContain(MARK);
    expect(r.value.steps.map((s) => s.count)).toEqual([5, 4, 3, 2, 1]);
  });

  it('the invalid breathing example fails on long holds, long exhale and unknown fields', () => {
    const r = validateBreathingPatterns(get('fixtures/moment/invalid/broken-breathing-patterns.json'));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual(
      expect.arrayContaining([
        'patterns[0].hold_in_s: must be between 0 and 2 seconds',
        'patterns[0].exhale_s: must be between 2 and 10 seconds',
        'patterns[0]: unknown field(s) "calms_you_down"',
      ]),
    );
  });

  it('copy makes no claims about effects', () => {
    const text = JSON.stringify(momentFixtures.filter((f) => !f.path.includes('/invalid/')).map((f) => f.data));
    expect(text).not.toMatch(/calm(s|ing)? you|reduce|anxiety|stress|heal|lower|relax(es)? you|helps? you/i);
  });

  it('moment configs never appear in the puzzle pickers', () => {
    expect([...fixtures, ...wordFixtures].some((f) => f.path.includes('/moment/'))).toBe(false);
  });
});
