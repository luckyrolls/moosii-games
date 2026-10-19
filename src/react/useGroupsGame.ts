import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  buildCompletionEvent,
  buildShareGrid,
  createInitialState,
  groupsReducer,
  isComplete as isStateComplete,
  messageText,
  unsolvedGroups,
  ITEMS_PER_GROUP,
  type GameMessage,
  type GameStatus,
  type GroupsAction,
  type GroupsCompletionEvent,
  type GroupsConfig,
  type GroupsPuzzle,
  type GroupsState,
  type PuzzleGroup,
} from '../core';

export interface UseGroupsGameOptions extends Partial<GroupsConfig> {
  /** Called once when the game ends. The hook never sends the event anywhere itself. */
  onComplete?: (event: GroupsCompletionEvent) => void;
  /** Clock used for completed_local_date. Injectable for tests. */
  now?: () => Date;
}

export interface GroupView {
  /** Index into puzzle.groups. */
  index: number;
  group: PuzzleGroup;
  /** true when the player found it; false when it was shown because the game was revealed. */
  foundByPlayer: boolean;
}

export interface GroupsGame {
  puzzle: GroupsPuzzle;
  status: GameStatus;
  isComplete: boolean;
  /** Unsolved items in display order. */
  tiles: string[];
  selected: string[];
  /** Groups the player found (in order found), followed by revealed groups once the game ends. */
  groups: GroupView[];
  mistakes: number;
  maxMistakes: number | null;
  /** null in relaxed mode. */
  mistakesRemaining: number | null;
  canSubmit: boolean;
  message: GameMessage | null;
  /** Player-facing text for `message`, or null. */
  messageText: string | null;
  completionEvent: GroupsCompletionEvent | null;
  /** Emoji share grid; null until the game ends. */
  shareText: string | null;
  select: (item: string) => void;
  deselect: (item: string) => void;
  toggle: (item: string) => void;
  clearSelection: () => void;
  submit: () => void;
  shuffle: () => void;
  /** End the game and show every group (outcome "revealed"). */
  reveal: () => void;
}

type HookAction =
  | GroupsAction
  | { type: 'reset'; puzzle: GroupsPuzzle; config: Partial<GroupsConfig> };

function hookReducer(state: GroupsState, action: HookAction): GroupsState {
  return action.type === 'reset' ? createInitialState(action.puzzle, action.config) : groupsReducer(state, action);
}

const systemNow = () => new Date();

export function useGroupsGame(puzzle: GroupsPuzzle, options: UseGroupsGameOptions = {}): GroupsGame {
  const { maxMistakes = null, onComplete, now = systemNow } = options;
  const [state, dispatch] = useReducer(hookReducer, undefined, () =>
    createInitialState(puzzle, { maxMistakes }),
  );

  // A different puzzle or mistake limit starts a fresh game.
  if (state.puzzle.puzzle_id !== puzzle.puzzle_id || state.config.maxMistakes !== maxMistakes) {
    dispatch({ type: 'reset', puzzle, config: { maxMistakes } });
  }

  const latest = useRef({ onComplete, now });
  useEffect(() => {
    latest.current = { onComplete, now };
  });

  const complete = isStateComplete(state);
  // Once complete, the reducer returns the same state object for every action, so this
  // event (and its timestamp) is stable. `now` is read through the ref for the same reason.
  const completionEvent = useMemo(
    () => (isStateComplete(state) ? buildCompletionEvent(state, latest.current.now()) : null),
    [state],
  );

  const reported = useRef<GroupsCompletionEvent | null>(null);
  useEffect(() => {
    if (completionEvent && reported.current !== completionEvent) {
      reported.current = completionEvent;
      latest.current.onComplete?.(completionEvent);
    }
  }, [completionEvent]);

  const select = useCallback((item: string) => dispatch({ type: 'select', item }), []);
  const deselect = useCallback((item: string) => dispatch({ type: 'deselect', item }), []);
  const toggle = useCallback((item: string) => dispatch({ type: 'toggle', item }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'clear_selection' }), []);
  const submit = useCallback(() => dispatch({ type: 'submit' }), []);
  const shuffle = useCallback(() => dispatch({ type: 'shuffle' }), []);
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), []);

  const groups = useMemo<GroupView[]>(() => {
    const found = state.solved.map((index) => ({
      index,
      group: state.puzzle.groups[index] as PuzzleGroup,
      foundByPlayer: true,
    }));
    if (state.status !== 'revealed') return found;
    return [...found, ...unsolvedGroups(state).map((g) => ({ ...g, foundByPlayer: false }))];
  }, [state]);

  const shareText = useMemo(
    () => (complete ? buildShareGrid(state.puzzle, state.guesses) : null),
    [complete, state.puzzle, state.guesses],
  );

  const { maxMistakes: limit } = state.config;
  return {
    puzzle: state.puzzle,
    status: state.status,
    isComplete: complete,
    tiles: state.tiles,
    selected: state.selected,
    groups,
    mistakes: state.mistakes,
    maxMistakes: limit,
    mistakesRemaining: limit === null ? null : Math.max(0, limit - state.mistakes),
    canSubmit: !complete && state.selected.length === ITEMS_PER_GROUP,
    message: state.message,
    messageText: state.message ? messageText(state.message, state.puzzle) : null,
    completionEvent,
    shareText,
    select,
    deselect,
    toggle,
    clearSelection,
    submit,
    shuffle,
    reveal,
  };
}
