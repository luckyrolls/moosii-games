import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  bestLetterMarks,
  buildWordCompletionEvent,
  buildWordShareText,
  createWordState,
  isWordComplete,
  wordMessageText,
  wordReducer,
  type LetterMark,
  type ScoredGuess,
  type WordAction,
  type WordCompletionEvent,
  type WordConfig,
  type WordMessage,
  type WordPuzzle,
  type WordState,
  type WordStatus,
} from '../core';

export interface UseWordGameOptions extends Partial<WordConfig> {
  /** Called once when the game ends. The hook never sends the event anywhere itself. */
  onComplete?: (event: WordCompletionEvent) => void;
  /** Clock used for completed_local_date. Injectable for tests. */
  now?: () => Date;
}

export interface WordGame {
  puzzle: WordPuzzle;
  status: WordStatus;
  isComplete: boolean;
  answerLength: number;
  guesses: ScoredGuess[];
  /** Letters typed into the active row. */
  current: string;
  /** Best mark seen for each letter, for the keyboard. */
  letterMarks: Partial<Record<string, LetterMark>>;
  maxGuesses: number | null;
  /** null when unlimited. */
  guessesRemaining: number | null;
  canSubmit: boolean;
  hintShown: boolean;
  /** The hint text once shown (always shown once the game ends), otherwise null. */
  hint: string | null;
  message: WordMessage | null;
  /** Player-facing text for `message` (including the spoken description of a scored guess). */
  messageText: string | null;
  /** The answer, only once the game has ended. */
  answer: string | null;
  /** The takeaway, only once the game has ended. */
  takeaway: string | null;
  completionEvent: WordCompletionEvent | null;
  /** Share text; null until the game ends. */
  shareText: string | null;
  typeLetter: (letter: string) => void;
  deleteLetter: () => void;
  submit: () => void;
  showHint: () => void;
  /** End the game and show the answer (outcome "revealed"). */
  reveal: () => void;
  /**
   * Handle a key name ("Enter", "Backspace", "Delete" or a single letter). Returns true if the
   * key was used, so renderers can decide whether to swallow the platform event.
   */
  pressKey: (key: string) => boolean;
}

type HookAction = WordAction | { type: 'reset'; puzzle: WordPuzzle; config: Partial<WordConfig> };

const systemNow = () => new Date();
const acceptAll = () => true;

export function useWordGame(puzzle: WordPuzzle, options: UseWordGameOptions = {}): WordGame {
  const { maxGuesses = null, isValidWord = acceptAll, onComplete, now = systemNow } = options;

  const latest = useRef({ onComplete, now, isValidWord });
  useEffect(() => {
    latest.current = { onComplete, now, isValidWord };
  });

  // A stable wrapper so a new isValidWord identity never resets the game.
  const validWord = useCallback((word: string) => latest.current.isValidWord(word), []);

  const reducer = useCallback(
    (state: WordState, action: HookAction): WordState =>
      action.type === 'reset' ? createWordState(action.puzzle, action.config) : wordReducer(state, action),
    [],
  );
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createWordState(puzzle, { maxGuesses, isValidWord: validWord }),
  );

  // A different puzzle or guess limit starts a fresh game.
  if (state.puzzle.puzzle_id !== puzzle.puzzle_id || state.config.maxGuesses !== maxGuesses) {
    dispatch({ type: 'reset', puzzle, config: { maxGuesses, isValidWord: validWord } });
  }

  // Once complete, the reducer returns the same state object for every action, so this event
  // (and its timestamp) is stable.
  const completionEvent = useMemo(
    () => (isWordComplete(state) ? buildWordCompletionEvent(state, latest.current.now()) : null),
    [state],
  );

  const reported = useRef<WordCompletionEvent | null>(null);
  useEffect(() => {
    if (completionEvent && reported.current !== completionEvent) {
      reported.current = completionEvent;
      latest.current.onComplete?.(completionEvent);
    }
  }, [completionEvent]);

  const typeLetter = useCallback((letter: string) => dispatch({ type: 'type_letter', letter }), []);
  const deleteLetter = useCallback(() => dispatch({ type: 'delete_letter' }), []);
  const submit = useCallback(() => dispatch({ type: 'submit' }), []);
  const showHint = useCallback(() => dispatch({ type: 'show_hint' }), []);
  const reveal = useCallback(() => dispatch({ type: 'reveal' }), []);
  const pressKey = useCallback((key: string) => {
    if (key === 'Enter') {
      dispatch({ type: 'submit' });
      return true;
    }
    if (key === 'Backspace' || key === 'Delete') {
      dispatch({ type: 'delete_letter' });
      return true;
    }
    if (/^[a-zA-Z]$/.test(key)) {
      dispatch({ type: 'type_letter', letter: key });
      return true;
    }
    return false;
  }, []);

  const letterMarks = useMemo(() => bestLetterMarks(state.guesses), [state.guesses]);
  const complete = isWordComplete(state);
  const shareText = useMemo(() => (complete ? buildWordShareText(state.guesses) : null), [complete, state.guesses]);

  const { maxGuesses: limit } = state.config;
  return {
    puzzle: state.puzzle,
    status: state.status,
    isComplete: complete,
    answerLength: state.puzzle.answer.length,
    guesses: state.guesses,
    current: state.current,
    letterMarks,
    maxGuesses: limit,
    guessesRemaining: limit === null ? null : Math.max(0, limit - state.guesses.length),
    canSubmit: !complete && state.current.length === state.puzzle.answer.length,
    hintShown: state.hintShown,
    hint: state.hintShown || complete ? state.puzzle.hint : null,
    message: state.message,
    messageText: state.message ? wordMessageText(state.message, state) : null,
    answer: complete ? state.puzzle.answer : null,
    takeaway: complete ? state.puzzle.takeaway : null,
    completionEvent,
    shareText,
    typeLetter,
    deleteLetter,
    submit,
    showHint,
    reveal,
    pressKey,
  };
}
