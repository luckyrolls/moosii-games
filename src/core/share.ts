import type { Difficulty, GroupsPuzzle } from './types';

/**
 * One square per difficulty. Deliberately avoids a red/green pairing; the share grid is a
 * shape-free medium, so squares only need to be distinguishable, not meaningful on their own.
 */
export const SHARE_SQUARES: Record<Difficulty, string> = {
  1: '🟧',
  2: '🟦',
  3: '🟪',
  4: '🟫',
};

/**
 * Share-grid text: one row of squares per guess, coloured by the group each guessed item
 * belongs to. Contains no item text, no labels and no score.
 */
export function buildShareGrid(puzzle: GroupsPuzzle, guesses: readonly (readonly number[])[]): string {
  return guesses
    .map((row) =>
      row
        .map((groupIndex) => {
          const group = puzzle.groups[groupIndex];
          if (!group) throw new Error(`Unknown group index ${groupIndex}`);
          return SHARE_SQUARES[group.difficulty];
        })
        .join(''),
    )
    .join('\n');
}
