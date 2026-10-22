import { useEffect, useId, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useRipples } from '../../../react';
import { browserClock } from './clock';
import { MomentShell } from './MomentShell';

export interface RipplePondProps {
  onLeave: () => void;
}

const DRIFT_SECONDS = [17, 21, 25];
const STEP = 0.05;

/** Tap the water to make ripples. Leaves drift, and move a little when a ripple lands near them. */
export function RipplePond({ onLeave }: RipplePondProps) {
  const reducedMotion = usePrefersReducedMotion();
  const pond = useRipples({ clock: browserClock, reducedMotion });
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const helpId = useId();

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    pond.tap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      setCursor((c) => ({ x: Math.min(0.95, Math.max(0.05, c.x + move[0])), y: Math.min(0.95, Math.max(0.05, c.y + move[1])) }));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pond.tap(cursor.x, cursor.y);
    }
  }

  return (
    <MomentShell title="Ripple Pond" onLeave={onLeave}>
      <p className="mg-moment__note" id={helpId}>
        Tap the water anywhere. With a keyboard, use the arrow keys to move and Enter to make a ripple.
      </p>
      <div
        className="mg-pond"
        role="button"
        tabIndex={0}
        aria-label="Pond"
        aria-describedby={helpId}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        style={{ '--mg-ripple-ms': `${pond.config.rippleLifetimeMs}ms` } as CSSProperties}
      >
        {pond.leaves.map((leaf, i) => (
          <span
            key={leaf.id}
            className="mg-leaf"
            style={{ left: `${leaf.x * 100}%`, top: `${leaf.y * 100}%`, '--mg-leaf-rot': `${leaf.rotation}deg` } as CSSProperties}
            aria-hidden="true"
          >
            <span className="mg-leaf__drift" style={{ animationDuration: `${DRIFT_SECONDS[i % DRIFT_SECONDS.length]}s` }}>
              <svg viewBox="0 0 40 24" focusable="false">
                <path d="M2 12 C 10 1, 30 1, 38 12 C 30 23, 10 23, 2 12 Z" />
                <path className="mg-leaf__vein" d="M4 12 H 34" />
              </svg>
            </span>
          </span>
        ))}

        {pond.ripples.map((r) => (
          <span
            key={r.id}
            className="mg-ripple"
            aria-hidden="true"
            style={
              {
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                '--mg-ripple-size': `${pond.config.maxRadius * 200}cqmin`,
                '--mg-ripple-size-reduced': `${pond.config.reducedRadius * 200}cqmin`,
                animationDelay: `${-r.ageMs}ms`,
              } as CSSProperties
            }
          />
        ))}

        <span className="mg-pond__cursor" aria-hidden="true" style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }} />
      </div>
    </MomentShell>
  );
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Tracks prefers-reduced-motion (including live changes) so ripple state matches what CSS shows. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_MOTION).matches);
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}
