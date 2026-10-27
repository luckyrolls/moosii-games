import type { Domain } from '../types';
import type {
  JIGSAW_COMPLETION_EVENT_SCHEMA_VERSION,
  JIGSAW_DIFFICULTIES,
  JIGSAW_GAME_ID,
  JIGSAW_PUZZLE_SCHEMA_VERSION,
} from './constants';

export type JigsawDifficulty = (typeof JIGSAW_DIFFICULTIES)[number];

export interface JigsawImage {
  /** URL or path of the approved lesson illustration. */
  src: string;
  /** Intrinsic pixel size. Aspect (width / height) 1.6-2.1; long edge >= 1200. */
  width: number;
  height: number;
  /** Describes the picture for screen readers. */
  alt: string;
}

/** A "jigsaw" puzzle file. This is the contract documented in docs/puzzle-schema.md. */
export interface JigsawPuzzle {
  schema_version: typeof JIGSAW_PUZZLE_SCHEMA_VERSION;
  game: typeof JIGSAW_GAME_ID;
  puzzle_id: string;
  domain: Domain;
  title: string;
  image: JigsawImage;
  /** The completed lesson the image comes from. */
  source_lesson_id: string;
}

/** Emitted once when a game ends. No points. */
export interface JigsawCompletionEvent {
  schema_version: typeof JIGSAW_COMPLETION_EVENT_SCHEMA_VERSION;
  game: typeof JIGSAW_GAME_ID;
  puzzle_id: string;
  /** The difficulty actually played (after any step-down for small screens). */
  difficulty: JigsawDifficulty;
  rows: number;
  cols: number;
  outcome: 'solved' | 'revealed';
  /** Swaps made. */
  moves: number;
  used_peek: boolean;
  completed_local_date: string;
}
