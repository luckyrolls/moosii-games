import { useEffect, useId, useRef, useState } from 'react';
import { WORD_DISPLAY_NAME } from '../../../core';
import type { WordGame } from '../../../react';
import { WordGrid } from './WordGrid';
import { WordKeyboard } from './WordKeyboard';
import { MarkIcon } from './MarkIcon';
import '../tokens.css';
import '../board.css';
import './WordBoard.css';

export interface WordBoardProps {
  /** The value returned by useWordGame. All game behaviour lives there. */
  game: WordGame;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Board layout for a "word" puzzle. Presentation only. */
export function WordBoard({ game }: WordBoardProps) {
  const id = useId();
  const hintRef = useRef<HTMLParagraphElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const { pressKey, isComplete } = game;

  // Physical keyboard. Leaves form fields alone, and lets Enter/Space activate a focused button.
  useEffect(() => {
    if (isComplete) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof HTMLButtonElement) return;
      if (pressKey(e.key)) e.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pressKey, isComplete]);

  useEffect(() => {
    if (isComplete) resultsHeading.current?.focus();
  }, [isComplete]);

  // When the player asks for the hint, move focus to it so it is read out.
  const hintRequested = useRef(false);
  useEffect(() => {
    if (game.hintShown && hintRequested.current) {
      hintRequested.current = false;
      hintRef.current?.focus();
    }
  }, [game.hintShown]);

  function showHint() {
    hintRequested.current = true;
    game.showHint();
  }

  async function copyShareText() {
    if (!game.shareText) return;
    try {
      await navigator.clipboard.writeText(game.shareText);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }

  return (
    <section className="mg-board mg-word" aria-labelledby={`${id}-name`}>
      <header className="mg-board__header">
        <h2 className="mg-board__name" id={`${id}-name`}>
          {WORD_DISPLAY_NAME}
        </h2>
        <p className="mg-board__title">{game.puzzle.title}</p>
        {!isComplete && (
          <p className="mg-board__instructions">
            Guess the {game.answerLength}-letter word. After each guess, letters show
            <span className="mg-legend">
              <MarkIcon mark="in_place" /> in place,
            </span>
            <span className="mg-legend">
              <MarkIcon mark="elsewhere" /> elsewhere, or
            </span>
            <span className="mg-legend">
              <MarkIcon mark="absent" /> not in the word.
            </span>
          </p>
        )}
      </header>

      {game.hint !== null ? (
        <p className="mg-word__hint" ref={hintRef} tabIndex={-1}>
          <strong>Hint:</strong> {game.hint}
        </p>
      ) : null}

      <WordGrid answerLength={game.answerLength} guesses={game.guesses} current={isComplete ? null : game.current} />

      {!isComplete && (
        <div className="mg-status">
          <span>Guesses: {game.guesses.length}</span>
          {game.guessesRemaining !== null && (
            <span>
              Left: {game.guessesRemaining} of {game.maxGuesses}
            </span>
          )}
        </div>
      )}

      <p className="mg-message" role="status" aria-live="polite">
        {isComplete ? '' : game.messageText}
      </p>

      {!isComplete && (
        <>
          <WordKeyboard letterMarks={game.letterMarks} disabled={isComplete} onKey={pressKey} />
          <div className="mg-controls">
            <button
              type="button"
              className="mg-button mg-button--secondary"
              onClick={showHint}
              disabled={game.hintShown}
            >
              {game.hintShown ? 'Hint shown' : 'Show hint'}
            </button>
            <button type="button" className="mg-button mg-button--secondary" onClick={game.reveal}>
              Show answer
            </button>
          </div>
        </>
      )}

      {isComplete && (
        <div className="mg-results">
          <h3 className="mg-results__heading" ref={resultsHeading} tabIndex={-1}>
            {game.status === 'solved' ? 'Solved' : 'Answer shown'}
          </h3>
          {game.messageText && <p className="mg-message">{game.messageText}</p>}
          <p className="mg-word__answer" aria-label={`The word: ${game.answer ?? ''}`}>
            {game.answer}
          </p>
          {game.takeaway && (
            <blockquote className="mg-word__takeaway">
              <p>{game.takeaway}</p>
            </blockquote>
          )}
          {game.shareText ? (
            <>
              <pre className="mg-results__share" aria-label="Your guesses as coloured circles">
                {game.shareText}
              </pre>
              <button type="button" className="mg-button mg-button--secondary" onClick={copyShareText}>
                Copy result
              </button>
              <p className="mg-message" role="status">
                {copied === 'copied' ? 'Copied.' : copied === 'failed' ? 'Couldn’t copy. Select the circles above instead.' : ''}
              </p>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
