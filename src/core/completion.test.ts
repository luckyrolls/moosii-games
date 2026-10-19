import { describe, expect, it } from 'vitest';
import { buildCompletionEvent, toLocalDateString } from './completion';
import { createInitialState, groupsReducer, type GroupsAction, type GroupsState } from './engine';
import { samplePuzzle } from './testing/samplePuzzle';

function guess(state: GroupsState, items: string[]): GroupsState {
  const actions: GroupsAction[] = [
    { type: 'clear_selection' },
    ...items.map((item): GroupsAction => ({ type: 'select', item })),
    { type: 'submit' },
  ];
  return actions.reduce(groupsReducer, state);
}

const when = new Date(2026, 9, 19, 23, 30); // local time, 19 Oct 2026

describe('toLocalDateString', () => {
  it('formats the local calendar date', () => {
    expect(toLocalDateString(when)).toBe('2026-10-19');
    expect(toLocalDateString(new Date(2027, 0, 5))).toBe('2027-01-05');
  });
});

describe('buildCompletionEvent', () => {
  it('is null while playing', () => {
    expect(buildCompletionEvent(createInitialState(samplePuzzle()), when)).toBeNull();
  });

  it('describes a solved game', () => {
    let s = createInitialState(samplePuzzle());
    s = guess(s, ['Iron', 'Tin', 'Gold', 'Zinc']);
    s = guess(s, ['Apple', 'Chair', 'Rain', 'Pear']);
    s = guess(s, ['Apple', 'Pear', 'Plum', 'Fig']);
    s = guess(s, ['Rain', 'Snow', 'Fog', 'Hail']);
    s = guess(s, ['Chair', 'Table', 'Sofa', 'Desk']);
    expect(buildCompletionEvent(s, when)).toEqual({
      schema_version: 1,
      game: 'groups',
      puzzle_id: 'test-puzzle-1',
      outcome: 'solved',
      mistakes: 1,
      solve_order: [3, 0, 2, 1],
      completed_local_date: '2026-10-19',
    });
  });

  it('describes a revealed game, listing only groups the player found', () => {
    let s = createInitialState(samplePuzzle());
    s = guess(s, ['Rain', 'Snow', 'Fog', 'Hail']);
    s = groupsReducer(s, { type: 'reveal' });
    const event = buildCompletionEvent(s, when);
    expect(event?.outcome).toBe('revealed');
    expect(event?.solve_order).toEqual([2]);
  });

  it('never carries points or any field beyond the contract', () => {
    const s = groupsReducer(createInitialState(samplePuzzle()), { type: 'reveal' });
    const event = buildCompletionEvent(s, when)!;
    expect(Object.keys(event).sort()).toEqual(
      ['completed_local_date', 'game', 'mistakes', 'outcome', 'puzzle_id', 'schema_version', 'solve_order'],
    );
    expect(JSON.stringify(event)).not.toMatch(/point|score|moosie/i);
  });
});
