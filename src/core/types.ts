import type { COMPLETION_EVENT_SCHEMA_VERSION, DOMAINS, GAME_ID, PUZZLE_SCHEMA_VERSION } from './constants';

export type Domain = (typeof DOMAINS)[number];

/** 1 is the most straightforward group, 4 the trickiest. Each value is used exactly once per puzzle. */
export type Difficulty = 1 | 2 | 3 | 4;

export interface PuzzleGroup {
  label: string;
  /** Exactly 4 strings, unique across the whole puzzle. */
  items: string[];
  difficulty: Difficulty;
  source_lesson_ids: string[];
  makes_health_claim: boolean;
}

/** A "groups" puzzle file. This is the contract documented in docs/puzzle-schema.md. */
export interface GroupsPuzzle {
  schema_version: typeof PUZZLE_SCHEMA_VERSION;
  game: typeof GAME_ID;
  puzzle_id: string;
  domain: Domain;
  title: string;
  /** Exactly 4 groups. */
  groups: PuzzleGroup[];
}

export type CompletionOutcome = 'solved' | 'revealed';

/**
 * Emitted once when a game ends. Carries no points: points are awarded server-side.
 */
export interface GroupsCompletionEvent {
  schema_version: typeof COMPLETION_EVENT_SCHEMA_VERSION;
  game: typeof GAME_ID;
  puzzle_id: string;
  outcome: CompletionOutcome;
  mistakes: number;
  /** Indices into puzzle.groups, in the order the player found them. Revealed groups are not included. */
  solve_order: number[];
  /** Player's local calendar date when the game ended, YYYY-MM-DD. */
  completed_local_date: string;
}
