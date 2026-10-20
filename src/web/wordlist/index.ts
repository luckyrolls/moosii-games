/**
 * Lazily loaded guess dictionary (ENABLE, public domain; see NOTICE.md).
 * Each length is its own chunk, fetched only when a puzzle of that length is played.
 * Not imported by src/core or src/react: hosts inject `isValidWord` into the game.
 */
const loaders = import.meta.glob<string>('./data/words-*.txt', { query: '?raw', import: 'default' });

const cache = new Map<number, Promise<Set<string>>>();

export function loadWordList(length: number): Promise<Set<string>> {
  let pending = cache.get(length);
  if (!pending) {
    const load = loaders[`./data/words-${length}.txt`];
    if (!load) return Promise.reject(new Error(`No word list for ${length}-letter words`));
    pending = load().then((text) => new Set(text.split('\n').filter(Boolean)));
    cache.set(length, pending);
  }
  return pending;
}

/** Build an isValidWord function for the game from a loaded list. */
export function createIsValidWord(words: ReadonlySet<string>): (word: string) => boolean {
  return (word) => words.has(word.toUpperCase());
}
