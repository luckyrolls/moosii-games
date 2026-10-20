import { toLocalDateString } from '../date';
import { WORD_COMPLETION_EVENT_SCHEMA_VERSION, WORD_GAME_ID } from './constants';
import type { WordState } from './engine';
import type { WordCompletionEvent } from './types';

/** Build the completion event for a finished game, or null while it is still in play. */
export function buildWordCompletionEvent(state: WordState, completedAt: Date): WordCompletionEvent | null {
  if (state.status === 'playing') return null;
  return {
    schema_version: WORD_COMPLETION_EVENT_SCHEMA_VERSION,
    game: WORD_GAME_ID,
    puzzle_id: state.puzzle.puzzle_id,
    outcome: state.status,
    guesses_count: state.guesses.length,
    hint_used: state.hintShown,
    completed_local_date: toLocalDateString(completedAt),
  };
}
