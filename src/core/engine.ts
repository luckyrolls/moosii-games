import { ITEMS_PER_GROUP } from './constants';
import { seededShuffle } from './random';
import type { GroupsPuzzle, PuzzleGroup } from './types';

export interface GroupsConfig {
  /**
   * Wrong guesses allowed before the game ends and all groups are revealed.
   * null (the default) is relaxed mode: the game never ends on mistakes.
   */
  maxMistakes: number | null;
}

export const DEFAULT_CONFIG: GroupsConfig = { maxMistakes: null };

export type GameStatus = 'playing' | 'solved' | 'revealed';

export type GameMessage =
  | { kind: 'need_four' }
  | { kind: 'correct'; groupIndex: number }
  | { kind: 'incorrect' }
  | { kind: 'one_away' }
  | { kind: 'already_guessed' }
  | { kind: 'solved' }
  | { kind: 'revealed'; reason: 'mistakes' | 'player' };

export interface GroupsState {
  puzzle: GroupsPuzzle;
  config: GroupsConfig;
  /** Unsolved items in display order. */
  tiles: string[];
  /** Currently selected items, in the order they were picked. At most 4. */
  selected: string[];
  /** Indices into puzzle.groups, in the order they were found. */
  solved: number[];
  /** One entry per submitted guess: the group index of each guessed item. Drives the share grid. */
  guesses: number[][];
  /** Canonical key of each submitted set of items, so repeating a guess is free. */
  guessItems: string[];
  mistakes: number;
  shuffleCount: number;
  status: GameStatus;
  message: GameMessage | null;
}

export type GroupsAction =
  | { type: 'select'; item: string }
  | { type: 'deselect'; item: string }
  | { type: 'toggle'; item: string }
  | { type: 'clear_selection' }
  | { type: 'submit' }
  | { type: 'shuffle' }
  /** Player chooses to see the answers. Ends the game with outcome "revealed". */
  | { type: 'reveal' };

/** Seed for the starting layout. Keyed only by puzzle_id so every player sees the same board. */
export function initialLayoutSeed(puzzleId: string): string {
  return puzzleId;
}

export function createInitialState(
  puzzle: GroupsPuzzle,
  config: Partial<GroupsConfig> = {},
): GroupsState {
  const allItems = puzzle.groups.flatMap((g) => g.items);
  return {
    puzzle,
    config: { ...DEFAULT_CONFIG, ...config },
    tiles: seededShuffle(allItems, initialLayoutSeed(puzzle.puzzle_id)),
    selected: [],
    solved: [],
    guesses: [],
    guessItems: [],
    mistakes: 0,
    shuffleCount: 0,
    status: 'playing',
    message: null,
  };
}

export function groupIndexOf(puzzle: GroupsPuzzle, item: string): number {
  return puzzle.groups.findIndex((g) => g.items.includes(item));
}

export function isComplete(state: GroupsState): boolean {
  return state.status !== 'playing';
}

/** Groups the player did not find, easiest first. Empty unless the game ended by revealing. */
export function unsolvedGroups(state: GroupsState): { index: number; group: PuzzleGroup }[] {
  return state.puzzle.groups
    .map((group, index) => ({ index, group }))
    .filter(({ index }) => !state.solved.includes(index))
    .sort((a, b) => a.group.difficulty - b.group.difficulty);
}

function guessKey(items: string[]): string {
  return [...items].sort().join('\u0000');
}

function select(state: GroupsState, item: string): GroupsState {
  if (!state.tiles.includes(item) || state.selected.includes(item)) return state;
  if (state.selected.length >= ITEMS_PER_GROUP) return state;
  return { ...state, selected: [...state.selected, item], message: null };
}

function deselect(state: GroupsState, item: string): GroupsState {
  if (!state.selected.includes(item)) return state;
  return { ...state, selected: state.selected.filter((s) => s !== item), message: null };
}

function submit(state: GroupsState): GroupsState {
  if (state.selected.length !== ITEMS_PER_GROUP) {
    return { ...state, message: { kind: 'need_four' } };
  }
  const { puzzle } = state;
  const guessGroups = state.selected.map((item) => groupIndexOf(puzzle, item));

  // Re-submitting an identical set of items costs nothing.
  const key = guessKey(state.selected);
  if (state.guessItems.includes(key)) return { ...state, message: { kind: 'already_guessed' } };

  const guesses = [...state.guesses, guessGroups];
  const guessItems = [...state.guessItems, key];
  const first = guessGroups[0] as number;

  if (guessGroups.every((g) => g === first)) {
    const solved = [...state.solved, first];
    const tiles = state.tiles.filter((t) => !state.selected.includes(t));
    const allFound = solved.length === puzzle.groups.length;
    return {
      ...state,
      tiles,
      selected: [],
      solved,
      guesses,
      guessItems,
      status: allFound ? 'solved' : 'playing',
      message: allFound ? { kind: 'solved' } : { kind: 'correct', groupIndex: first },
    };
  }

  const mistakes = state.mistakes + 1;
  const counts = new Map<number, number>();
  for (const g of guessGroups) counts.set(g, (counts.get(g) ?? 0) + 1);
  const oneAway = [...counts.values()].some((n) => n === ITEMS_PER_GROUP - 1);
  const outOfMistakes = state.config.maxMistakes !== null && mistakes >= state.config.maxMistakes;

  return {
    ...state,
    guesses,
    guessItems,
    mistakes,
    status: outOfMistakes ? 'revealed' : 'playing',
    selected: outOfMistakes ? [] : state.selected,
    message: outOfMistakes
      ? { kind: 'revealed', reason: 'mistakes' }
      : oneAway
        ? { kind: 'one_away' }
        : { kind: 'incorrect' },
  };
}

function shuffle(state: GroupsState): GroupsState {
  const shuffleCount = state.shuffleCount + 1;
  let tiles = seededShuffle(state.tiles, `${state.puzzle.puzzle_id}#shuffle${shuffleCount}`);
  // Make sure the player sees something move.
  if (tiles.length > 1 && tiles.every((t, i) => t === state.tiles[i])) {
    tiles = [...tiles.slice(1), tiles[0] as string];
  }
  return { ...state, tiles, shuffleCount, message: null };
}

/** Pure reducer. Every action is a no-op once the game is complete. */
export function groupsReducer(state: GroupsState, action: GroupsAction): GroupsState {
  if (isComplete(state)) return state;
  switch (action.type) {
    case 'select':
      return select(state, action.item);
    case 'deselect':
      return deselect(state, action.item);
    case 'toggle':
      return state.selected.includes(action.item)
        ? deselect(state, action.item)
        : select(state, action.item);
    case 'clear_selection':
      return state.selected.length === 0 ? state : { ...state, selected: [], message: null };
    case 'submit':
      return submit(state);
    case 'shuffle':
      return shuffle(state);
    case 'reveal':
      return { ...state, selected: [], status: 'revealed', message: { kind: 'revealed', reason: 'player' } };
  }
}
