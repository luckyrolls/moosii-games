import { seededShuffle } from '../random';
import type { JigsawDifficulty, JigsawPuzzle } from './types';

export interface JigsawLayout {
  difficulty: JigsawDifficulty;
  rows: number;
  cols: number;
}

export type JigsawStatus = 'playing' | 'solved' | 'revealed';

export type JigsawMessage =
  | { kind: 'selected'; cell: number }
  | { kind: 'deselected' }
  | { kind: 'locked'; cell: number }
  | { kind: 'swapped'; a: number; b: number; nowInPlace: number }
  | { kind: 'solved' }
  | { kind: 'revealed' };

export interface JigsawState {
  puzzle: JigsawPuzzle;
  layout: JigsawLayout;
  /**
   * board[cell] = the tile currently in that cell. Tile ids are their correct cell, so a cell
   * is in place (locked) when board[cell] === cell. Cells count row by row from 0.
   */
  board: number[];
  /** Cell of the selected tile, or null. */
  selected: number | null;
  moves: number;
  peeking: boolean;
  usedPeek: boolean;
  status: JigsawStatus;
  message: JigsawMessage | null;
}

export type JigsawAction =
  | { type: 'tap'; cell: number }
  | { type: 'toggle_peek' }
  /** "Finish it for me": ends the game with outcome "revealed". */
  | { type: 'reveal' };

/** Seed for the starting layout: the same puzzle and difficulty always start the same way. */
export function jigsawSeed(puzzleId: string, difficulty: JigsawDifficulty): string {
  return `${puzzleId}:${difficulty}`;
}

const MAX_SHUFFLE_TRIES = 50;

/**
 * A seeded starting board where no tile is in its correct cell. Tries successive seeds until the
 * shuffle has no tile in place (about 1 in 3 do), then falls back to a one-step rotation.
 */
export function initialJigsawBoard(puzzleId: string, layout: JigsawLayout): number[] {
  const n = layout.rows * layout.cols;
  const identity = Array.from({ length: n }, (_, i) => i);
  const seed = jigsawSeed(puzzleId, layout.difficulty);
  for (let k = 0; k < MAX_SHUFFLE_TRIES; k++) {
    const board = seededShuffle(identity, `${seed}#${k}`);
    if (board.every((tile, cell) => tile !== cell)) return board;
  }
  return identity.map((_, i) => (i + 1) % n);
}

export function createJigsawState(puzzle: JigsawPuzzle, layout: JigsawLayout): JigsawState {
  return {
    puzzle,
    layout,
    board: initialJigsawBoard(puzzle.puzzle_id, layout),
    selected: null,
    moves: 0,
    peeking: false,
    usedPeek: false,
    status: 'playing',
    message: null,
  };
}

export function isJigsawComplete(state: JigsawState): boolean {
  return state.status !== 'playing';
}

export function isInPlace(state: JigsawState, cell: number): boolean {
  return state.board[cell] === cell;
}

export function inPlaceCount(state: JigsawState): number {
  return state.board.filter((tile, cell) => tile === cell).length;
}

function tap(state: JigsawState, cell: number): JigsawState {
  if (cell < 0 || cell >= state.board.length) return state;
  if (isInPlace(state, cell)) return { ...state, message: { kind: 'locked', cell } };
  if (state.selected === null) return { ...state, selected: cell, message: { kind: 'selected', cell } };
  if (state.selected === cell) return { ...state, selected: null, message: { kind: 'deselected' } };

  const a = state.selected;
  const board = state.board.slice();
  [board[a], board[cell]] = [board[cell] as number, board[a] as number];
  const nowInPlace = (board[a] === a ? 1 : 0) + (board[cell] === cell ? 1 : 0);
  const solved = board.every((tile, i) => tile === i);
  return {
    ...state,
    board,
    selected: null,
    moves: state.moves + 1,
    status: solved ? 'solved' : 'playing',
    peeking: solved ? false : state.peeking,
    message: solved ? { kind: 'solved' } : { kind: 'swapped', a, b: cell, nowInPlace },
  };
}

/** Pure reducer. Every action is a no-op once the game is complete. */
export function jigsawReducer(state: JigsawState, action: JigsawAction): JigsawState {
  if (isJigsawComplete(state)) return state;
  switch (action.type) {
    case 'tap':
      return tap(state, action.cell);
    case 'toggle_peek':
      return { ...state, peeking: !state.peeking, usedPeek: state.usedPeek || !state.peeking };
    case 'reveal':
      return {
        ...state,
        board: state.board.map((_, i) => i),
        selected: null,
        peeking: false,
        status: 'revealed',
        message: { kind: 'revealed' },
      };
  }
}
