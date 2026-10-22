import type { ReactNode } from 'react';
import '../tokens.css';
import '../board.css';
import './moment.css';

interface MomentShellProps {
  title: string;
  /** Leave this activity. The leave button is always visible. */
  onLeave: () => void;
  /** Visible text of the leave button. Defaults to "Back". */
  leaveLabel?: string;
  children: ReactNode;
}

/** Calm frame shared by the Take a Moment activities: an always-visible Back and a title. */
export function MomentShell({ title, onLeave, leaveLabel = 'Back', children }: MomentShellProps) {
  return (
    <section className="mg-moment" aria-label={title}>
      <header className="mg-moment__bar">
        <button type="button" className="mg-moment__back" onClick={onLeave} aria-label={`${leaveLabel}, leave ${title}`}>
          <span aria-hidden="true">←</span> {leaveLabel}
        </button>
        <h2 className="mg-moment__title">{title}</h2>
      </header>
      {children}
    </section>
  );
}
