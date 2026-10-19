import type { GroupsPuzzle } from '../types';

/** A known-good puzzle for unit tests. Not player content. */
export function samplePuzzle(): GroupsPuzzle {
  return {
    schema_version: 1,
    game: 'groups',
    puzzle_id: 'test-puzzle-1',
    domain: 'moosii',
    title: 'Test puzzle',
    groups: [
      { label: 'Fruit', items: ['Apple', 'Pear', 'Plum', 'Fig'], difficulty: 1, source_lesson_ids: [], makes_health_claim: false },
      { label: 'Furniture', items: ['Chair', 'Table', 'Sofa', 'Desk'], difficulty: 2, source_lesson_ids: ['l-1'], makes_health_claim: false },
      { label: 'Weather', items: ['Rain', 'Snow', 'Fog', 'Hail'], difficulty: 3, source_lesson_ids: [], makes_health_claim: false },
      { label: 'Metals', items: ['Iron', 'Tin', 'Gold', 'Zinc'], difficulty: 4, source_lesson_ids: [], makes_health_claim: false },
    ],
  };
}
