import { z } from 'zod';
import {
  blankFreeText,
  displayText,
  domainSchema,
  formatIssues,
  nonEmptyString,
  type Exact,
  type ValidationOutcome,
} from '../schemaRules';
import { WORD_GAME_ID, WORD_MAX_LENGTH, WORD_MIN_LENGTH, WORD_PUZZLE_SCHEMA_VERSION } from './constants';
import type { WordPuzzle } from './types';

const ANSWER_PATTERN = new RegExp(`^[A-Z]{${WORD_MIN_LENGTH},${WORD_MAX_LENGTH}}$`);

const wordPuzzleSchema = z
  .object({
    schema_version: z.literal(WORD_PUZZLE_SCHEMA_VERSION, {
      errorMap: () => ({ message: `must be ${WORD_PUZZLE_SCHEMA_VERSION}` }),
    }),
    game: z.literal(WORD_GAME_ID, { errorMap: () => ({ message: `must be "${WORD_GAME_ID}"` }) }),
    puzzle_id: nonEmptyString,
    domain: domainSchema,
    title: displayText,
    answer: z
      .string()
      .regex(ANSWER_PATTERN, `must be ${WORD_MIN_LENGTH}-${WORD_MAX_LENGTH} uppercase letters A-Z, nothing else`),
    hint: blankFreeText,
    takeaway: blankFreeText,
    source_lesson_id: nonEmptyString.optional(),
    source_activity_id: nonEmptyString.optional(),
    makes_health_claim: z.boolean(),
  })
  .strict()
  .superRefine((puzzle, ctx) => {
    const hasLesson = puzzle.source_lesson_id !== undefined;
    const hasActivity = puzzle.source_activity_id !== undefined;
    if (hasLesson === hasActivity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: `must have exactly one of source_lesson_id or source_activity_id (${hasLesson ? 'both' : 'neither'} given)`,
      });
    }
  });

// Compile-time guard: the runtime schema and the documented types must describe the same shape.
const schemaMatchesTypes: Exact<z.infer<typeof wordPuzzleSchema>, WordPuzzle> = true;
void schemaMatchesTypes;

export type WordValidationResult = ValidationOutcome<WordPuzzle>;

/** Validate untrusted input (e.g. a parsed JSON file) against the word puzzle contract. */
export function validateWordPuzzle(input: unknown): WordValidationResult {
  const result = wordPuzzleSchema.safeParse(input);
  if (result.success) return { ok: true, puzzle: result.data };
  return { ok: false, errors: formatIssues(result.error) };
}
