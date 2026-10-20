/** Parse pasted JSON, then validate it with the given game validator. */
export function parsePasted<T>(
  text: string,
  validate: (input: unknown) => { ok: true; puzzle: T } | { ok: false; errors: string[] },
): { ok: true; puzzle: T } | { ok: false; errors: string[] } {
  if (!text.trim()) return { ok: false, errors: ['Paste a puzzle JSON document above.'] };
  try {
    return validate(JSON.parse(text));
  } catch (err) {
    return { ok: false, errors: [`Not valid JSON: ${(err as Error).message}`] };
  }
}
