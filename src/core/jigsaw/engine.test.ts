import { describe, expect, it } from 'vitest';
import { buildJigsawCompletionEvent } from './completion';
import {
  createJigsawState,
  inPlaceCount,
  initialJigsawBoard,
  jigsawReducer,
  type JigsawAction,
  type JigsawLayout,
  type JigsawState,
} from './engine';
import { cellName, jigsawMessageText } from './messages';
import { sampleJigsawPuzzle } from './testing/sampleJigsawPuzzle';

const medium: JigsawLayout = { difficulty: 'medium', rows: 3, cols: 5 };
const run = (s: JigsawState, ...actions: JigsawAction[]) => actions.reduce(jigsawReducer, s);
const tap = (cell: number): JigsawAction => ({ type: 'tap', cell });
const start = () => createJigsawState(sampleJigsawPuzzle(), medium);

/** Taps that put the tile belonging in `cell` into it (needs `cell` not in place). */
function place(s: JigsawState, cell: number): JigsawState {
  const from = s.board.indexOf(cell);
  return run(s, tap(cell), tap(from));
}

function solve(s: JigsawState): JigsawState {
  let state = s;
  for (let cell = 0; cell < state.board.length && state.status === 'playing'; cell++) {
    if (state.board[cell] !== cell) state = place(state, cell);
  }
  return state;
}

describe('initial board', () => {
  it('is deterministic for the same puzzle and difficulty', () => {
    expect(initialJigsawBoard('p', medium)).toEqual(initialJigsawBoard('p', medium));
  });

  it('differs between puzzles and between difficulties', () => {
    expect(initialJigsawBoard('p', medium)).not.toEqual(initialJigsawBoard('q', medium));
    const harder: JigsawLayout = { difficulty: 'harder', rows: 3, cols: 5 };
    expect(initialJigsawBoard('p', medium)).not.toEqual(initialJigsawBoard('p', harder));
  });

  it('is a permutation with no tile starting in its correct cell, across many seeds and sizes', () => {
    const layouts: JigsawLayout[] = [
      { difficulty: 'gentle', rows: 2, cols: 3 },
      { difficulty: 'gentle', rows: 2, cols: 4 },
      { difficulty: 'medium', rows: 3, cols: 5 },
      { difficulty: 'medium', rows: 3, cols: 6 },
      { difficulty: 'harder', rows: 4, cols: 7 },
      { difficulty: 'harder', rows: 4, cols: 8 },
    ];
    for (const layout of layouts) {
      for (let i = 0; i < 200; i++) {
        const board = initialJigsawBoard(`puzzle-${i}`, layout);
        const n = layout.rows * layout.cols;
        expect([...board].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, k) => k));
        expect(board.some((tile, cell) => tile === cell)).toBe(false);
      }
    }
  });

  it('keeps a known layout for a known seed', () => {
    // If this changes, every player's starting board changes. Only update it deliberately.
    expect(initialJigsawBoard('fixture-jigsaw-moosii-01', { difficulty: 'gentle', rows: 2, cols: 4 })).toMatchInlineSnapshot(`
      [
        7,
        2,
        3,
        4,
        0,
        6,
        5,
        1,
      ]
    `);
  });
});

