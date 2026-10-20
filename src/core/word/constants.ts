/** Stable game identifier used in puzzle files and completion events. Never shown to players. */
export const WORD_GAME_ID = 'word' as const;

/** The only place the player-facing name is defined. Placeholder until product picks a name. */
export const WORD_DISPLAY_NAME = 'Word of the Day';

/** Version of the word puzzle file format documented in docs/puzzle-schema.md. */
export const WORD_PUZZLE_SCHEMA_VERSION = 1 as const;

/** Version of the word completion event shape. */
export const WORD_COMPLETION_EVENT_SCHEMA_VERSION = 1 as const;

export const WORD_MIN_LENGTH = 4;
export const WORD_MAX_LENGTH = 8;
