import { describe, expect, it } from 'vitest';
import { DOMAINS, validatePuzzle } from '../../core';
import { fixtures } from './fixtures';

const playable = fixtures.filter((f) => !f.path.startsWith('fixtures/invalid/'));
const invalid = fixtures.filter((f) => f.path.startsWith('fixtures/invalid/'));

describe('fixtures', () => {
  it('has at least one playable fixture per domain', () => {
    const domains = new Set(playable.map((f) => (f.data as { domain: string }).domain));
    for (const domain of DOMAINS) expect(domains, `no fixture for "${domain}"`).toContain(domain);
  });

  it.each(playable.map((f) => [f.path, f.data] as const))(
    '%s is valid, marked as unreviewed and makes no health claims',
    (_path, data) => {
      const result = validatePuzzle(data);
      if (!result.ok) throw new Error(result.errors.join('\n'));
      expect(result.puzzle.title).toContain('FIXTURE — NOT REVIEWED CONTENT');
      expect(result.puzzle.groups.every((g) => g.makes_health_claim === false)).toBe(true);
    },
  );

  it('the invalid example fails with readable errors', () => {
    expect(invalid.map((f) => f.path)).toEqual(['fixtures/invalid/broken-example.json']);
    const result = validatePuzzle(invalid[0]!.data);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'groups: must contain exactly 4 groups',
        'groups[0].items: must contain exactly 4 items',
      ]),
    );
  });
});
