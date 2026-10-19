import { z } from 'zod';
import { DOMAINS, GAME_ID, GROUP_COUNT, ITEMS_PER_GROUP, PUZZLE_SCHEMA_VERSION } from './constants';
import type { GroupsPuzzle } from './types';

const nonEmptyString = z.string().refine((s) => s.trim().length > 0, 'must be a non-empty string');

/**
 * Text shown to players. Rejected (never trimmed) if it starts or ends with whitespace, so the
 * file always holds exactly what appears on screen. Blank strings get only the non-empty error.
 */
const displayText = nonEmptyString.refine(
  (s) => s.trim().length === 0 || s === s.trim(),
  'must not start or end with whitespace',
);

const BLANK_RUN = /_{2,}/;

const labelText = displayText.refine(
  (s) => !BLANK_RUN.test(s),
  'use a word instead of a blank — screen readers read underscores aloud',
);

const groupSchema = z
  .object({
    label: labelText,
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
    domain: z.enum(DOMAINS, {
      errorMap: () => ({ message: `must be one of ${DOMAINS.map((d) => `"${d}"`).join(', ')}` }),
    }),
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
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const schemaMatchesTypes: Exact<Inferred, GroupsPuzzle> = true;
void schemaMatchesTypes;

export type ValidationResult =
  | { ok: true; puzzle: GroupsPuzzle }
  | { ok: false; errors: string[] };

function formatPath(path: (string | number)[]): string {
  if (path.length === 0) return 'puzzle';
  return path.reduce<string>(
    (out, part) => (typeof part === 'number' ? `${out}[${part}]` : out ? `${out}.${part}` : part),
    '',
  );
}

/** Validate untrusted input (e.g. a parsed JSON file) against the puzzle contract. */
export function validatePuzzle(input: unknown): ValidationResult {
  const result = puzzleSchema.safeParse(input);
  if (result.success) return { ok: true, puzzle: result.data };
  const errors = result.error.issues.map((issue) => {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      return `${formatPath(issue.path)}: unknown field(s) ${issue.keys.map((k) => `"${k}"`).join(', ')}`;
    }
    if (issue.code === z.ZodIssueCode.invalid_type && issue.received === 'undefined') {
      return `${formatPath(issue.path)}: is required`;
    }
    return `${formatPath(issue.path)}: ${issue.message}`;
  });
  return { ok: false, errors };
}

/** Like validatePuzzle, but throws an Error listing every problem. */
export function parsePuzzle(input: unknown): GroupsPuzzle {
  const result = validatePuzzle(input);
  if (!result.ok) throw new Error(`Invalid puzzle:\n- ${result.errors.join('\n- ')}`);
  return result.puzzle;
}
