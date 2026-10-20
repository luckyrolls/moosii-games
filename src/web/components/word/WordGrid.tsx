import type { CSSProperties } from 'react';
import { describeGuess, type LetterMark, type ScoredGuess } from '../../../core';

interface WordGridProps {
  answerLength: number;
  guesses: ScoredGuess[];
  /** Letters in the active row, or null when there is no active row (game over). */
  current: string | null;
}

function Cell({ letter, mark }: { letter: string; mark?: LetterMark }) {
  const className = ['mg-cell', mark ? `mg-cell--${mark}` : letter ? 'mg-cell--typed' : 'mg-cell--empty'].join(' ');
  return (
    <span className={className}>
      <span className="mg-cell__letter">{letter}</span>
    </span>
  );
}

/** Rows grow with guesses: every guess so far, plus the active row while playing. */
export function WordGrid({ answerLength, guesses, current }: WordGridProps) {
  const cols = { '--mg-word-cols': answerLength } as CSSProperties;
  return (
    <ol className="mg-word-grid" aria-label="Guesses" style={cols}>
      {guesses.map((g, i) => (
        <li key={g.word} className="mg-word-row" aria-label={describeGuess(g, i + 1)}>
          {[...g.word].map((letter, j) => (
            <Cell key={j} letter={letter} mark={g.marks[j]} />
          ))}
        </li>
      ))}
      {current !== null && (
        <li
          className="mg-word-row mg-word-row--active"
          aria-label={
            current
              ? `Current guess: ${[...current].join(' ')}. ${current.length} of ${answerLength} letters.`
              : `Current guess: empty. ${answerLength} letters needed.`
          }
        >
          {Array.from({ length: answerLength }, (_, j) => (
            <Cell key={j} letter={current[j] ?? ''} />
          ))}
        </li>
      )}
    </ol>
  );
}
