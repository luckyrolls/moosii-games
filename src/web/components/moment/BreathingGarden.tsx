import { useState, type CSSProperties } from 'react';
import type { BreathingPattern } from '../../../core';
import { useBreathing } from '../../../react';
import { browserClock } from './clock';
import { MomentShell } from './MomentShell';

export interface BreathingGardenProps {
  /** Validated patterns from the clinician-owned config. */
  patterns: BreathingPattern[];
  onLeave: () => void;
}

const SESSIONS: { label: string; ms: number | null }[] = [
  { label: '1 min', ms: 60_000 },
  { label: '3 min', ms: 180_000 },
  { label: '5 min', ms: 300_000 },
  { label: 'No timer', ms: null },
];

const PETALS = Array.from({ length: 8 }, (_, i) => i * 45);

/** A flower that opens as you breathe in and closes as you breathe out. */
export function BreathingGarden({ patterns, onLeave }: BreathingGardenProps) {
  const [patternId, setPatternId] = useState(patterns[0]?.id ?? '');
  const [sessionMs, setSessionMs] = useState<number | null>(null);
  const pattern = patterns.find((p) => p.id === patternId) ?? patterns[0];
  if (!pattern) {
    return (
      <MomentShell title="Breathing Garden" onLeave={onLeave}>
        <p>No breathing patterns are available.</p>
      </MomentShell>
    );
  }
  return (
    <MomentShell title="Breathing Garden" onLeave={onLeave}>
      <Garden
        key={pattern.id}
        pattern={pattern}
        patterns={patterns}
        onPattern={setPatternId}
        sessionMs={sessionMs}
        onSession={setSessionMs}
      />
    </MomentShell>
  );
}

function Garden({
  pattern,
  patterns,
  onPattern,
  sessionMs,
  onSession,
}: {
  pattern: BreathingPattern;
  patterns: BreathingPattern[];
  onPattern: (id: string) => void;
  sessionMs: number | null;
  onSession: (ms: number | null) => void;
}) {
  const breath = useBreathing(pattern, { clock: browserClock, sessionMs });
  const open = breath.phase === 'inhale' || breath.phase === 'hold_in';
  const style = { '--mg-breath-ms': `${Math.round(breath.phaseRemainingMs)}ms` } as CSSProperties;

  return (
    <div className="mg-breath">
      <div className="mg-flower" data-open={open} data-running={breath.running} style={style} aria-hidden="true">
        <svg viewBox="-100 -100 200 200" className="mg-flower__svg" focusable="false">
          <g className="mg-flower__outer">
            {PETALS.map((deg) => (
              <ellipse key={deg} cx="0" cy="-48" rx="22" ry="46" transform={`rotate(${deg})`} />
            ))}
          </g>
          <g className="mg-flower__inner">
            {PETALS.map((deg) => (
              <ellipse key={deg} cx="0" cy="-30" rx="15" ry="30" transform={`rotate(${deg + 22.5})`} />
            ))}
          </g>
          <circle className="mg-flower__centre" r="17" />
        </svg>
      </div>

      <p className="mg-breath__phase" aria-live="polite">
        {breath.phaseText ?? ' '}
      </p>

      <div className="mg-breath__primary">
        {breath.running ? (
          <button type="button" className="mg-button mg-button--secondary" onClick={breath.stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="mg-button" onClick={breath.start}>
            Start
          </button>
        )}
      </div>
      <p className="mg-moment__note">Follow the flower if you like, or just watch.</p>

      {patterns.length > 1 && (
        <fieldset className="mg-chips">
          <legend>Pattern</legend>
          {patterns.map((p) => (
            <label key={p.id} className="mg-chip">
              <input type="radio" name="mg-breath-pattern" checked={p.id === pattern.id} onChange={() => onPattern(p.id)} />
              <span>{p.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      <fieldset className="mg-chips">
        <legend>How long</legend>
        {SESSIONS.map((s) => (
          <label key={s.label} className="mg-chip">
            <input type="radio" name="mg-breath-session" checked={sessionMs === s.ms} onChange={() => onSession(s.ms)} />
            <span>{s.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="mg-chips mg-pace">
        <legend>Pace</legend>
        <button type="button" className="mg-button mg-button--secondary" onClick={breath.slower} disabled={!breath.canSlower}>
          Slower
        </button>
        <span className="mg-pace__text" aria-live="polite">
          {breath.paceText}
        </span>
        <button type="button" className="mg-button mg-button--secondary" onClick={breath.faster} disabled={!breath.canFaster}>
          Faster
        </button>
      </fieldset>
    </div>
  );
}
