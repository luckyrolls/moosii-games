/** Stable game identifier used in puzzle files and completion events. Never shown to players. */
export const GAME_ID = 'groups' as const;

/**
 * The only place the player-facing game name is defined. Placeholder until product picks a name.
 */
export const GAME_DISPLAY_NAME = 'Groups';

/** Version of the puzzle file format documented in docs/puzzle-schema.md. */
export const PUZZLE_SCHEMA_VERSION = 1 as const;

/** Version of the completion event shape. Bump when the event's fields change. */
export const COMPLETION_EVENT_SCHEMA_VERSION = 1 as const;

export const GROUP_COUNT = 4;
export const ITEMS_PER_GROUP = 4;

export const DOMAINS = ['moosii', 'financial', 'cancer'] as const;
