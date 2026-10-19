import { describe, expect, it } from 'vitest';
import { parsePuzzle, validatePuzzle } from './validate';
import { samplePuzzle } from './testing/samplePuzzle';

type Mutable = Record<string, unknown> & { groups: Record<string, unknown>[] };

function broken(mutate: (p: Mutable) => void): unknown {
  const p = structuredClone(samplePuzzle()) as unknown as Mutable;
  mutate(p);
  return p;
}

function errorsFor(input: unknown): string[] {
  const result = validatePuzzle(input);
  if (result.ok) throw new Error('expected validation to fail');
  return result.errors;
}

function items(p: Mutable, groupIndex: number): string[] {
  return p.groups[groupIndex]!.items as string[];
}

describe('validatePuzzle', () => {
  it('accepts a well-formed puzzle', () => {
    expect(validatePuzzle(samplePuzzle())).toEqual({ ok: true, puzzle: samplePuzzle() });
  });

  it('rejects non-objects', () => {
    expect(errorsFor(null)[0]).toMatch(/^puzzle:/);
    expect(errorsFor('nope')[0]).toMatch(/^puzzle:/);
  });

  const cases: [string, (p: Mutable) => void, RegExp][] = [
    ['wrong schema_version', (p) => { p.schema_version = 2; }, /^schema_version: must be 1/],
    ['wrong game', (p) => { p.game = 'other'; }, /^game: must be "groups"/],
    ['missing puzzle_id', (p) => { delete p.puzzle_id; }, /^puzzle_id: is required/],
    ['blank puzzle_id', (p) => { p.puzzle_id = '  '; }, /^puzzle_id: must be a non-empty string/],
    ['unknown domain', (p) => { p.domain = 'sports'; }, /^domain: must be one of "moosii", "financial", "cancer"/],
    ['missing title', (p) => { delete p.title; }, /^title: is required/],
    ['unknown top-level field', (p) => { p.points = 10; }, /^puzzle: unknown field\(s\) "points"/],
    ['3 groups', (p) => { p.groups.pop(); }, /^groups: must contain exactly 4 groups/],
    ['5 groups', (p) => { p.groups.push(structuredClone(p.groups[0]!)); }, /^groups: must contain exactly 4 groups/],
    ['3 items in a group', (p) => { items(p, 1).pop(); }, /^groups\[1\]\.items: must contain exactly 4 items/],
    ['blank item', (p) => { items(p, 0)[2] = ''; }, /^groups\[0\]\.items\[2\]: must be a non-empty string/],
    ['missing label', (p) => { delete p.groups[2]!.label; }, /^groups\[2\]\.label: is required/],
    ['difficulty out of range', (p) => { p.groups[0]!.difficulty = 5; }, /^groups\[0\]\.difficulty: must be 1, 2, 3 or 4/],
    ['duplicate difficulty', (p) => { p.groups[3]!.difficulty = 1; }, /^groups\[3\]\.difficulty: difficulty 1 is already used by groups\[0\]/],
    ['source_lesson_ids not an array', (p) => { p.groups[0]!.source_lesson_ids = 'l-1'; }, /^groups\[0\]\.source_lesson_ids:/],
    ['makes_health_claim missing', (p) => { delete p.groups[0]!.makes_health_claim; }, /^groups\[0\]\.makes_health_claim: is required/],
    ['unknown group field', (p) => { p.groups[0]!.colour = 'blue'; }, /^groups\[0\]: unknown field\(s\) "colour"/],
    ['duplicate item within a group', (p) => { items(p, 0)[1] = 'Apple'; }, /^groups\[0\]\.items\[1\]: item "Apple" duplicates groups\[0\]\.items\[0\]/],
    ['duplicate item across groups', (p) => { items(p, 2)[0] = 'Chair'; }, /^groups\[2\]\.items\[0\]: item "Chair" duplicates groups\[1\]\.items\[0\]/],
    ['duplicate item differing only by case/space', (p) => { items(p, 3)[3] = ' apple'; }, /item " apple" duplicates groups\[0\]\.items\[0\]/],
  ];

  it.each(cases)('rejects %s', (_name, mutate, expected) => {
    const errors = errorsFor(broken(mutate));
    expect(errors.some((e) => expected.test(e)), `got: ${errors.join(' | ')}`).toBe(true);
  });

  it('reports every problem, not just the first', () => {
    const errors = errorsFor(broken((p) => { p.title = ''; p.domain = 'x'; }));
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('parsePuzzle', () => {
  it('returns the puzzle when valid', () => {
    expect(parsePuzzle(samplePuzzle()).puzzle_id).toBe('test-puzzle-1');
  });

  it('throws a readable error when invalid', () => {
    expect(() => parsePuzzle({})).toThrow(/Invalid puzzle:\n- /);
  });
});
