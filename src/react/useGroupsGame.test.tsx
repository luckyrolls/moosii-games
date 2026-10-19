// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { samplePuzzle } from '../core/testing/samplePuzzle';
import type { GroupsPuzzle } from '../core';
import { useGroupsGame, type GroupsGame, type UseGroupsGameOptions } from './useGroupsGame';

const FRUIT = ['Apple', 'Pear', 'Plum', 'Fig'];
const FURNITURE = ['Chair', 'Table', 'Sofa', 'Desk'];
const WEATHER = ['Rain', 'Snow', 'Fog', 'Hail'];
const METALS = ['Iron', 'Tin', 'Gold', 'Zinc'];
const fixedNow = () => new Date(2026, 9, 19, 9, 0);

function setup(options: UseGroupsGameOptions = {}, puzzle: GroupsPuzzle = samplePuzzle()) {
  return renderHook((props: { puzzle: GroupsPuzzle; options: UseGroupsGameOptions }) =>
    useGroupsGame(props.puzzle, props.options), {
    initialProps: { puzzle, options: { now: fixedNow, ...options } },
  });
}

function guess(get: () => GroupsGame, items: string[]) {
  act(() => get().clearSelection());
  for (const item of items) act(() => get().select(item));
  act(() => get().submit());
}

describe('useGroupsGame', () => {
  it('starts with the seeded layout and nothing selected', () => {
    const { result } = setup();
    expect(result.current.tiles).toHaveLength(16);
    expect(result.current.selected).toEqual([]);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.maxMistakes).toBeNull();
    expect(result.current.mistakesRemaining).toBeNull();
    expect(result.current.completionEvent).toBeNull();
    expect(result.current.shareText).toBeNull();
  });

  it('exposes select, deselect, toggle and canSubmit', () => {
    const { result } = setup();
    act(() => result.current.select('Apple'));
    act(() => result.current.toggle('Pear'));
    act(() => result.current.deselect('Apple'));
    expect(result.current.selected).toEqual(['Pear']);
    expect(result.current.canSubmit).toBe(false);
    for (const item of ['Plum', 'Fig', 'Apple']) act(() => result.current.select(item));
    expect(result.current.canSubmit).toBe(true);
  });

  it('reports one away as a message with text', () => {
    const { result } = setup();
    guess(() => result.current, ['Apple', 'Pear', 'Plum', 'Chair']);
    expect(result.current.message).toEqual({ kind: 'one_away' });
    expect(result.current.messageText).toMatch(/three of those four/i);
    expect(result.current.mistakes).toBe(1);
  });

  it('shuffles without changing the set of tiles', () => {
    const { result } = setup();
    const before = result.current.tiles;
    act(() => result.current.shuffle());
    expect(result.current.tiles).not.toEqual(before);
    expect([...result.current.tiles].sort()).toEqual([...before].sort());
  });

  it('calls onComplete exactly once with the event, and exposes share text', () => {
    const onComplete = vi.fn();
    const { result, rerender } = setup({ onComplete });
    guess(() => result.current, FRUIT);
    guess(() => result.current, ['Chair', 'Table', 'Sofa', 'Rain']);
    guess(() => result.current, FURNITURE);
    guess(() => result.current, WEATHER);
    expect(onComplete).not.toHaveBeenCalled();
    guess(() => result.current, METALS);

    const expected = {
      schema_version: 1,
      game: 'groups',
      puzzle_id: 'test-puzzle-1',
      outcome: 'solved',
      mistakes: 1,
      solve_order: [0, 1, 2, 3],
      completed_local_date: '2026-10-19',
    };
    expect(result.current.isComplete).toBe(true);
    expect(result.current.completionEvent).toEqual(expected);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(expected);
    expect(result.current.shareText?.split('\n')).toHaveLength(5);
    expect(result.current.groups.map((g) => g.foundByPlayer)).toEqual([true, true, true, true]);

    // Re-rendering with a new callback identity must not fire again.
    rerender({ puzzle: samplePuzzle(), options: { now: fixedNow, onComplete } });
    act(() => result.current.submit());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('capped mode reveals the remaining groups when out of mistakes', () => {
    const onComplete = vi.fn();
    const { result } = setup({ maxMistakes: 1, onComplete });
    expect(result.current.mistakesRemaining).toBe(1);
    guess(() => result.current, WEATHER);
    guess(() => result.current, ['Apple', 'Chair', 'Iron', 'Pear']);
    expect(result.current.status).toBe('revealed');
    expect(result.current.mistakesRemaining).toBe(0);
    expect(result.current.groups.map((g) => [g.group.label, g.foundByPlayer])).toEqual([
      ['Weather', true],
      ['Fruit', false],
      ['Furniture', false],
      ['Metals', false],
    ]);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'revealed', solve_order: [2] }));
  });

  it('the player can reveal in relaxed mode', () => {
    const { result } = setup();
    act(() => result.current.reveal());
    expect(result.current.completionEvent?.outcome).toBe('revealed');
    expect(result.current.shareText).toBe('');
  });

  it('starts over when given a different puzzle', () => {
    const { result, rerender } = setup();
    act(() => result.current.select('Apple'));
    const other = { ...samplePuzzle(), puzzle_id: 'other-puzzle' };
    rerender({ puzzle: other, options: { now: fixedNow } });
    expect(result.current.puzzle.puzzle_id).toBe('other-puzzle');
    expect(result.current.selected).toEqual([]);
  });

  it('does not reset when re-rendered with an equal puzzle object', () => {
    const { result, rerender } = setup();
    act(() => result.current.select('Apple'));
    rerender({ puzzle: samplePuzzle(), options: { now: fixedNow } });
    expect(result.current.selected).toEqual(['Apple']);
  });
});
