import { z } from 'zod';
import {
  displayText,
  domainSchema,
  formatIssues,
  nonEmptyString,
  type Exact,
  type ValidationOutcome,
} from '../schemaRules';
import {
  JIGSAW_GAME_ID,
  JIGSAW_MAX_ASPECT,
  JIGSAW_MIN_ASPECT,
  JIGSAW_MIN_LONG_EDGE_PX,
  JIGSAW_PUZZLE_SCHEMA_VERSION,
} from './constants';
import type { JigsawPuzzle } from './types';

const pixels = z
  .number({ invalid_type_error: 'must be a whole number of pixels' })
  .int('must be a whole number of pixels')
  .positive('must be greater than 0');

const imageSchema = z
  .object({
    src: displayText,
    width: pixels,
    height: pixels,
    alt: displayText,
  })
  .strict()
  .superRefine((image, ctx) => {
    const aspect = image.width / image.height;
    if (aspect < JIGSAW_MIN_ASPECT || aspect > JIGSAW_MAX_ASPECT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `aspect ratio (width / height) must be between ${JIGSAW_MIN_ASPECT} and ${JIGSAW_MAX_ASPECT}, got ${aspect.toFixed(2)}`,
      });
    }
    const longEdge = Math.max(image.width, image.height);
    if (longEdge < JIGSAW_MIN_LONG_EDGE_PX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `the long edge must be at least ${JIGSAW_MIN_LONG_EDGE_PX} px, got ${longEdge}`,
      });
    }
  });

const jigsawPuzzleSchema = z
  .object({
    schema_version: z.literal(JIGSAW_PUZZLE_SCHEMA_VERSION, {
      errorMap: () => ({ message: `must be ${JIGSAW_PUZZLE_SCHEMA_VERSION}` }),
    }),
    game: z.literal(JIGSAW_GAME_ID, { errorMap: () => ({ message: `must be "${JIGSAW_GAME_ID}"` }) }),
    puzzle_id: nonEmptyString,
    domain: domainSchema,
    title: displayText,
    image: imageSchema,
    source_lesson_id: nonEmptyString,
  })
  .strict();

// Compile-time guard: the runtime schema and the documented types must describe the same shape.
const schemaMatchesTypes: Exact<z.infer<typeof jigsawPuzzleSchema>, JigsawPuzzle> = true;
void schemaMatchesTypes;

export type JigsawValidationResult = ValidationOutcome<JigsawPuzzle>;

/** Validate untrusted input (e.g. a parsed JSON file) against the jigsaw puzzle contract. */
export function validateJigsawPuzzle(input: unknown): JigsawValidationResult {
  const result = jigsawPuzzleSchema.safeParse(input);
  if (result.success) return { ok: true, puzzle: result.data };
  return { ok: false, errors: formatIssues(result.error) };
}
