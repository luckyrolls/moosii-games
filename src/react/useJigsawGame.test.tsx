// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { JigsawPuzzle } from '../core';
import { sampleJigsawPuzzle } from '../core/jigsaw/testing/sampleJigsawPuzzle';
import { useJigsawGame, type JigsawGame, type UseJigsawGameOptions } from './useJigsawGame';

const fixedNow = () => new Date(2026, 9, 27, 9, 0);

function setup(options: Partial<UseJigsawGameOptions> = {}, puzzle: JigsawPuzzle = sampleJigsawPuzzle()) {
  return renderHook<JigsawGame, { puzzle: JigsawPuzzle; options: UseJigsawGameOptions }>(
    (props) => useJigsawGame(props.puzzle, props.options),
    { initialProps: { puzzle, options: { difficulty: 'medium', boardWidthPx: 343, now: fixedNow, ...options } } },
  );
}

/** Put every tile in place by tapping. */
function solve(get: () => JigsawGame) {
  for (let cell = 0; cell < get().total; cell++) {
    if (get().isComplete) return;
    const here = get().tiles.find((t) => t.cell === cell)!;
    if (here.inPlace) continue;
    const from = get().tiles.find((t) => t.tile === cell)!.cell;
    act(() => get().tap(cell));
    act(() => get().tap(from));
  }
}

describe('useJigsawGame', () => {
  it('picks the grid from difficulty and board width (1600x900 at 343px)', () => {
    const { result } = setup({ difficulty: 'harder' });
    expect(result.current.grid).toMatchObject({ requested: 'harder', difficulty: 'harder', rows: 4, cols: 7, fitsMinTile: true });
    expect(Math.min(result.current.grid.tileWidthPx, result.current.grid.tileHeightPx)).toBeGreaterThanOrEqual(44);
    expect(result.current.total).toBe(28);
    expect(result.current.inPlace).toBe(0);
  });

  it('steps down on a narrow board', () => {
    const { result } = setup({ difficulty: 'harder', boardWidthPx: 280 });
    expect(result.current.grid).toMatchObject({ requested: 'harder', difficulty: 'medium', rows: 3, cols: 5 });
  });

  it('exposes tiles with accessible names and image positions', () => {
    const { result } = setup();
    const t = result.current.tiles[0]!;
    expect(t.tile).toBe(0);
    expect(t.correctRow).toBe(0);
    expect(t.correctCol).toBe(0);
    expect(t.label).toMatch(/^Tile, row \d column \d$/);
  });

  it('selects, deselects and swaps, announcing each', () => {
    const { result } = setup();
    act(() => result.current.tap(0));
    expect(result.current.selectedCell).toBe(0);
    expect(result.current.tiles.find((t) => t.cell === 0)!.label).toBe('Tile, row 1 column 1, picked');
    act(() => result.current.tap(0));
    expect(result.current.selectedCell).toBeNull();
    expect(result.current.messageText).toBe('Tile put back.');
    act(() => result.current.tap(0));
    act(() => result.current.tap(6));
    expect(result.current.moves).toBe(1);
    expect(result.current.messageText).toMatch(/^Swapped row 1 column 1 and row 2 column 2\./);
  });

  it('records peek and fires onComplete once with no points', () => {
    const onComplete = vi.fn();
    const { result, rerender } = setup({ onComplete });
    act(() => result.current.togglePeek());
    expect(result.current.peeking).toBe(true);
    act(() => result.current.togglePeek());
    solve(() => result.current);
    expect(result.current.status).toBe('solved');
    expect(onComplete).toHaveBeenCalledTimes(1);
    const event = onComplete.mock.calls[0]![0];
    expect(event).toMatchObject({ game: 'jigsaw', difficulty: 'medium', rows: 3, cols: 5, outcome: 'solved', used_peek: true, completed_local_date: '2026-10-27' });
    expect(JSON.stringify(event)).not.toMatch(/point|score/i);
    rerender({ puzzle: sampleJigsawPuzzle(), options: { difficulty: 'medium', boardWidthPx: 343, now: fixedNow, onComplete } });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('"Finish it for me" reveals the picture', () => {
    const { result } = setup();
    act(() => result.current.reveal());
    expect(result.current).toMatchObject({ status: 'revealed', inPlace: 15 });
    expect(result.current.completionEvent?.outcome).toBe('revealed');
  });

  it('keeps progress on a resize with the same grid, and restarts when the grid changes', () => {
    const { result, rerender } = setup({ difficulty: 'medium', boardWidthPx: 343 });
    act(() => result.current.tap(0));
    act(() => result.current.tap(1));
    rerender({ puzzle: sampleJigsawPuzzle(), options: { difficulty: 'medium', boardWidthPx: 360, now: fixedNow } });
    expect(result.current.moves).toBe(1);
    rerender({ puzzle: sampleJigsawPuzzle(), options: { difficulty: 'gentle', boardWidthPx: 360, now: fixedNow } });
    expect(result.current).toMatchObject({ moves: 0, total: 8 });
  });
});
