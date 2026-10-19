import { useEffect, useId, useRef, useState } from 'react';
import { GAME_DISPLAY_NAME, ITEMS_PER_GROUP } from '../../core';
import type { GroupsGame } from '../../react';
import { GroupCard } from './GroupCard';
import { Tile } from './Tile';
import './tokens.css';
import './GroupsBoard.css';

export interface GroupsBoardProps {
  /** The value returned by useGroupsGame. All game behaviour lives there. */
  game: GroupsGame;
}

/** Board layout for a "groups" puzzle. Presentation only. */
export function GroupsBoard({ game }: GroupsBoardProps) {
  const instructionsId = useId();
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  // When the game ends the controls disappear; move focus to the results so it isn't lost.
  useEffect(() => {
    if (game.isComplete) resultsHeading.current?.focus();
  }, [game.isComplete]);

  const selectionFull = game.selected.length >= ITEMS_PER_GROUP;

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
    <section className="mg-board" aria-labelledby={`${instructionsId}-name`}>
      <header className="mg-board__header">
        <h2 className="mg-board__name" id={`${instructionsId}-name`}>
          {GAME_DISPLAY_NAME}
        </h2>
        <p className="mg-board__title">{game.puzzle.title}</p>
        {!game.isComplete && (
          <p className="mg-board__instructions" id={instructionsId}>
            Find four groups of four. Pick four tiles that share something, then check.
          </p>
        )}
      </header>

      {game.groups.length > 0 && (
        <ul className="mg-groups" aria-label="Groups">
          {game.groups.map((view) => (
            <GroupCard key={view.index} view={view} />
          ))}
        </ul>
      )}

      {!game.isComplete && (
        <>
          <ul className="mg-tiles" aria-label="Tiles" aria-describedby={instructionsId}>
            {game.tiles.map((item) => (
              <li key={item}>
                <Tile
                  item={item}
                  selected={game.selected.includes(item)}
                  selectionFull={selectionFull}
                  onToggle={game.toggle}
                />
              </li>
            ))}
          </ul>

          <div className="mg-status">
            <span>
              Selected: {game.selected.length} of {ITEMS_PER_GROUP}
            </span>
            <span>
              {game.mistakesRemaining === null
                ? `Mistakes: ${game.mistakes}`
                : `Tries left: ${game.mistakesRemaining} of ${game.maxMistakes}`}
            </span>
          </div>
        </>
      )}

      <p className="mg-message" role="status" aria-live="polite">
        {game.isComplete ? '' : game.messageText}
      </p>

      {!game.isComplete && (
        <div className="mg-controls">
          <button type="button" className="mg-button mg-button--wide" onClick={game.submit} disabled={!game.canSubmit}>
            Check
          </button>
          <button type="button" className="mg-button mg-button--secondary" onClick={game.shuffle}>
            Shuffle
          </button>
          <button
            type="button"
            className="mg-button mg-button--secondary"
            onClick={game.clearSelection}
            disabled={game.selected.length === 0}
          >
            Clear
          </button>
          <button type="button" className="mg-button mg-button--secondary mg-button--wide" onClick={game.reveal}>
            Show answers
          </button>
        </div>
      )}

      {game.isComplete && (
        <div className="mg-results">
          <h3 className="mg-results__heading" ref={resultsHeading} tabIndex={-1}>
            {game.status === 'solved' ? 'Solved' : 'All groups shown'}
          </h3>
          {game.messageText && <p className="mg-message">{game.messageText}</p>}
          {game.shareText ? (
            <>
              <pre className="mg-results__share" aria-label="Your guesses as coloured squares">
                {game.shareText}
              </pre>
              <button type="button" className="mg-button mg-button--secondary" onClick={copyShareText}>
                Copy result
              </button>
              <p className="mg-message" role="status">
                {copied === 'copied' ? 'Copied.' : copied === 'failed' ? 'Couldn’t copy. Select the squares above instead.' : ''}
              </p>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
