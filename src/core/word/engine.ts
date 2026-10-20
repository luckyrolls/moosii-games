import { scoreGuess } from './scoring';
import type { ScoredGuess, WordPuzzle } from './types';

export interface WordConfig {
  /** Accepted guesses allowed before the game ends and the answer is shown. null (default) = unlimited. */
  maxGuesses: number | null;
  /**
   * Dictionary check, injected by the host (uppercase word in, true if allowed). The answer is
   * always accepted regardless. Defaults to accepting every word.
   */
  isValidWord: (word: string) => boolean;
}

export const DEFAULT_WORD_CONFIG: WordConfig = { maxGuesses: null, isValidWord: () => true };

export type WordStatus = 'playing' | 'solved' | 'revealed';

export type WordMessage =
  | { kind: 'too_short'; needed: number }
  | { kind: 'not_a_word' }
  | { kind: 'already_guessed' }
  /** The most recent guess was scored; describe it. */
  | { kind: 'scored' }
  | { kind: 'solved' }
  | { kind: 'revealed'; reason: 'out_of_guesses' | 'player' };

export interface WordState {
  puzzle: WordPuzzle;
  config: WordConfig;
  /** Letters typed into the active row, uppercase. */
  current: string;
  /** Accepted guesses in order. */
  guesses: ScoredGuess[];
  hintShown: boolean;
  status: WordStatus;
  message: WordMessage | null;
}

export type WordAction =
  | { type: 'type_letter'; letter: string }
  | { type: 'delete_letter' }
  | { type: 'submit' }
  | { type: 'show_hint' }
  /** Player chooses to see the answer. Ends the game with outcome "revealed". */
  | { type: 'reveal' };

export function createWordState(puzzle: WordPuzzle, config: Partial<WordConfig> = {}): WordState {
  return {
    puzzle,
    config: { ...DEFAULT_WORD_CONFIG, ...config },
    current: '',
    guesses: [],
    hintShown: false,
    status: 'playing',
    message: null,
  };
}

export function isWordComplete(state: WordState): boolean {
  return state.status !== 'playing';
}

function typeLetter(state: WordState, letter: string): WordState {
  const upper = letter.toUpperCase();
  if (!/^[A-Z]$/.test(upper)) return state;
  if (state.current.length >= state.puzzle.answer.length) return state;
  return { ...state, current: state.current + upper, message: null };
}

function submit(state: WordState): WordState {
  const { answer } = state.puzzle;
  const guess = state.current;
  if (guess.length < answer.length) {
    return { ...state, message: { kind: 'too_short', needed: answer.length } };
  }
  if (state.guesses.some((g) => g.word === guess)) {
    return { ...state, message: { kind: 'already_guessed' } };
  }
  if (guess !== answer && !state.config.isValidWord(guess)) {
    return { ...state, message: { kind: 'not_a_word' } };
  }

  const guesses = [...state.guesses, { word: guess, marks: scoreGuess(answer, guess) }];
  if (guess === answer) {
    return { ...state, current: '', guesses, status: 'solved', message: { kind: 'solved' } };
  }
  const { maxGuesses } = state.config;
  if (maxGuesses !== null && guesses.length >= maxGuesses) {
    return { ...state, current: '', guesses, status: 'revealed', message: { kind: 'revealed', reason: 'out_of_guesses' } };
  }
  return { ...state, current: '', guesses, message: { kind: 'scored' } };
}

/** Pure reducer. Every action is a no-op once the game is complete. */
export function wordReducer(state: WordState, action: WordAction): WordState {
  if (isWordComplete(state)) return state;
  switch (action.type) {
    case 'type_letter':
      return typeLetter(state, action.letter);
    case 'delete_letter':
      return state.current.length === 0 ? state : { ...state, current: state.current.slice(0, -1), message: null };
    case 'submit':
      return submit(state);
    case 'show_hint':
      return state.hintShown ? state : { ...state, hintShown: true };
    case 'reveal':
      return { ...state, current: '', status: 'revealed', message: { kind: 'revealed', reason: 'player' } };
  }
}
