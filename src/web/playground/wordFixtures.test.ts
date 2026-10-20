import { describe, expect, it } from 'vitest';
import { DOMAINS, validateWordPuzzle } from '../../core';
import { fixtures, wordFixtures } from './fixtures';

const playable = wordFixtures.filter((f) => !f.path.startsWith('fixtures/word/invalid/'));
const invalid = wordFixtures.filter((f) => f.path.startsWith('fixtures/word/invalid/'));

const EXPECTED: Record<string, { answer: string; hint: string; takeaway: string; source_lesson_id: string }> = {
  moosii: {
    answer: 'SOOTHE',
    hint: 'What you do for a crying baby',
    takeaway: 'Soothing can be as simple as a calm voice and a gentle hold.',
    source_lesson_id: 'fixture-lesson-soothing',
  },
  financial: {
    answer: 'BUDGET',
    hint: 'A plan for where your money goes',
    takeaway: 'A budget is a plan, not a judgment.',
    source_lesson_id: 'fixture-lesson-budget',
  },
  cancer: {
    answer: 'PACING',
    hint: 'Not pushing — spreading your energy out',
    takeaway: 'Pacing means planning your day around your energy.',
    source_lesson_id: 'fixture-lesson-pacing',
  },
};

describe('word fixtures', () => {
  it('has exactly one playable fixture per domain', () => {
    const domains = playable.map((f) => (f.data as { domain: string }).domain).sort();
    expect(domains).toEqual([...DOMAINS].sort());
  });

  it.each(playable.map((f) => [f.path, f.data] as const))('%s is valid and matches the brief', (_path, data) => {
    const result = validateWordPuzzle(data);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const p = result.puzzle;
    expect(p.title).toContain('(FIXTURE — NOT REVIEWED CONTENT)');
    expect(p.makes_health_claim).toBe(false);
    expect(p.source_activity_id).toBeUndefined();
    expect({ answer: p.answer, hint: p.hint, takeaway: p.takeaway, source_lesson_id: p.source_lesson_id }).toEqual(
      EXPECTED[p.domain],
    );
  });

  it('the invalid example fails with readable errors', () => {
    expect(invalid.map((f) => f.path)).toEqual(['fixtures/word/invalid/broken-word-example.json']);
    const result = validateWordPuzzle(invalid[0]!.data);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'answer: must be 4-8 uppercase letters A-Z, nothing else',
        'hint: use a word instead of a blank — screen readers read underscores aloud',
        'takeaway: must not start or end with whitespace',
        'puzzle: must have exactly one of source_lesson_id or source_activity_id (both given)',
      ]),
    );
  });

  it('word fixtures never leak into the groups picker', () => {
    expect(fixtures.some((f) => f.path.startsWith('fixtures/word/'))).toBe(false);
  });
});
