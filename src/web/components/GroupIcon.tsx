import type { Difficulty } from '../../core';

/** A distinct shape per difficulty, so groups can be told apart without colour. */
const SHAPES: Record<Difficulty, string> = {
  1: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', // circle
  2: 'M12 3 22 20H2z', // triangle
  3: 'M4 4h16v16H4z', // square
  4: 'M12 2 22 12 12 22 2 12z', // diamond
};

export function GroupIcon({ difficulty }: { difficulty: Difficulty }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={SHAPES[difficulty]} />
    </svg>
  );
}
