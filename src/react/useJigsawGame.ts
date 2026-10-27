import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  buildJigsawCompletionEvent,
  cellName,
  chooseJigsawGrid,
  createJigsawState,
  inPlaceCount,
  isJigsawComplete,
  jigsawMessageText,
  jigsawReducer,
  type JigsawAction,
  type JigsawCompletionEvent,
  type JigsawDifficulty,
  type JigsawGrid,
  type JigsawLayout,
  type JigsawMessage,
  type JigsawPuzzle,
  type JigsawState,
  type JigsawStatus,
} from '../core';

export interface UseJigsawGameOptions {
  /** The difficulty the player picked. Steps down automatically if tiles would be too small. */
  difficulty: JigsawDifficulty;
  /** Measured width of the board in px (the whole image is shown at this width). Must be > 0. */
  boardWidthPx: number;
  /** Smallest allowed tile side; defaults to 44. */
  minTilePx?: number;
  /** Called once when the game ends. The hook never sends the event anywhere itself. */
  onComplete?: (event: JigsawCompletionEvent) => void;
  /** Clock used for completed_local_date. Injectable for tests. */
  now?: () => Date;
}

export interface JigsawTile {
  /** Which piece of the picture this is (its correct cell). */
  tile: number;
  /** Where it is now. */
  cell: number;
  row: number;
  col: number;
  /** Which part of the image to show. */
  correctRow: number;
  correctCol: number;
  inPlace: boolean;
  selected: boolean;
  /** Accessible name, e.g. "Tile, row 2 column 3" (+ ", in place" / ", picked"). */
  label: string;
}

export interface JigsawGame {
  puzzle: JigsawPuzzle;
  /** Grid sizing, including tile size in px and whether the difficulty stepped down. */
  grid: JigsawGrid;
  status: JigsawStatus;
  isComplete: boolean;
  /** Tiles in a stable order (by tile), each with its current cell; renderers can animate swaps. */
  tiles: JigsawTile[];
  selectedCell: number | null;
  inPlace: number;
  total: number;
  moves: number;
  peeking: boolean;
  usedPeek: boolean;
  message: JigsawMessage | null;
  /** Player-facing text for `message`, suitable for an aria-live region. */
  messageText: string | null;
  completionEvent: JigsawCompletionEvent | null;
  tap: (cell: number) => void;
  togglePeek: () => void;
  /** "Finish it for me": completes the picture (outcome "revealed"). */
  reveal: () => void;
}

type HookAction = JigsawAction | { type: 'reset'; puzzle: JigsawPuzzle; layout: JigsawLayout };

function hookReducer(state: JigsawState, action: HookAction): JigsawState {
  return action.type === 'reset' ? createJigsawState(action.puzzle, action.layout) : jigsawReducer(state, action);
}

const systemNow = () => new Date();

export function useJigsawGame(puzzle: JigsawPuzzle, options: UseJigsawGameOptions): JigsawGame {
  const { difficulty, boardWidthPx, minTilePx, onComplete, now = systemNow } = options;
  const aspect = puzzle.image.width / puzzle.image.height;
  const grid = useMemo(
    () => chooseJigsawGrid({ aspect, difficulty, boardWidthPx, minTilePx }),
    [aspect, difficulty, boardWidthPx, minTilePx],
  );
  const layout: JigsawLayout = { difficulty: grid.difficulty, rows: grid.rows, cols: grid.cols };

  const [state, dispatch] = useReducer(hookReducer, undefined, () => createJigsawState(puzzle, layout));

  // A different puzzle, or a resize that changes the grid, starts a fresh game.
  const current = state.layout;
  if (
    state.puzzle.puzzle_id !== puzzle.puzzle_id ||
    current.difficulty !== layout.difficulty ||
    current.rows !== layout.rows ||
    current.cols !== layout.cols
  ) {
    dispatch({ type: 'reset', puzzle, layout });
  }

  const latest = useRef({ onComplete, now });
  useEffect(() => {
    latest.current = { onComplete, now };
  });

  // Once complete, the reducer returns the same state object for every action.
  const completionEvent = useMemo(
    () => (isJigsawComplete(state) ? buildJigsawCompletionEvent(state, latest.current.now()) : null),
    [state],
  );
  const reported = useRef<JigsawCompletionEvent | null>(null);
  useEffect(() => {
    if (completionEvent && reported.current !== completionEvent) {
      reported.current = completionEvent;
      latest.current.onComplete?.(completionEvent);
    }
  }, [completionEvent]);

  const tap = useCallback((cell: number) => dispatch({ type: 'tap', cell }), []);
  const togglePeek = useCallback(() => dispatch({ type: 'toggle_peek' }), []);
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), []);

  const tiles = useMemo<JigsawTile[]>(() => {
    const { cols } = state.layout;
    const out: JigsawTile[] = [];
    state.board.forEach((tile, cell) => {
      const inPlace = tile === cell;
      const selected = state.selected === cell;
      out.push({
        tile,
        cell,
        row: Math.floor(cell / cols),
        col: cell % cols,
        correctRow: Math.floor(tile / cols),
        correctCol: tile % cols,
        inPlace,
        selected,
        label: `Tile, ${cellName(cell, cols)}${inPlace ? ', in place' : selected ? ', picked' : ''}`,
      });
    });
    return out.sort((a, b) => a.tile - b.tile);
  }, [state.board, state.selected, state.layout]);

  return {
    puzzle: state.puzzle,
    grid,
    status: state.status,
    isComplete: isJigsawComplete(state),
    tiles,
    selectedCell: state.selected,
    inPlace: inPlaceCount(state),
    total: state.board.length,
    moves: state.moves,
    peeking: state.peeking,
    usedPeek: state.usedPeek,
    message: state.message,
    messageText: state.message ? jigsawMessageText(state.message, state) : null,
    completionEvent,
    tap,
    togglePeek,
    reveal,
  };
}
