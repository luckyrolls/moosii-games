import type { LetterMark, ScoredGuess } from './types';

/**
 * Mark each letter of `guess` against `answer` (same length, uppercase).
 *
 * Exact matches are consumed first. Remaining letters are then marked "elsewhere" only while
 * the answer still has unmatched copies of that letter, left to right; the rest are "absent".
 * So for answer PACING, guess AAAAAA marks only the second A in place and every other A absent.
 */
export function scoreGuess(answer: string, guess: string): LetterMark[] {
  if (answer.length !== guess.length) {
    throw new Error(`Guess length ${guess.length} does not match answer length ${answer.length}`);
  }
  const marks: LetterMark[] = Array.from({ length: guess.length }, () => 'absent');
  const remaining = new Map<string, number>();

  for (let i = 0; i < answer.length; i++) {
    const a = answer[i] as string;
    if (guess[i] === a) marks[i] = 'in_place';
    else remaining.set(a, (remaining.get(a) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 'in_place') continue;
    const g = guess[i] as string;
    const left = remaining.get(g) ?? 0;
    if (left > 0) {
      marks[i] = 'elsewhere';
      remaining.set(g, left - 1);
    }
  }
  return marks;
}

const RANK: Record<LetterMark, number> = { absent: 0, elsewhere: 1, in_place: 2 };

/** Best mark seen so far for each letter, for colouring the keyboard. Unseen letters are omitted. */
export function bestLetterMarks(guesses: readonly ScoredGuess[]): Partial<Record<string, LetterMark>> {
  const best: Partial<Record<string, LetterMark>> = {};
  for (const { word, marks } of guesses) {
    for (let i = 0; i < word.length; i++) {
      const letter = word[i] as string;
      const mark = marks[i] as LetterMark;
      const prev = best[letter];
      if (prev === undefined || RANK[mark] > RANK[prev]) best[letter] = mark;
    }
  }
  return best;
}
