import type { WordPuzzle } from '../types';

/** A known-good word puzzle for unit tests. Not player content. */
export function sampleWordPuzzle(overrides: Partial<WordPuzzle> = {}): WordPuzzle {
  return {
    schema_version: 1,
    game: 'word',
    puzzle_id: 'test-word-1',
    domain: 'cancer',
    title: 'Test word',
    answer: 'PACING',
    hint: 'Spreading your energy out',
    takeaway: 'A test takeaway.',
    source_lesson_id: 'lesson-1',
    makes_health_claim: false,
    ...overrides,
  };
}
