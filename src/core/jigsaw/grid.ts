import { JIGSAW_DIFFICULTIES, JIGSAW_MIN_TILE_PX, JIGSAW_TARGET_TILES } from './constants';
import type { JigsawDifficulty } from './types';

export interface JigsawGrid {
  /** Difficulty the player asked for. */
  requested: JigsawDifficulty;
  /** Difficulty used: the same, or easier if tiles would have been too small. */
  difficulty: JigsawDifficulty;
  rows: number;
  cols: number;
  tileWidthPx: number;
  tileHeightPx: number;
  /** False only when even the gentlest grid is below minTilePx (very narrow boards). */
  fitsMinTile: boolean;
}

const MIN_ROWS = 2;
const MAX_ROWS = 10;

/**
 * Rows and columns for about `targetTiles` near-square tiles on an image of this aspect:
 * cols = round(rows * aspect), choosing the rows whose total is closest to the target
 * (ties go to fewer tiles).
 */
export function gridForTarget(aspect: number, targetTiles: number): { rows: number; cols: number } {
  let best = { rows: MIN_ROWS, cols: Math.max(2, Math.round(MIN_ROWS * aspect)) };
  let bestDiff = Infinity;
  for (let rows = MIN_ROWS; rows <= MAX_ROWS; rows++) {
    const cols = Math.max(2, Math.round(rows * aspect));
    const diff = Math.abs(rows * cols - targetTiles);
    if (diff < bestDiff || (diff === bestDiff && rows * cols < best.rows * best.cols)) {
      best = { rows, cols };
      bestDiff = diff;
    }
  }
  return best;
}

/** Tile size when a board `boardWidthPx` wide shows the whole image at its aspect. */
export function tileSize(boardWidthPx: number, aspect: number, rows: number, cols: number) {
  return { tileWidthPx: boardWidthPx / cols, tileHeightPx: boardWidthPx / aspect / rows };
}

/**
 * The grid to play. Starts at the requested difficulty and steps down to the next easier one
 * while tiles would be smaller than minTilePx on either side.
 */
export function chooseJigsawGrid(options: {
  aspect: number;
  difficulty: JigsawDifficulty;
  boardWidthPx: number;
  minTilePx?: number;
}): JigsawGrid {
  const { aspect, difficulty, boardWidthPx, minTilePx = JIGSAW_MIN_TILE_PX } = options;
  const start = JIGSAW_DIFFICULTIES.indexOf(difficulty);
  let last: JigsawGrid | null = null;
  for (let i = start; i >= 0; i--) {
    const d = JIGSAW_DIFFICULTIES[i] as JigsawDifficulty;
    const { rows, cols } = gridForTarget(aspect, JIGSAW_TARGET_TILES[d]);
    const size = tileSize(boardWidthPx, aspect, rows, cols);
    const fits = Math.min(size.tileWidthPx, size.tileHeightPx) >= minTilePx;
    last = { requested: difficulty, difficulty: d, rows, cols, ...size, fitsMinTile: fits };
    if (fits) return last;
  }
  return last as JigsawGrid;
}
