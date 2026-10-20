import type { WordMessage, WordState } from './engine';
import type { LetterMark, ScoredGuess } from './types';

const MARK_WORDS: Record<LetterMark, string> = {
  in_place: 'in place',
  elsewhere: 'elsewhere',
  absent: 'not in the word',
};

/** Screen-reader description of one guess, e.g. "Guess 2: P in place, A elsewhere, ...". */
export function describeGuess(guess: ScoredGuess, guessNumber: number): string {
  const parts = [...guess.word].map((letter, i) => `${letter} ${MARK_WORDS[guess.marks[i] as LetterMark]}`);
  return `Guess ${guessNumber}: ${parts.join(', ')}.`;
}

/** Player-facing text for a word game message. Kept in core so every renderer says the same thing. */
export function wordMessageText(message: WordMessage, state: WordState): string {
  switch (message.kind) {
    case 'too_short':
      return `Type all ${message.needed} letters, then press Enter.`;
    case 'not_a_word':
      return 'That word isn’t in our list. It didn’t use a turn.';
    case 'already_guessed':
      return 'You’ve tried that word already. It didn’t use a turn.';
    case 'scored': {
      const last = state.guesses[state.guesses.length - 1];
      return last ? describeGuess(last, state.guesses.length) : '';
    }
    case 'solved':
      return `You found it: ${state.puzzle.answer}.`;
    case 'revealed':
      return message.reason === 'out_of_guesses'
        ? `That was the last guess. The word was ${state.puzzle.answer}.`
        : `The word was ${state.puzzle.answer}.`;
  }
}
