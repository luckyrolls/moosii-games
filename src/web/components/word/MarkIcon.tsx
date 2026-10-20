import type { LetterMark } from '../../../core';

/** Small shape shown alongside colour: filled disc, ring, or dash. */
export function MarkIcon({ mark }: { mark: LetterMark }) {
  return (
    <svg className="mg-mark-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {mark === 'in_place' && <circle cx="6" cy="6" r="5" />}
      {mark === 'elsewhere' && <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="2" />}
      {mark === 'absent' && <rect x="1" y="5" width="10" height="2" rx="1" />}
    </svg>
  );
}
