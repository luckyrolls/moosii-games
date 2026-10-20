import type { Domain } from '../types';
import type { WORD_COMPLETION_EVENT_SCHEMA_VERSION, WORD_GAME_ID, WORD_PUZZLE_SCHEMA_VERSION } from './constants';

/**
 * A "word" puzzle file. This is the contract documented in docs/puzzle-schema.md.
 * Exactly one of source_lesson_id / source_activity_id is present (enforced by the validator).
 */
export interface WordPuzzle {
  schema_version: typeof WORD_PUZZLE_SCHEMA_VERSION;
  game: typeof WORD_GAME_ID;
  puzzle_id: string;
  domain: Domain;
  title: string;
  /** Uppercase A-Z only, 4-8 letters. */
  answer: string;
  hint: string;
  /** Shown when the game ends. */
  takeaway: string;
  source_lesson_id?: string;
  source_activity_id?: string;
  /** Covers hint and takeaway. */
  makes_health_claim: boolean;
}

/** in_place: right letter, right spot. elsewhere: in the word, other spot. absent: not (or no more) in the word. */
export type LetterMark = 'in_place' | 'elsewhere' | 'absent';

export interface ScoredGuess {
  word: string;
  marks: LetterMark[];
}

/** Emitted once when a game ends. No points and no guessed words. */
export interface WordCompletionEvent {
  schema_version: typeof WORD_COMPLETION_EVENT_SCHEMA_VERSION;
  game: typeof WORD_GAME_ID;
  puzzle_id: string;
  outcome: 'solved' | 'revealed';
  /** Accepted guesses submitted (invalid and repeated guesses don't count). */
  guesses_count: number;
  hint_used: boolean;
  /** Player's local calendar date when the game ended, YYYY-MM-DD. */
  completed_local_date: string;
}
