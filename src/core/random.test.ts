import { describe, expect, it } from 'vitest';
import { seededShuffle } from './random';
import { createInitialState } from './engine';
import { samplePuzzle } from './testing/samplePuzzle';

const items = Array.from({ length: 16 }, (_, i) => `item-${i}`);

describe('seededShuffle', () => {
  it('is deterministic for the same seed', () => {
    expect(seededShuffle(items, 'abc')).toEqual(seededShuffle(items, 'abc'));
  });

  it('differs for different seeds', () => {
    expect(seededShuffle(items, 'abc')).not.toEqual(seededShuffle(items, 'abd'));
  });

  it('is a permutation and does not mutate its input', () => {
    const copy = items.slice();
    const out = seededShuffle(items, 'xyz');
    expect(items).toEqual(copy);
    expect([...out].sort()).toEqual([...items].sort());
  });

  it('keeps a known order for a known seed', () => {
    // If this changes, every player's starting layout changes. Only update it deliberately.
    expect(seededShuffle(['a', 'b', 'c', 'd', 'e', 'f'], 'seed')).toMatchInlineSnapshot(`
      [
        "e",
        "d",
        "c",
        "f",
        "b",
        "a",
      ]
    `);
  });
});

describe('starting layout', () => {
  it('depends only on puzzle_id', () => {
    const a = createInitialState(samplePuzzle());
    const b = createInitialState(samplePuzzle(), { maxMistakes: 4 });
    expect(a.tiles).toEqual(b.tiles);

    const other = { ...samplePuzzle(), puzzle_id: 'another-id' };
    expect(createInitialState(other).tiles).not.toEqual(a.tiles);
  });

  it('contains all 16 items once each', () => {
    const state = createInitialState(samplePuzzle());
    expect(state.tiles).toHaveLength(16);
    expect(new Set(state.tiles).size).toBe(16);
  });
});
