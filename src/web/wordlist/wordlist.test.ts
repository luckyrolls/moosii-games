import { describe, expect, it } from 'vitest';
import { createIsValidWord, loadWordList } from '.';

describe('word list', () => {
  it.each([4, 5, 6, 7, 8])('loads %i-letter words, all uppercase A-Z of that length', async (n) => {
    const words = await loadWordList(n);
    expect(words.size).toBeGreaterThan(1000);
    for (const w of words) expect(w).toMatch(new RegExp(`^[A-Z]{${n}}$`));
  });

  it('contains the fixture answers and rejects nonsense', async () => {
    const isValid = createIsValidWord(await loadWordList(6));
    for (const w of ['SOOTHE', 'BUDGET', 'PACING', 'racing']) expect(isValid(w)).toBe(true);
    expect(isValid('AAAAAA')).toBe(false);
  });

  it('rejects lengths it does not have', async () => {
    await expect(loadWordList(3)).rejects.toThrow(/No word list/);
  });
});
