import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  groupsReducer,
  isComplete,
  unsolvedGroups,
  type GroupsAction,
  type GroupsState,
} from './engine';
import { messageText } from './messages';
import { samplePuzzle } from './testing/samplePuzzle';

const FRUIT = ['Apple', 'Pear', 'Plum', 'Fig'];
const FURNITURE = ['Chair', 'Table', 'Sofa', 'Desk'];
const WEATHER = ['Rain', 'Snow', 'Fog', 'Hail'];
const METALS = ['Iron', 'Tin', 'Gold', 'Zinc'];
const ONE_AWAY = ['Apple', 'Pear', 'Plum', 'Chair'];
const SCATTERED = ['Apple', 'Chair', 'Rain', 'Iron'];

function run(state: GroupsState, ...actions: GroupsAction[]): GroupsState {
  return actions.reduce(groupsReducer, state);
}

function guess(state: GroupsState, items: string[]): GroupsState {
  return run(
    state,
    { type: 'clear_selection' },
    ...items.map((item): GroupsAction => ({ type: 'select', item })),
    { type: 'submit' },
  );
}

const start = (maxMistakes: number | null = null) => createInitialState(samplePuzzle(), { maxMistakes });

describe('selection', () => {
  it('selects and deselects tiles', () => {
    let s = run(start(), { type: 'select', item: 'Apple' }, { type: 'select', item: 'Rain' });
    expect(s.selected).toEqual(['Apple', 'Rain']);
    s = run(s, { type: 'deselect', item: 'Apple' });
    expect(s.selected).toEqual(['Rain']);
    s = run(s, { type: 'toggle', item: 'Rain' }, { type: 'toggle', item: 'Fog' });
    expect(s.selected).toEqual(['Fog']);
  });

  it('caps the selection at four', () => {
    const s = run(start(), ...[...FRUIT, 'Chair'].map((item): GroupsAction => ({ type: 'select', item })));
    expect(s.selected).toEqual(FRUIT);
  });

  it('ignores unknown items and double selects', () => {
    const s = run(start(), { type: 'select', item: 'Nope' }, { type: 'select', item: 'Fig' }, { type: 'select', item: 'Fig' });
    expect(s.selected).toEqual(['Fig']);
  });

  it('asks for four before submitting', () => {
    const s = run(start(), { type: 'select', item: 'Fig' }, { type: 'submit' });
    expect(s.message).toEqual({ kind: 'need_four' });
    expect(s.guesses).toHaveLength(0);
    expect(s.mistakes).toBe(0);
  });
});

describe('guessing', () => {
  it('a correct guess solves the group and removes its tiles', () => {
    const s = guess(start(), FURNITURE);
    expect(s.solved).toEqual([1]);
    expect(s.tiles).toHaveLength(12);
    expect(s.tiles.some((t) => FURNITURE.includes(t))).toBe(false);
    expect(s.selected).toEqual([]);
    expect(s.mistakes).toBe(0);
    expect(s.message).toEqual({ kind: 'correct', groupIndex: 1 });
    expect(messageText(s.message!, s.puzzle)).toContain('Furniture');
    expect(s.status).toBe('playing');
  });

  it('a wrong guess counts a mistake and keeps the selection', () => {
    const s = guess(start(), SCATTERED);
    expect(s.mistakes).toBe(1);
    expect(s.solved).toEqual([]);
    expect(s.selected).toEqual(SCATTERED);
    expect(s.message).toEqual({ kind: 'incorrect' });
  });

  it('detects one away (three of four from the same group)', () => {
    const s = guess(start(), ONE_AWAY);
    expect(s.message).toEqual({ kind: 'one_away' });
    expect(s.mistakes).toBe(1);
  });

  it('two-and-two is not one away', () => {
    const s = guess(start(), ['Apple', 'Pear', 'Chair', 'Table']);
    expect(s.message).toEqual({ kind: 'incorrect' });
  });

  it('repeating the same set of items is free and flagged', () => {
    let s = guess(start(), SCATTERED);
    s = guess(s, [...SCATTERED].reverse());
    expect(s.mistakes).toBe(1);
    expect(s.guesses).toHaveLength(1);
    expect(s.message).toEqual({ kind: 'already_guessed' });
  });

  it('solving all four groups ends the game as solved', () => {
    let s = start();
    s = guess(s, METALS);
    s = guess(s, ONE_AWAY);
    s = guess(s, FRUIT);
    s = guess(s, WEATHER);
    expect(isComplete(s)).toBe(false);
    s = guess(s, FURNITURE);
    expect(s.status).toBe('solved');
    expect(s.solved).toEqual([3, 0, 2, 1]);
    expect(s.tiles).toEqual([]);
    expect(s.mistakes).toBe(1);
    expect(s.message).toEqual({ kind: 'solved' });
    expect(unsolvedGroups(s)).toEqual([]);
  });
});

