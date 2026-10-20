// All 6-letter ENABLE words (public domain; see src/web/wordlist/NOTICE.md), bundled as JSON.
// Regenerate with `npm run wordlist`. Every Word fixture is 6 letters.
import words from '../assets/words-6.json';

const WORDS = new Set<string>(words);

/** Injected into useWordGame. Other lengths have no list here, so they are accepted. */
export function isValidWord(word: string): boolean {
  return word.length !== 6 || WORDS.has(word.toUpperCase());
}
