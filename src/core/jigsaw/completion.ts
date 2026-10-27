import { toLocalDateString } from '../date';
import { JIGSAW_COMPLETION_EVENT_SCHEMA_VERSION, JIGSAW_GAME_ID } from './constants';
import type { JigsawState } from './engine';
import type { JigsawCompletionEvent } from './types';

/** Build the completion event for a finished game, or null while it is still in play. */
export function buildJigsawCompletionEvent(state: JigsawState, completedAt: Date): JigsawCompletionEvent | null {
  if (state.status === 'playing') return null;
  return {
    schema_version: JIGSAW_COMPLETION_EVENT_SCHEMA_VERSION,
    game: JIGSAW_GAME_ID,
    puzzle_id: state.puzzle.puzzle_id,
    difficulty: state.layout.difficulty,
    rows: state.layout.rows,
    cols: state.layout.cols,
    outcome: state.status,
    moves: state.moves,
    used_peek: state.usedPeek,
    completed_local_date: toLocalDateString(completedAt),
  };
}
