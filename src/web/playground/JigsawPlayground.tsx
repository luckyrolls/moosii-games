import { useMemo, useState } from 'react';
import { validateJigsawPuzzle, type JigsawCompletionEvent } from '../../core';
import { JigsawBoard } from '../components';
import { jigsawFixtures, jigsawImageUrls } from './fixtures';
import { CompletionOutput, ValidationErrors } from './shared';

export function JigsawPlayground({ onBack }: { onBack: () => void }) {
  const [source, setSource] = useState(jigsawFixtures[0]?.path ?? '');
  const [round, setRound] = useState(0);
  const [received, setReceived] = useState<JigsawCompletionEvent[]>([]);

  const parsed = useMemo(() => {
    const entry = jigsawFixtures.find((f) => f.path === source);
    return entry ? validateJigsawPuzzle(entry.data) : { ok: false as const, errors: [`Fixture ${source} not found.`] };
  }, [source]);

  const imageSrc = parsed.ok ? jigsawImageUrls[parsed.puzzle.image.src] : undefined;
  const last = received[received.length - 1];

  return (
    <>
      <fieldset className="pg-controls">
        <legend>Setup</legend>
        <label className="pg-field">
          <span>Puzzle</span>
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setReceived([]);
            }}
          >
            {jigsawFixtures.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="pg-button"
          onClick={() => {
            setRound((r) => r + 1);
            setReceived([]);
          }}
        >
          Restart
        </button>
      </fieldset>

      {!parsed.ok ? (
        <ValidationErrors source={source} errors={parsed.errors} />
      ) : !imageSrc ? (
        <ValidationErrors source={source} errors={[`image.src: no fixture image at fixtures/jigsaw/${parsed.puzzle.image.src}`]} />
      ) : (
        <>
          <JigsawBoard
            key={`${source}|${round}`}
            puzzle={parsed.puzzle}
            imageSrc={imageSrc}
            onBack={onBack}
            onComplete={(e) => setReceived((list) => [...list, e])}
          />
          {last && <CompletionOutput event={last} deliveries={received.length} shareText={null} />}
        </>
      )}
    </>
  );
}
