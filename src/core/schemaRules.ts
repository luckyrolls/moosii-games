import { z } from 'zod';
import { DOMAINS } from './constants';

/** Shared field rules for every game's puzzle validator. */

export const nonEmptyString = z.string().refine((s) => s.trim().length > 0, 'must be a non-empty string');

/**
 * Text shown to players. Rejected (never trimmed) if it starts or ends with whitespace, so the
 * file always holds exactly what appears on screen. Blank strings get only the non-empty error.
 */
export const displayText = nonEmptyString.refine(
  (s) => s.trim().length === 0 || s === s.trim(),
  'must not start or end with whitespace',
);

const BLANK_RUN = /_{2,}/;

/** Display text that also must not contain a "___" style blank. */
export const blankFreeText = displayText.refine(
  (s) => !BLANK_RUN.test(s),
  'use a word instead of a blank — screen readers read underscores aloud',
);

export const domainSchema = z.enum(DOMAINS, {
  errorMap: () => ({ message: `must be one of ${DOMAINS.map((d) => `"${d}"`).join(', ')}` }),
});

/** true only when A and B are mutually assignable. Used to pin zod schemas to documented types. */
export type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export type ValidationOutcome<T> = { ok: true; puzzle: T } | { ok: false; errors: string[] };

function formatPath(path: (string | number)[]): string {
  if (path.length === 0) return 'puzzle';
  return path.reduce<string>(
    (out, part) => (typeof part === 'number' ? `${out}[${part}]` : out ? `${out}.${part}` : part),
    '',
  );
}

/** Turn zod issues into readable `path: message` lines. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      return `${formatPath(issue.path)}: unknown field(s) ${issue.keys.map((k) => `"${k}"`).join(', ')}`;
    }
    if (issue.code === z.ZodIssueCode.invalid_type && issue.received === 'undefined') {
      return `${formatPath(issue.path)}: is required`;
    }
    return `${formatPath(issue.path)}: ${issue.message}`;
  });
}
