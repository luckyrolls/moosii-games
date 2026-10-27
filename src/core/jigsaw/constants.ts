/** Stable game identifier used in puzzle files and completion events. Never shown to players. */
export const JIGSAW_GAME_ID = 'jigsaw' as const;

/** The only place the player-facing name is defined. Placeholder until product picks a name. */
export const JIGSAW_DISPLAY_NAME = 'Jigsaw';

export const JIGSAW_PUZZLE_SCHEMA_VERSION = 1 as const;
export const JIGSAW_COMPLETION_EVENT_SCHEMA_VERSION = 1 as const;

/** Lesson images are landscape, between these aspect ratios (width / height). */
export const JIGSAW_MIN_ASPECT = 1.6;
export const JIGSAW_MAX_ASPECT = 2.1;
/** The image's long edge must be at least this many pixels. */
export const JIGSAW_MIN_LONG_EDGE_PX = 1200;

export const JIGSAW_DIFFICULTIES = ['gentle', 'medium', 'harder'] as const;

/** Roughly how many tiles each difficulty aims for. */
export const JIGSAW_TARGET_TILES = { gentle: 8, medium: 15, harder: 28 } as const;

/** Smallest tile side allowed by default (tap target size). */
export const JIGSAW_MIN_TILE_PX = 44;
