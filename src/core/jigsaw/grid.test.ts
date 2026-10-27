import { describe, expect, it } from 'vitest';
import { chooseJigsawGrid, gridForTarget } from './grid';
import type { JigsawDifficulty } from './types';

describe('gridForTarget', () => {
  it.each([
    // aspect, target, rows x cols
    [1.6, 8, '2x3'],
    [1.6, 15, '3x5'],
    [1.6, 28, '4x6'],
    [1.8, 8, '2x4'],
    [1.8, 15, '3x5'],
    [1.8, 28, '4x7'],
    [2.1, 8, '2x4'],
    [2.1, 15, '3x6'],
    [2.1, 28, '4x8'],
  ])('aspect %s, ~%s tiles -> %s', (aspect, target, expected) => {
    const { rows, cols } = gridForTarget(aspect, target);
    expect(`${rows}x${cols}`).toBe(expected);
  });

  it('keeps tiles close to square', () => {
    for (const aspect of [1.6, 1.8, 2.1]) {
      for (const target of [8, 15, 28]) {
        const { rows, cols } = gridForTarget(aspect, target);
        const tileAspect = aspect / cols / (1 / rows); // tile width / tile height
        expect(tileAspect).toBeGreaterThan(0.85);
        expect(tileAspect).toBeLessThan(1.25);
      }
    }
  });
});

describe('chooseJigsawGrid', () => {
  // [aspect, boardWidthPx, requested] -> [difficulty used, rows x cols]
  const table: [number, number, JigsawDifficulty, JigsawDifficulty, string][] = [
    [1.6, 320, 'gentle', 'gentle', '2x3'],
    [1.6, 320, 'medium', 'medium', '3x5'],
    [1.6, 320, 'harder', 'harder', '4x6'],
    [1.6, 375, 'harder', 'harder', '4x6'],
    [1.6, 768, 'harder', 'harder', '4x6'],
    [1.8, 320, 'gentle', 'gentle', '2x4'],
    [1.8, 320, 'medium', 'medium', '3x5'],
    [1.8, 320, 'harder', 'harder', '4x7'], // 44.4 px tiles: just fits
    [1.8, 375, 'harder', 'harder', '4x7'],
    [1.8, 768, 'harder', 'harder', '4x7'],
    [2.1, 320, 'gentle', 'gentle', '2x4'],
    [2.1, 320, 'medium', 'medium', '3x6'],
    [2.1, 320, 'harder', 'medium', '3x6'], // 4x8 would be 38 px tall: steps down
    [2.1, 375, 'medium', 'medium', '3x6'],
    [2.1, 375, 'harder', 'harder', '4x8'], // 44.6 px
    [2.1, 768, 'harder', 'harder', '4x8'],
  ];

  it.each(table)('aspect %s at %spx, %s -> %s %s', (aspect, width, requested, used, size) => {
    const g = chooseJigsawGrid({ aspect, boardWidthPx: width, difficulty: requested });
    expect(g.requested).toBe(requested);
    expect(g.difficulty).toBe(used);
    expect(`${g.rows}x${g.cols}`).toBe(size);
    expect(g.fitsMinTile).toBe(true);
    expect(Math.min(g.tileWidthPx, g.tileHeightPx)).toBeGreaterThanOrEqual(44);
  });

  it('never makes a tile smaller than 44px at 320, 375 or 768 wide, for any aspect or difficulty', () => {
    for (const aspect of [1.6, 1.7, 1.78, 1.8, 1.9, 2.0, 2.1]) {
      for (const width of [320, 375, 768]) {
        for (const difficulty of ['gentle', 'medium', 'harder'] as const) {
          const g = chooseJigsawGrid({ aspect, boardWidthPx: width, difficulty });
          expect(Math.min(g.tileWidthPx, g.tileHeightPx), `${aspect} ${width} ${difficulty}`).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  it('steps down more than one level when needed', () => {
    const g = chooseJigsawGrid({ aspect: 2.1, boardWidthPx: 200, difficulty: 'harder' });
    expect(g).toMatchObject({ requested: 'harder', difficulty: 'gentle', rows: 2, cols: 4, fitsMinTile: true });
  });

  it('reports when even the gentlest grid is too small', () => {
    const g = chooseJigsawGrid({ aspect: 2.1, boardWidthPx: 150, difficulty: 'medium' });
    expect(g).toMatchObject({ difficulty: 'gentle', fitsMinTile: false });
  });

  it('honours a custom minimum tile size', () => {
    const g = chooseJigsawGrid({ aspect: 1.8, boardWidthPx: 375, difficulty: 'harder', minTilePx: 60 });
    expect(g.difficulty).toBe('medium'); // 4x7 = 52 px; 3x5 = 69 px
  });
});
