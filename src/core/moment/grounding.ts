import { z } from 'zod';
import { blankFreeText, formatIssues, type Exact } from '../schemaRules';
import type { MomentValidation } from './clock';

/** The 5-4-3-2-1 order. Steps must use these counts, in this order. */
export const GROUNDING_COUNTS = [5, 4, 3, 2, 1] as const;

export interface GroundingStep {
  count: number;
  /** Short heading, e.g. "Things you can see". */
  heading: string;
  /** One calm sentence or two. */
  prompt: string;
}

/** A grounding script config file (clinician-owned). */
export interface GroundingScript {
  schema_version: 1;
  kind: 'grounding_script';
  title: string;
  steps: GroundingStep[];
}

const stepSchema = z
  .object({
    count: z.number().int(),
    heading: blankFreeText,
    prompt: blankFreeText,
  })
  .strict();

const scriptSchema = z
  .object({
    schema_version: z.literal(1, { errorMap: () => ({ message: 'must be 1' }) }),
    kind: z.literal('grounding_script', { errorMap: () => ({ message: 'must be "grounding_script"' }) }),
    title: blankFreeText,
    steps: z.array(stepSchema).length(GROUNDING_COUNTS.length, `must contain exactly ${GROUNDING_COUNTS.length} steps`),
  })
  .strict()
  .superRefine((script, ctx) => {
    script.steps.forEach((step, i) => {
      const expected = GROUNDING_COUNTS[i];
      if (expected !== undefined && step.count !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', i, 'count'],
          message: `must be ${expected} (steps go ${GROUNDING_COUNTS.join('-')})`,
        });
      }
    });
  });

const scriptMatches: Exact<z.infer<typeof scriptSchema>, GroundingScript> = true;
void scriptMatches;

export function validateGroundingScript(input: unknown): MomentValidation<GroundingScript> {
  const r = scriptSchema.safeParse(input);
  return r.success ? { ok: true, value: r.data } : { ok: false, errors: formatIssues(r.error) };
}

/** Which step is on screen. There is deliberately no "done" state: the last step just stays. */
export interface GroundingState {
  index: number;
  total: number;
}

export type GroundingAction = { type: 'next' } | { type: 'back' } | { type: 'restart' };

export function createGroundingState(script: GroundingScript): GroundingState {
  return { index: 0, total: script.steps.length };
}

export function groundingReducer(state: GroundingState, action: GroundingAction): GroundingState {
  switch (action.type) {
    case 'next':
      return state.index >= state.total - 1 ? state : { ...state, index: state.index + 1 };
    case 'back':
      return state.index === 0 ? state : { ...state, index: state.index - 1 };
    case 'restart':
      return state.index === 0 ? state : { ...state, index: 0 };
  }
}
