import { COMPLETION_EVENT_SCHEMA_VERSION, GAME_ID } from './constants';
import type { GroupsState } from './engine';
import type { GroupsCompletionEvent } from './types';

/** Local calendar date as YYYY-MM-DD (uses the device's time zone, not UTC). */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${String(y).padStart(4, '0')}-${m}-${d}`;
}

/** Build the completion event for a finished game, or null while it is still in play. */
export function buildCompletionEvent(state: GroupsState, completedAt: Date): GroupsCompletionEvent | null {
  if (state.status === 'playing') return null;
  return {
    schema_version: COMPLETION_EVENT_SCHEMA_VERSION,
    game: GAME_ID,
    puzzle_id: state.puzzle.puzzle_id,
    outcome: state.status,
    mistakes: state.mistakes,
    solve_order: [...state.solved],
    completed_local_date: toLocalDateString(completedAt),
  };
}
