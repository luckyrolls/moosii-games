import { useEffect, useMemo, useState } from 'react';
import { validateWordPuzzle, type WordCompletionEvent, type WordPuzzle } from '../../core';
import { useWordGame } from '../../react';
import { WordBoard } from '../components';
import { createIsValidWord, loadWordList } from '../wordlist';
import { wordFixtures } from './fixtures';
import { parsePasted } from './parsePasted';
import { CompletionOutput, ValidationErrors } from './shared';

const CUSTOM = '__custom__';
const GUESS_OPTIONS = [
  { value: 'unlimited', label: 'Unlimited' },
  { value: '6', label: '6 guesses' },
  { value: '3', label: '3 guesses' },
];

type Parsed = { ok: true; puzzle: WordPuzzle } | { ok: false; errors: string[] };

export function WordPlayground() {
  const [source, setSource] = useState(wordFixtures[0]?.path ?? CUSTOM);
  const [customText, setCustomText] = useState('');
  const [guessSetting, setGuessSetting] = useState('unlimited');
  const maxGuesses = guessSetting === 'unlimited' ? null : Number(guessSetting);
  const [round, setRound] = useState(0);

  const parsed = useMemo<Parsed>(() => {
    if (source === CUSTOM) return parsePasted(customText, validateWordPuzzle);
    const entry = wordFixtures.find((f) => f.path === source);
    if (!entry) return { ok: false, errors: [`Fixture ${source} not found.`] };
    return validateWordPuzzle(entry.data);
  }, [source, customText]);

  return (
    <>
      <fieldset className="pg-controls">
        <legend>Setup</legend>
        <label className="pg-field">
          <span>Puzzle</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {wordFixtures.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
            <option value={CUSTOM}>Paste JSON…</option>
          </select>
        </label>
        <label className="pg-field">
          <span>Guess limit</span>
          <select value={guessSetting} onChange={(e) => setGuessSetting(e.target.value)}>
            {GUESS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="pg-button" onClick={() => setRound((r) => r + 1)}>
          Restart
        </button>
        {source === CUSTOM && (
          <label className="pg-field pg-field--wide">
            <span>Puzzle JSON</span>
            <textarea rows={8} value={customText} onChange={(e) => setCustomText(e.target.value)} spellCheck={false} />
          </label>
        )}
      </fieldset>

      {parsed.ok ? (
        <WordGameWithDictionary
          key={`${source}|${parsed.puzzle.puzzle_id}|${guessSetting}|${round}`}
          puzzle={parsed.puzzle}
          maxGuesses={maxGuesses}
        />
      ) : (
        <ValidationErrors source={source === CUSTOM ? 'Pasted JSON' : source} errors={parsed.errors} />
      )}
    </>
  );
}

type Dictionary = { status: 'loading' } | { status: 'ready'; isValidWord: (w: string) => boolean } | { status: 'error'; message: string };

/** Loads the word list for the answer's length, then starts the game. */
function WordGameWithDictionary({ puzzle, maxGuesses }: { puzzle: WordPuzzle; maxGuesses: number | null }) {
  const [dictionary, setDictionary] = useState<Dictionary>({ status: 'loading' });
  const length = puzzle.answer.length;

  useEffect(() => {
    let current = true;
    loadWordList(length).then(
      (words) => current && setDictionary({ status: 'ready', isValidWord: createIsValidWord(words) }),
      (err: Error) => current && setDictionary({ status: 'error', message: err.message }),
    );
    return () => {
      current = false;
    };
  }, [length]);

  if (dictionary.status === 'loading') return <p className="pg-note" role="status">Loading word list…</p>;
  if (dictionary.status === 'error') {
    return (
      <div className="pg-error" role="alert">
        <h2>Couldn’t load the word list</h2>
        <p>{dictionary.message}</p>
      </div>
    );
  }
  return <WordGameView puzzle={puzzle} maxGuesses={maxGuesses} isValidWord={dictionary.isValidWord} />;
}

function WordGameView({
  puzzle,
  maxGuesses,
  isValidWord,
}: {
  puzzle: WordPuzzle;
  maxGuesses: number | null;
  isValidWord: (w: string) => boolean;
}) {
  const [received, setReceived] = useState<WordCompletionEvent[]>([]);
  const game = useWordGame(puzzle, {
    maxGuesses,
    isValidWord,
    onComplete: (event) => setReceived((list) => [...list, event]),
  });

  return (
    <>
      <WordBoard game={game} />
      {game.isComplete && (
        <CompletionOutput event={game.completionEvent} deliveries={received.length} shareText={game.shareText} />
      )}
    </>
  );
}
