import { useMemo, useState } from 'react';
import { validatePuzzle, type GroupsCompletionEvent, type GroupsPuzzle } from '../../core';
import { useGroupsGame } from '../../react';
import { GroupsBoard } from '../components';
import { fixtures } from './fixtures';
import { parsePasted } from './parsePasted';
import { CompletionOutput, ValidationErrors } from './shared';

const CUSTOM = '__custom__';
const MISTAKE_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed (no limit)' },
  { value: '4', label: '4 mistakes' },
  { value: '2', label: '2 mistakes' },
];

type Parsed = { ok: true; puzzle: GroupsPuzzle } | { ok: false; errors: string[] };

function parseCustom(text: string): Parsed {
  return parsePasted(text, validatePuzzle);
}

export function GroupsPlayground() {
  const [source, setSource] = useState(fixtures[0]?.path ?? CUSTOM);
  const [customText, setCustomText] = useState('');
  const [mistakeSetting, setMistakeSetting] = useState('relaxed');
  const maxMistakes = mistakeSetting === 'relaxed' ? null : Number(mistakeSetting);
  const [round, setRound] = useState(0);

  const parsed = useMemo<Parsed>(() => {
    if (source === CUSTOM) return parseCustom(customText);
    const entry = fixtures.find((f) => f.path === source);
    if (!entry) return { ok: false, errors: [`Fixture ${source} not found.`] };
    return validatePuzzle(entry.data);
  }, [source, customText]);

  return (
    <>
      <fieldset className="pg-controls">
        <legend>Setup</legend>
        <label className="pg-field">
          <span>Puzzle</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {fixtures.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
            <option value={CUSTOM}>Paste JSON…</option>
          </select>
        </label>
        <label className="pg-field">
          <span>Mistake limit</span>
          <select value={mistakeSetting} onChange={(e) => setMistakeSetting(e.target.value)}>
            {MISTAKE_OPTIONS.map((o) => (
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
            <textarea
              rows={8}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              spellCheck={false}
            />
          </label>
        )}
      </fieldset>

      {parsed.ok ? (
        <GroupsGame key={`${source}|${parsed.puzzle.puzzle_id}|${mistakeSetting}|${round}`} puzzle={parsed.puzzle} maxMistakes={maxMistakes} />
      ) : (
        <ValidationErrors source={source === CUSTOM ? 'Pasted JSON' : source} errors={parsed.errors} />
      )}
    </>
  );
}

function GroupsGame({ puzzle, maxMistakes }: { puzzle: GroupsPuzzle; maxMistakes: number | null }) {
  const [received, setReceived] = useState<GroupsCompletionEvent[]>([]);
  const game = useGroupsGame(puzzle, {
    maxMistakes,
    onComplete: (event) => setReceived((list) => [...list, event]),
  });

  return (
    <>
      <GroupsBoard game={game} />
      {game.isComplete && (
        <CompletionOutput event={game.completionEvent} deliveries={received.length} shareText={game.shareText} />
      )}
    </>
  );
}