describe('engine', () => {
  it('starts with nothing selected and nothing in place', () => {
    const s = start();
    expect(s).toMatchObject({ selected: null, moves: 0, peeking: false, usedPeek: false, status: 'playing' });
    expect(inPlaceCount(s)).toBe(0);
  });

  it('selects a tile, and tapping it again deselects it', () => {
    let s = run(start(), tap(3));
    expect(s.selected).toBe(3);
    expect(jigsawMessageText(s.message!, s)).toBe('Picked the tile at row 1 column 4. Choose another tile to swap it with.');
    s = run(s, tap(3));
    expect(s.selected).toBeNull();
    expect(s.message).toEqual({ kind: 'deselected' });
    expect(s.moves).toBe(0);
  });

  it('swaps the selected tile with the next one tapped and counts a move', () => {
    const s0 = start();
    const s = run(s0, tap(0), tap(7));
    expect(s.board[0]).toBe(s0.board[7]);
    expect(s.board[7]).toBe(s0.board[0]);
    expect(s.selected).toBeNull();
    expect(s.moves).toBe(1);
    expect(s.message).toMatchObject({ kind: 'swapped', a: 0, b: 7 });
  });

  it('locks a tile once it is in its correct cell', () => {
    let s = place(start(), 5);
    expect(s.board[5]).toBe(5);
    expect(s.message).toMatchObject({ kind: 'swapped' });
    expect(jigsawMessageText(s.message!, s)).toMatch(/now in place\.$/);
    const before = s;
    s = run(s, tap(5));
    expect(s.selected).toBeNull();
    expect(s.message).toEqual({ kind: 'locked', cell: 5 });
    expect(jigsawMessageText(s.message!, s)).toBe('That tile is already in its place.');
    // A locked tile can't be the second tile of a swap either.
    const other = before.board.findIndex((t, c) => t !== c);
    s = run(before, tap(other), tap(5));
    expect(s.board[5]).toBe(5);
    expect(s.selected).toBe(other);
  });

  it('ignores taps outside the board', () => {
    const s = start();
    expect(run(s, tap(-1))).toBe(s);
    expect(run(s, tap(15))).toBe(s);
  });

  it('peek toggles and is recorded once used', () => {
    let s = run(start(), { type: 'toggle_peek' });
    expect(s).toMatchObject({ peeking: true, usedPeek: true });
    s = run(s, { type: 'toggle_peek' });
    expect(s).toMatchObject({ peeking: false, usedPeek: true });
  });

  it('solves when every tile is in place', () => {
    const s = solve(start());
    expect(s.status).toBe('solved');
    expect(inPlaceCount(s)).toBe(15);
    expect(s.moves).toBeGreaterThan(0);
    expect(s.moves).toBeLessThanOrEqual(14);
    expect(jigsawMessageText(s.message!, s)).toBe('The picture is complete: Test picture.');
  });

  it('"Finish it for me" ends as revealed with the picture complete', () => {
    const s = run(start(), tap(0), { type: 'toggle_peek' }, { type: 'reveal' });
    expect(s.status).toBe('revealed');
    expect(s.board).toEqual(Array.from({ length: 15 }, (_, i) => i));
    expect(s).toMatchObject({ selected: null, peeking: false, usedPeek: true });
  });

  it('ignores every action once complete', () => {
    const done = run(start(), { type: 'reveal' });
    for (const action of [tap(1), { type: 'toggle_peek' }, { type: 'reveal' }] satisfies JigsawAction[]) {
      expect(jigsawReducer(done, action)).toBe(done);
    }
  });

  it('names cells by row and column', () => {
    expect(cellName(0, 5)).toBe('row 1 column 1');
    expect(cellName(7, 5)).toBe('row 2 column 3');
  });
});

describe('buildJigsawCompletionEvent', () => {
  const when = new Date(2026, 9, 27, 10, 0);

  it('is null while playing', () => {
    expect(buildJigsawCompletionEvent(start(), when)).toBeNull();
  });

  it('describes a solved game', () => {
    const s = solve(run(start(), { type: 'toggle_peek' }, { type: 'toggle_peek' }));
    expect(buildJigsawCompletionEvent(s, when)).toEqual({
      schema_version: 1,
      game: 'jigsaw',
      puzzle_id: 'test-jigsaw-1',
      difficulty: 'medium',
      rows: 3,
      cols: 5,
      outcome: 'solved',
      moves: s.moves,
      used_peek: true,
      completed_local_date: '2026-10-27',
    });
  });

  it('describes a revealed game, with no points', () => {
    const s = run(start(), tap(0), tap(1), { type: 'reveal' });
    const event = buildJigsawCompletionEvent(s, when)!;
    expect(event).toMatchObject({ outcome: 'revealed', moves: 1, used_peek: false });
    expect(Object.keys(event).sort()).toEqual(
      ['cols', 'completed_local_date', 'difficulty', 'game', 'moves', 'outcome', 'puzzle_id', 'rows', 'schema_version', 'used_peek'],
    );
    expect(JSON.stringify(event)).not.toMatch(/point|score|moosie/i);
  });
});
