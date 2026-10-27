import { describe, expect, it } from 'vitest';
import { DOMAINS, JIGSAW_MAX_ASPECT, JIGSAW_MIN_ASPECT, validateJigsawPuzzle } from '../../core';
import { fixtures, jigsawFixtures, jigsawImageUrls, wordFixtures } from './fixtures';

const playable = jigsawFixtures.filter((f) => !f.path.includes('/invalid/'));
const invalid = jigsawFixtures.filter((f) => f.path.includes('/invalid/'));

describe('jigsaw fixtures', () => {
  it('has exactly one playable fixture per domain', () => {
    expect(playable.map((f) => (f.data as { domain: string }).domain).sort()).toEqual([...DOMAINS].sort());
  });

  it.each(playable.map((f) => [f.path, f.data] as const))('%s is valid, marked, and its image exists', (_path, data) => {
    const r = validateJigsawPuzzle(data);
    if (!r.ok) throw new Error(r.errors.join('\n'));
    const p = r.puzzle;
    expect(p.title).toContain('(FIXTURE — NOT REVIEWED CONTENT)');
    expect(jigsawImageUrls[p.image.src], `missing ${p.image.src}`).toBeTruthy();
    const aspect = p.image.width / p.image.height;
    expect(aspect).toBeGreaterThanOrEqual(JIGSAW_MIN_ASPECT);
    expect(aspect).toBeLessThanOrEqual(JIGSAW_MAX_ASPECT);
  });

  it('the invalid example fails on its aspect ratio', () => {
    expect(invalid.map((f) => f.path)).toEqual(['fixtures/jigsaw/invalid/broken-jigsaw-example.json']);
    const r = validateJigsawPuzzle(invalid[0]!.data);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual(['image: aspect ratio (width / height) must be between 1.6 and 2.1, got 1.20']);
  });

  it('jigsaw fixtures never leak into the other pickers', () => {
    expect([...fixtures, ...wordFixtures].some((f) => f.path.includes('/jigsaw/'))).toBe(false);
  });
});