describe('mistake limits', () => {
  it('relaxed mode (null) never ends on mistakes', () => {
    let s = start(null);
    const wrong = [
      SCATTERED,
      ONE_AWAY,
      ['Pear', 'Table', 'Snow', 'Tin'],
      ['Plum', 'Sofa', 'Fog', 'Gold'],
      ['Fig', 'Desk', 'Hail', 'Zinc'],
      ['Apple', 'Pear', 'Chair', 'Table'],
    ];
    for (const g of wrong) s = guess(s, g);
    expect(s.mistakes).toBe(6);
    expect(s.status).toBe('playing');
    s = guess(guess(guess(guess(s, FRUIT), FURNITURE), WEATHER), METALS);
    expect(s.status).toBe('solved');
  });

  it('defaults to relaxed mode', () => {
    expect(createInitialState(samplePuzzle()).config.maxMistakes).toBeNull();
  });

  it('capped mode ends the game as revealed when the limit is reached', () => {
    let s = start(2);
    s = guess(s, SCATTERED);
    expect(s.status).toBe('playing');
    s = guess(s, FRUIT);
    s = guess(s, ['Chair', 'Table', 'Sofa', 'Rain']);
    expect(s.mistakes).toBe(2);
    expect(s.status).toBe('revealed');
    expect(s.message).toEqual({ kind: 'revealed', reason: 'mistakes' });
    expect(s.selected).toEqual([]);
    expect(unsolvedGroups(s).map((g) => g.group.label)).toEqual(['Furniture', 'Weather', 'Metals']);
  });

  it('the player can choose to reveal at any time', () => {
    const s = run(guess(start(), WEATHER), { type: 'reveal' });
    expect(s.status).toBe('revealed');
    expect(s.message).toEqual({ kind: 'revealed', reason: 'player' });
    expect(s.solved).toEqual([2]);
  });

  it('ignores every action once complete', () => {
    const done = run(start(), { type: 'reveal' });
    for (const action of [
      { type: 'select', item: 'Apple' },
      { type: 'submit' },
      { type: 'shuffle' },
      { type: 'reveal' },
    ] satisfies GroupsAction[]) {
      expect(groupsReducer(done, action)).toBe(done);
    }
  });
});

describe('shuffle', () => {
  it('reorders tiles deterministically and keeps the same set', () => {
    const s0 = guess(start(), FRUIT);
    const a = run(s0, { type: 'shuffle' });
    const b = run(s0, { type: 'shuffle' });
    expect(a.tiles).toEqual(b.tiles);
    expect(a.tiles).not.toEqual(s0.tiles);
    expect([...a.tiles].sort()).toEqual([...s0.tiles].sort());
    expect(a.shuffleCount).toBe(1);
  });

  it('keeps the selection', () => {
    const s = run(start(), { type: 'select', item: 'Fog' }, { type: 'shuffle' });
    expect(s.selected).toEqual(['Fog']);
  });
});
