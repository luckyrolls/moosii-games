import { describe, expect, it } from 'vitest';
import { validateWordPuzzle } from './validate';
import { sampleWordPuzzle } from './testing/sampleWordPuzzle';

type Mutable = Record<string, unknown>;

function broken(mutate: (p: Mutable) => void): unknown {
  const p = structuredClone(sampleWordPuzzle()) as unknown as Mutable;
  mutate(p);
  return p;
}

function errorsFor(input: unknown): string[] {
  const result = validateWordPuzzle(input);
  if (result.ok) throw new Error('expected validation to fail');
  return result.errors;
}

describe('validateWordPuzzle', () => {
  it('accepts a well-formed puzzle with a lesson source', () => {
    expect(validateWordPuzzle(sampleWordPuzzle())).toEqual({ ok: true, puzzle: sampleWordPuzzle() });
  });

  it('accepts an activity source instead of a lesson source', () => {
    const p = sampleWordPuzzle();
    delete p.source_lesson_id;
    p.source_activity_id = 'activity-1';
    expect(validateWordPuzzle(p).ok).toBe(true);
  });

  it.each(['SOAK', 'BUDGET', 'NOTEBOOK'])('accepts the %s answer length', (answer) => {
    expect(validateWordPuzzle(sampleWordPuzzle({ answer })).ok).toBe(true);
  });

  it('accepts inner whitespace and a single underscore in hint and takeaway', () => {
    const p = sampleWordPuzzle({ hint: 'Not  pushing_it', takeaway: 'Plan  around energy.' });
    expect(validateWordPuzzle(p).ok).toBe(true);
  });

  const cases: [string, (p: Mutable) => void, RegExp][] = [
    ['wrong schema_version', (p) => { p.schema_version = 2; }, /^schema_version: must be 1/],
    ['wrong game', (p) => { p.game = 'groups'; }, /^game: must be "word"/],
    ['missing puzzle_id', (p) => { delete p.puzzle_id; }, /^puzzle_id: is required/],
    ['unknown domain', (p) => { p.domain = 'sports'; }, /^domain: must be one of "moosii", "financial", "cancer"/],
    ['title with trailing whitespace', (p) => { p.title = 'Test word '; }, /^title: must not start or end with whitespace/],
    ['lowercase answer', (p) => { p.answer = 'pacing'; }, /^answer: must be 4-8 uppercase letters A-Z, nothing else/],
    ['mixed-case answer', (p) => { p.answer = 'Pacing'; }, /^answer: must be 4-8 uppercase letters/],
    ['answer too short', (p) => { p.answer = 'PAC'; }, /^answer: must be 4-8 uppercase letters/],
    ['answer too long', (p) => { p.answer = 'PACINGSSS'; }, /^answer: must be 4-8 uppercase letters/],
    ['answer with a space', (p) => { p.answer = 'PAC NG'; }, /^answer: must be 4-8 uppercase letters/],
    ['answer with an accented letter', (p) => { p.answer = 'CAFÉS'; }, /^answer: must be 4-8 uppercase letters/],
    ['answer with a digit', (p) => { p.answer = 'PACE1'; }, /^answer: must be 4-8 uppercase letters/],
    ['missing answer', (p) => { delete p.answer; }, /^answer: is required/],
    ['blank hint', (p) => { p.hint = '  '; }, /^hint: must be a non-empty string/],
    ['hint with leading whitespace', (p) => { p.hint = ' Spreading'; }, /^hint: must not start or end with whitespace/],
    ['hint with a blank', (p) => { p.hint = 'Spreading your ___ out'; }, /^hint: use a word instead of a blank — screen readers read underscores aloud/],
    ['missing takeaway', (p) => { delete p.takeaway; }, /^takeaway: is required/],
    ['takeaway with trailing newline', (p) => { p.takeaway = 'Pace yourself.\n'; }, /^takeaway: must not start or end with whitespace/],
    ['takeaway with a blank', (p) => { p.takeaway = 'Pacing means __ planning.'; }, /^takeaway: use a word instead of a blank/],
    ['neither source id', (p) => { delete p.source_lesson_id; }, /^puzzle: must have exactly one of source_lesson_id or source_activity_id \(neither given\)/],
    ['both source ids', (p) => { p.source_activity_id = 'activity-1'; }, /^puzzle: must have exactly one of source_lesson_id or source_activity_id \(both given\)/],
    ['blank source_lesson_id', (p) => { p.source_lesson_id = ''; }, /^source_lesson_id: must be a non-empty string/],
    ['makes_health_claim missing', (p) => { delete p.makes_health_claim; }, /^makes_health_claim: is required/],
    ['unknown field', (p) => { p.points = 5; }, /^puzzle: unknown field\(s\) "points"/],
    ['groups field on a word puzzle', (p) => { p.groups = []; }, /^puzzle: unknown field\(s\) "groups"/],
  ];

  it.each(cases)('rejects %s', (_name, mutate, expected) => {
    const errors = errorsFor(broken(mutate));
    expect(errors.some((e) => expected.test(e)), `got: ${errors.join(' | ')}`).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(errorsFor(null)[0]).toMatch(/^puzzle:/);
    expect(errorsFor([])[0]).toMatch(/^puzzle:/);
  });

  it('does not change accepted values', () => {
    const p = sampleWordPuzzle({ hint: 'Spread  it out' });
    const result = validateWordPuzzle(p);
    expect(result.ok && result.puzzle.hint).toBe('Spread  it out');
  });
});
