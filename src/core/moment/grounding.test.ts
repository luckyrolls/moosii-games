import { describe, expect, it } from 'vitest';
import { createGroundingState, groundingReducer, validateGroundingScript, type GroundingScript } from './grounding';

const script = (): GroundingScript => ({
  schema_version: 1,
  kind: 'grounding_script',
  title: 'Test script',
  steps: [5, 4, 3, 2, 1].map((count) => ({ count, heading: `Heading ${count}`, prompt: `Prompt ${count}.` })),
});

describe('validateGroundingScript', () => {
  it('accepts a 5-4-3-2-1 script', () => {
    expect(validateGroundingScript(script())).toEqual({ ok: true, value: script() });
  });

  const cases: [string, (s: GroundingScript) => void, RegExp][] = [
    ['four steps', (s) => s.steps.pop(), /^steps: must contain exactly 5 steps/],
    ['counts out of order', (s) => { s.steps[1]!.count = 3; }, /^steps\[1\]\.count: must be 4 \(steps go 5-4-3-2-1\)/],
    ['blank prompt', (s) => { s.steps[0]!.prompt = ' '; }, /^steps\[0\]\.prompt: must be a non-empty string/],
    ['prompt with edge whitespace', (s) => { s.steps[2]!.prompt = 'Touch. '; }, /^steps\[2\]\.prompt: must not start or end with whitespace/],
    ['heading with a blank', (s) => { s.steps[0]!.heading = 'Things you can ___'; }, /^steps\[0\]\.heading: use a word instead of a blank/],
    ['unknown step field', (s) => { (s.steps[0] as unknown as Record<string, unknown>).answer = ''; }, /^steps\[0\]: unknown field\(s\) "answer"/],
    ['wrong kind', (s) => { (s as unknown as Record<string, unknown>).kind = 'breathing_patterns'; }, /^kind: must be "grounding_script"/],
  ];

  it.each(cases)('rejects %s', (_name, mutate, expected) => {
    const s = script();
    mutate(s);
    const r = validateGroundingScript(s);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => expected.test(e)), r.errors.join(' | ')).toBe(true);
  });
});

describe('groundingReducer', () => {
  it('starts on the first step', () => {
    expect(createGroundingState(script())).toEqual({ index: 0, total: 5 });
  });

  it('moves next and back within the steps', () => {
    let s = createGroundingState(script());
    s = groundingReducer(s, { type: 'next' });
    s = groundingReducer(s, { type: 'next' });
    expect(s.index).toBe(2);
    s = groundingReducer(s, { type: 'back' });
    expect(s.index).toBe(1);
  });

  it('stays put at either end (no "done" state)', () => {
    const first = createGroundingState(script());
    expect(groundingReducer(first, { type: 'back' })).toBe(first);
    let s = first;
    for (let i = 0; i < 10; i++) s = groundingReducer(s, { type: 'next' });
    expect(s).toEqual({ index: 4, total: 5 });
    expect(Object.keys(s).sort()).toEqual(['index', 'total']);
  });

  it('restarts from the first step', () => {
    const s = groundingReducer(groundingReducer(createGroundingState(script()), { type: 'next' }), { type: 'restart' });
    expect(s.index).toBe(0);
  });
});
