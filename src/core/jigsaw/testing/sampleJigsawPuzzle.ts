import type { JigsawPuzzle } from '../types';

/** A known-good jigsaw puzzle for unit tests. Not player content. */
export function sampleJigsawPuzzle(overrides: Partial<JigsawPuzzle> = {}): JigsawPuzzle {
  return {
    schema_version: 1,
    game: 'jigsaw',
    puzzle_id: 'test-jigsaw-1',
    domain: 'moosii',
    title: 'Test picture',
    image: { src: 'images/test.png', width: 1600, height: 900, alt: 'A test picture.' },
    source_lesson_id: 'lesson-1',
    ...overrides,
  };
}
