import { describe, expect, it } from 'vitest';
import { buildShareGrid } from './share';
import { createInitialState, groupsReducer, type GroupsState } from './engine';
import { samplePuzzle } from './testing/samplePuzzle';

function guess(state: GroupsState, items: string[]): GroupsState {
  let s = groupsReducer(state, { type: 'clear_selection' });
  s = items.reduce((acc, item) => groupsReducer(acc, { type: 'select', item }), s);
  return groupsReducer(s, { type: 'submit' });
}

describe('buildShareGrid', () => {
  it('renders one row of squares per guess, in guess order', () => {
    const puzzle = samplePuzzle();
    let s = createInitialState(puzzle);
    s = guess(s, ['Apple', 'Pear', 'Plum', 'Fig']);
    s = guess(s, ['Chair', 'Table', 'Sofa', 'Rain']);
    s = guess(s, ['Chair', 'Table', 'Sofa', 'Desk']);
    expect(buildShareGrid(puzzle, s.guesses)).toBe(
      '\u{1F7E7}\u{1F7E7}\u{1F7E7}\u{1F7E7}\n' +
        '\u{1F7E6}\u{1F7E6}\u{1F7E6}\u{1F7EA}\n' +
        '\u{1F7E6}\u{1F7E6}\u{1F7E6}\u{1F7E6}',
    );
  });

  it('contains no item text, labels, title, digits or letters', () => {
    const puzzle = samplePuzzle();
    let s = createInitialState(puzzle);
    s = guess(s, ['Apple', 'Chair', 'Rain', 'Iron']);
    s = guess(s, ['Iron', 'Tin', 'Gold', 'Zinc']);
    const text = buildShareGrid(puzzle, s.guesses);
    const words = [puzzle.title, ...puzzle.groups.flatMap((g) => [g.label, ...g.items])];
    for (const w of words) expect(text).not.toContain(w);
    expect(text).not.toMatch(/[0-9A-Za-z]/);
    expect(text.split('\n')).toHaveLength(2);
  });

  it('is empty before any guess', () => {
    expect(buildShareGrid(samplePuzzle(), [])).toBe('');
  });
});
