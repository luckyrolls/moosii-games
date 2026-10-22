import { useMemo, useState } from 'react';
import { validateBreathingPatterns, validateGroundingScript } from '../../core';
import { BreathingGarden, Grounding, RipplePond } from '../components';
import { momentFixtures } from './fixtures';
import type { MomentChoice } from './moments';
import { ValidationErrors } from './shared';

const BREATHING_FILES = momentFixtures.filter((f) => f.path.includes('breathing'));
const GROUNDING_FILE = momentFixtures.find((f) => f.path === 'fixtures/moment/grounding.json');

/** Opens one Take a Moment activity, validating its clinician-owned config first. */
export function MomentView({ moment, onLeave }: { moment: MomentChoice; onLeave: () => void }) {
  const [breathingFile, setBreathingFile] = useState(BREATHING_FILES.find((f) => !f.path.includes('/invalid/'))?.path ?? '');

  const breathing = useMemo(() => {
    const entry = BREATHING_FILES.find((f) => f.path === breathingFile);
    return entry ? validateBreathingPatterns(entry.data) : { ok: false as const, errors: ['No breathing config found.'] };
  }, [breathingFile]);
  const grounding = useMemo(
    () => (GROUNDING_FILE ? validateGroundingScript(GROUNDING_FILE.data) : { ok: false as const, errors: ['No grounding script found.'] }),
    [],
  );

  if (moment === 'pond') return <RipplePond onLeave={onLeave} />;

  if (moment === 'grounding') {
    return grounding.ok ? (
      <Grounding script={grounding.value} onLeave={onLeave} />
    ) : (
      <ConfigError source="fixtures/moment/grounding.json" errors={grounding.errors} onLeave={onLeave} />
    );
  }

  return (
    <>
      {BREATHING_FILES.length > 1 && (
        <label className="pg-field">
          <span>Breathing config (playground only)</span>
          <select value={breathingFile} onChange={(e) => setBreathingFile(e.target.value)}>
            {BREATHING_FILES.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
          </select>
        </label>
      )}
      {breathing.ok ? (
        <BreathingGarden patterns={breathing.value.patterns} onLeave={onLeave} />
      ) : (
        <ConfigError source={breathingFile} errors={breathing.errors} onLeave={onLeave} />
      )}
    </>
  );
}

function ConfigError({ source, errors, onLeave }: { source: string; errors: string[]; onLeave: () => void }) {
  return (
    <>
      <button type="button" className="pg-button" onClick={onLeave}>
        ← Back
      </button>
      <ValidationErrors source={source} errors={errors} heading="This activity’s config isn’t valid" />
    </>
  );
}
