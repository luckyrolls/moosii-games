import { z } from 'zod';
import { GAME_ID, GROUP_COUNT, ITEMS_PER_GROUP, PUZZLE_SCHEMA_VERSION } from './constants';
import {
  blankFreeText,
  displayText,
  domainSchema,
  formatIssues,
  nonEmptyString,
  type Exact,
  type ValidationOutcome,
} from './schemaRules';
import type { GroupsPuzzle } from './types';

const groupSchema = z
  .object({
    label: blankFreeText,
    items: z
      .array(displayText)
      .length(ITEMS_PER_GROUP, `must contain exactly ${ITEMS_PER_GROUP} items`),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)], {
      errorMap: () => ({ message: 'must be 1, 2, 3 or 4' }),
    }),
    source_lesson_ids: z.array(nonEmptyString),
    makes_health_claim: z.boolean(),
  })
  .strict();

const puzzleSchema = z
  .object({
    schema_version: z.literal(PUZZLE_SCHEMA_VERSION, {
      errorMap: () => ({ message: `must be ${PUZZLE_SCHEMA_VERSION}` }),
    }),
    game: z.literal(GAME_ID, { errorMap: () => ({ message: `must be "${GAME_ID}"` }) }),
    puzzle_id: nonEmptyString,
    domain: domainSchema,
    title: displayText,
    groups: z.array(groupSchema).length(GROUP_COUNT, `must contain exactly ${GROUP_COUNT} groups`),
  })
  .strict()
  .superRefine((puzzle, ctx) => {
    const difficultySeenAt = new Map<number, number>();
    puzzle.groups.forEach((group, groupIndex) => {
      const previous = difficultySeenAt.get(group.difficulty);
      if (previous !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['groups', groupIndex, 'difficulty'],
          message: `difficulty ${group.difficulty} is already used by groups[${previous}]; each difficulty 1-4 must be used once`,
        });
      } else {
        difficultySeenAt.set(group.difficulty, groupIndex);
      }
    });

    // Compare case-insensitively: "Swing" and "swing" would read as the same tile.
    const itemSeenAt = new Map<string, string>();
    puzzle.groups.forEach((group, groupIndex) => {
      group.items.forEach((item, itemIndex) => {
        const key = item.toLowerCase();
        const where = `groups[${groupIndex}].items[${itemIndex}]`;
        const previous = itemSeenAt.get(key);
        if (previous !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['groups', groupIndex, 'items', itemIndex],
            message: `item "${item}" duplicates ${previous}; items must be unique across the whole puzzle`,
          });
        } else {
          itemSeenAt.set(key, where);
        }
      });
    });
  });

// Compile-time guard: the runtime schema and the documented types must describe the same shape.
type Inferred = z.infer<typeof puzzleSchema>;
const schemaMatchesTypes: Exact<Inferred, GroupsPuzzle> = true;
void schemaMatchesTypes;

export type ValidationResult = ValidationOutcome<GroupsPuzzle>;

/** Validate untrusted input (e.g. a parsed JSON file) against the puzzle contract. */
export function validatePuzzle(input: unknown): ValidationResult {
  const result = puzzleSchema.safeParse(input);
  if (result.success) return { ok: true, puzzle: result.data };
  return { ok: false, errors: formatIssues(result.error) };
}

/** Like validatePuzzle, but throws an Error listing every problem. */
export function parsePuzzle(input: unknown): GroupsPuzzle {
  const result = validatePuzzle(input);
  if (!result.ok) throw new Error(`Invalid puzzle:\n- ${result.errors.join('\n- ')}`);
  return result.puzzle;
}
