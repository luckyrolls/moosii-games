import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { JIGSAW_DIFFICULTIES, JIGSAW_DISPLAY_NAME, type JigsawCompletionEvent, type JigsawDifficulty, type JigsawPuzzle } from '../../../core';
import { useJigsawGame } from '../../../react';
import '../tokens.css';
import '../board.css';
import './JigsawBoard.css';

export interface JigsawBoardProps {
  /** Validated puzzle. */
  puzzle: JigsawPuzzle;
  /** Resolved image URL; defaults to puzzle.image.src. */
  imageSrc?: string;
  initialDifficulty?: JigsawDifficulty;
  onComplete?: (event: JigsawCompletionEvent) => void;
  /** Leave the game. When given, a Back button is shown. */
  onBack?: () => void;
}

const DIFFICULTY_LABEL: Record<JigsawDifficulty, string> = { gentle: 'Gentle', medium: 'Medium', harder: 'Harder' };

/** Square-tile jigsaw: pick two tiles to swap them. Layout and styling only; behaviour from useJigsawGame. */
export function JigsawBoard({ puzzle, imageSrc, initialDifficulty = 'gentle', onComplete, onBack }: JigsawBoardProps) {
  const [difficulty, setDifficulty] = useState<JigsawDifficulty>(initialDifficulty);
  const [round, setRound] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const width = useElementWidth(frame);
  const id = useId();
  const aspect = puzzle.image.width / puzzle.image.height;

  return (
    <section className="mg-board mg-jigsaw" aria-labelledby={`${id}-name`}>
      <header className="mg-board__header">
        <div className="mg-jigsaw__bar">
          {onBack && (
            <button type="button" className="mg-button mg-button--secondary mg-jigsaw__back" onClick={onBack} aria-label={`Back, leave ${JIGSAW_DISPLAY_NAME}`}>
              <span aria-hidden="true">←</span> Back
            </button>
          )}
          <h2 className="mg-board__name" id={`${id}-name`}>
            {JIGSAW_DISPLAY_NAME}
          </h2>
        </div>
        <p className="mg-board__title">{puzzle.title}</p>
      </header>

      <fieldset className="mg-jigsaw__difficulty">
        <legend>Difficulty</legend>
        {JIGSAW_DIFFICULTIES.map((d) => (
          <label key={d} className="mg-jigsaw__chip">
            <input
              type="radio"
              name={`${id}-difficulty`}
              checked={difficulty === d}
              onChange={() => {
                setDifficulty(d);
                setRound((r) => r + 1);
              }}
            />
            <span>{DIFFICULTY_LABEL[d]}</span>
          </label>
        ))}
      </fieldset>

      {/* Until measured, reserve the image's shape so the page doesn't jump. */}
      <div className="mg-jigsaw__frame" ref={frame} style={width > 0 ? undefined : { aspectRatio: `${puzzle.image.width} / ${puzzle.image.height}` }}>
        {width > 0 && (
          <Game
            key={`${puzzle.puzzle_id}|${difficulty}|${round}`}
            puzzle={puzzle}
            src={imageSrc ?? puzzle.image.src}
            difficulty={difficulty}
            width={width}
            aspect={aspect}
            onComplete={onComplete}
          />
        )}
      </div>
    </section>
  );
}

function Game({
  puzzle,
  src,
  difficulty,
  width,
  aspect,
  onComplete,
}: {
  puzzle: JigsawPuzzle;
  src: string;
  difficulty: JigsawDifficulty;
  width: number;
  aspect: number;
  onComplete?: (event: JigsawCompletionEvent) => void;
}) {
  const game = useJigsawGame(puzzle, { difficulty, boardWidthPx: width, onComplete });
  const { rows, cols, tileWidthPx: tw, tileHeightPx: th } = game.grid;
  const height = width / aspect;
  const board = useRef<HTMLDivElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (game.isComplete) doneHeading.current?.focus();
  }, [game.isComplete]);

  // Arrow keys move focus around the grid by cell.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const move = moves[e.key];
    const target = e.target as HTMLElement;
    const cell = Number(target.dataset.cell);
    if (!move || Number.isNaN(cell)) return;
    const row = Math.min(rows - 1, Math.max(0, Math.floor(cell / cols) + move[0]));
    const col = Math.min(cols - 1, Math.max(0, (cell % cols) + move[1]));
    board.current?.querySelector<HTMLButtonElement>(`[data-cell="${row * cols + col}"]`)?.focus();
    e.preventDefault();
  }

  if (game.isComplete) {
    return (
      <div className="mg-jigsaw__done">
        <img className="mg-jigsaw__picture" src={src} alt={puzzle.image.alt} width={width} height={height} />
        <div className="mg-results">
          <h3 className="mg-results__heading" ref={doneHeading} tabIndex={-1}>
            {puzzle.title}
          </h3>
          <p className="mg-message" role="status">
            {game.messageText}
          </p>
        </div>
      </div>
    );
  }

  const stepped = game.grid.difficulty !== game.grid.requested;

  return (
    <>
      <div
        className="mg-jigsaw__board"
        ref={board}
        role="group"
        aria-label={`Puzzle, ${rows} rows by ${cols} columns. Pick a tile, then pick another to swap them.`}
        style={{ width, height } as CSSProperties}
        onKeyDown={onKeyDown}
      >
        {game.tiles.map((t) => (
          <button
            key={t.tile}
            type="button"
            className="mg-jigsaw__tile"
            data-cell={t.cell}
            data-tile={t.tile}
            data-in-place={t.inPlace}
            aria-pressed={t.selected}
            aria-disabled={t.inPlace || undefined}
            aria-label={t.label}
            onClick={() => game.tap(t.cell)}
            style={
              {
                width: tw,
                height: th,
                '--mg-x': `${t.col * tw}px`,
                '--mg-y': `${t.row * th}px`,
                backgroundImage: `url("${src}")`,
                backgroundSize: `${width}px ${height}px`,
                backgroundPosition: `${-t.correctCol * tw}px ${-t.correctRow * th}px`,
              } as CSSProperties
            }
          />
        ))}
        {game.peeking && <img className="mg-jigsaw__peek" src={src} alt="" aria-hidden="true" />}
      </div>

      <p className="mg-message" role="status" aria-live="polite">
        {game.messageText ?? ''}
      </p>

      <div className="mg-status">
        <span>
          In place: {game.inPlace} of {game.total}
        </span>
        {stepped && <span>Using {game.grid.difficulty} so tiles stay easy to tap.</span>}
      </div>

      <div className="mg-controls">
        <button type="button" className="mg-button mg-button--secondary" aria-pressed={game.peeking} onClick={game.togglePeek}>
          {game.peeking ? 'Hide picture' : 'Peek'}
        </button>
        <button type="button" className="mg-button mg-button--secondary" onClick={game.reveal}>
          Finish it for me
        </button>
      </div>
    </>
  );
}

/** Width of an element in CSS px, kept current with ResizeObserver. */
function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
