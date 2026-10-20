import type { LetterMark, ScoredGuess } from './types';

/** One symbol per mark. Deliberately blue/orange/white circles, not a green/yellow scheme. */
export const WORD_SHARE_SYMBOLS: Record<LetterMark, string> = {
  in_place: '\u{1F535}', // blue circle
  elsewhere: '\u{1F7E0}', // orange circle
  absent: '⚪', // white circle
};

/** One row per accepted guess. Contains no letters, no word and no score. */
export function buildWordShareText(guesses: readonly ScoredGuess[]): string {
  return guesses.map((g) => g.marks.map((m) => WORD_SHARE_SYMBOLS[m]).join('')).join('\n');
}
