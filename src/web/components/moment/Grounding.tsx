import { useEffect, useRef } from 'react';
import type { GroundingScript } from '../../../core';
import { useGrounding } from '../../../react';
import { MomentShell } from './MomentShell';

export interface GroundingProps {
  /** Validated script from the clinician-owned config. */
  script: GroundingScript;
  onLeave: () => void;
}

/** 5-4-3-2-1, one calm step per screen. Nothing to type, nothing stored. */
export function Grounding({ script, onLeave }: GroundingProps) {
  const g = useGrounding(script);
  const heading = useRef<HTMLHeadingElement>(null);
  const shownIndex = useRef(g.index);

  // Move focus to a newly shown step so it is read out; not on first load.
  useEffect(() => {
    if (shownIndex.current === g.index) return;
    shownIndex.current = g.index;
    heading.current?.focus();
  }, [g.index]);

  return (
    <MomentShell title="Grounding" onLeave={onLeave} leaveLabel="Stop anytime">
      <div className="mg-grounding">
        <p className="mg-grounding__count" aria-hidden="true">
          {g.step.count}
        </p>
        <h3 className="mg-grounding__heading" ref={heading} tabIndex={-1}>
          <span className="mg-visually-hidden">{g.step.count} </span>
          {g.step.heading}
        </h3>
        <p className="mg-grounding__prompt">{g.step.prompt}</p>
        <p className="mg-moment__note">
          Step {g.index + 1} of {g.total}
        </p>
      </div>

      <div className="mg-controls">
        <button type="button" className="mg-button mg-button--secondary" onClick={g.back} disabled={g.isFirst}>
          Back
        </button>
        {g.isLast ? (
          <button type="button" className="mg-button" onClick={g.restart}>
            Start again
          </button>
        ) : (
          <button type="button" className="mg-button" onClick={g.next}>
            Next
          </button>
        )}
      </div>
    </MomentShell>
  );
}
