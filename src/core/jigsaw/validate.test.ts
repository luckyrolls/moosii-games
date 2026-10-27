import { describe, expect, it } from 'vitest';
import { validateJigsawPuzzle } from './validate';
import { sampleJigsawPuzzle } from './testing/sampleJigsawPuzzle';

type Mutable = Record<string, unknown> & { image: Record<string, unknown> };

function broken(mutate: (p: Mutable) => void): unknown {
  const p = structuredClone(sampleJigsawPuzzle()) as unknown as Mutable;
  mutate(p);
  return p;
}

function errorsFor(input: unknown): string[] {
  const r = validateJigsawPuzzle(input);
  if (r.ok) throw new Error('expected validation to fail');
  return r.errors;
}

describe('validateJigsawPuzzle', () => {
  it('accepts a well-formed puzzle', () => {
    expect(validateJigsawPuzzle(sampleJigsawPuzzle())).toEqual({ ok: true, puzzle: sampleJigsawPuzzle() });
  });

  it.each([
    ['aspect 1.6 exactly', 1920, 1200],
    ['aspect 2.1 exactly', 2100, 1000],
    ['long edge 1200 exactly', 1200, 600],
  ])('accepts %s', (_name, width, height) => {
    const p = sampleJigsawPuzzle();
    p.image = { ...p.image, width, height };
    expect(validateJigsawPuzzle(p).ok).toBe(true);
  });

  const cases: [string, (p: Mutable) => void, RegExp][] = [
    ['wrong game', (p) => { p.game = 'word'; }, /^game: must be "jigsaw"/],
    ['wrong schema_version', (p) => { p.schema_version = 2; }, /^schema_version: must be 1/],
    ['unknown domain', (p) => { p.domain = 'sports'; }, /^domain: must be one of/],
    ['title with edge whitespace', (p) => { p.title = ' Test'; }, /^title: must not start or end with whitespace/],
    ['missing source_lesson_id', (p) => { delete p.source_lesson_id; }, /^source_lesson_id: is required/],
    ['activity source instead of lesson', (p) => { delete p.source_lesson_id; p.source_activity_id = 'a'; }, /unknown field\(s\) "source_activity_id"/],
    ['unknown top-level field', (p) => { p.points = 1; }, /^puzzle: unknown field\(s\) "points"/],
    ['missing image', (p) => { delete (p as Record<string, unknown>).image; }, /^image: is required/],
    ['unknown image field', (p) => { p.image.caption = 'x'; }, /^image: unknown field\(s\) "caption"/],
    ['blank src', (p) => { p.image.src = ''; }, /^image\.src: must be a non-empty string/],
    ['fractional width', (p) => { p.image.width = 1600.5; }, /^image\.width: must be a whole number of pixels/],
    ['zero height', (p) => { p.image.height = 0; }, /^image\.height: must be greater than 0/],
    ['negative width', (p) => { p.image.width = -1600; }, /^image\.width: must be greater than 0/],
    ['width as a string', (p) => { p.image.width = '1600'; }, /^image\.width: must be a whole number of pixels/],
    ['too square (aspect 1.2)', (p) => { p.image.width = 1200; p.image.height = 1000; }, /^image: aspect ratio \(width \/ height\) must be between 1\.6 and 2\.1, got 1\.20/],
    ['too wide (aspect 2.5)', (p) => { p.image.width = 2500; p.image.height = 1000; }, /^image: aspect ratio .* got 2\.50/],
    ['portrait', (p) => { p.image.width = 900; p.image.height = 1600; }, /^image: aspect ratio .* got 0\.56/],
    ['long edge too short', (p) => { p.image.width = 1000; p.image.height = 560; }, /^image: the long edge must be at least 1200 px, got 1000/],
    ['blank alt', (p) => { p.image.alt = '  '; }, /^image\.alt: must be a non-empty string/],
    ['alt with trailing whitespace', (p) => { p.image.alt = 'A picture. '; }, /^image\.alt: must not start or end with whitespace/],
    ['missing alt', (p) => { delete p.image.alt; }, /^image\.alt: is required/],
  ];

  it.each(cases)('rejects %s', (_name, mutate, expected) => {
    const errors = errorsFor(broken(mutate));
    expect(errors.some((e) => expected.test(e)), `got: ${errors.join(' | ')}`).toBe(true);
  });
});
