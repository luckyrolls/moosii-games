import { describe, expect, it } from 'vitest';
import { bestLetterMarks, scoreGuess } from './scoring';
import type { LetterMark } from './types';

/** Compact notation: I = in_place, E = elsewhere, . = absent. */
function marks(answer: string, guess: string): string {
  const code: Record<LetterMark, string> = { in_place: 'I', elsewhere: 'E', absent: '.' };
  return scoreGuess(answer, guess).map((m) => code[m]).join('');
}

describe('scoreGuess', () => {
  it('marks an exact match all in place', () => {
    expect(marks('PACING', 'PACING')).toBe('IIIIII');
  });

  it('marks letters not in the word absent', () => {
    expect(marks('PACING', 'TURBOS')).toBe('......');
  });

  it('marks right letters in wrong spots elsewhere', () => {
    expect(marks('PACING', 'CAPING')).toBe('EIEIII');
  });

  describe('duplicate letters', () => {
    it('PACING vs AAAAAA: only the matching A is in place, the rest absent', () => {
      expect(marks('PACING', 'AAAAAA')).toBe('.I....');
    });

    it('PACING vs AAPPCC: one copy each of A, P, C is credited; extra copies absent', () => {
      // A at 1 is in place, so the A at 0 has no copy left. First P and first C are elsewhere.
      expect(marks('PACING', 'AAPPCC')).toBe('.IE.E.');
    });

    it('SOOTHE vs OOOOOO: both Os in place, every other O absent', () => {
      expect(marks('SOOTHE', 'OOOOOO')).toBe('.II...');
    });

    it('SOOTHE vs OXXXXO: two Os elsewhere (answer has two unmatched Os)', () => {
      expect(marks('SOOTHE', 'OXXXXO')).toBe('E....E');
    });

    it('SOOTHE vs OOXXXO: second O in place consumes one; first O elsewhere; last O absent', () => {
      expect(marks('SOOTHE', 'OOXXXO')).toBe('EI....');
    });

    it('SOOTHE vs EEEEEE: only the final E is in place', () => {
      expect(marks('SOOTHE', 'EEEEEE')).toBe('.....I');
    });

    it('SOOTHE vs EXXXXX: single E elsewhere', () => {
      expect(marks('SOOTHE', 'EXXXXX')).toBe('E.....');
    });

    it('SOOTHE vs EEXXXX: one E in the answer, so only the first E is elsewhere', () => {
      expect(marks('SOOTHE', 'EEXXXX')).toBe('E.....');
    });

    it('SOOTHE vs XEXXXE: in place E wins over the earlier elsewhere candidate', () => {
      expect(marks('SOOTHE', 'XEXXXE')).toBe('.....I');
    });

    it('SOOTHE vs TOOTHS: repeated T and S handled against remaining counts', () => {
      // The only T is matched in place at index 3, so the leading T is absent; S is elsewhere.
      expect(marks('SOOTHE', 'TOOTHS')).toBe('.IIIIE');
    });
  });

  it('throws on length mismatch', () => {
    expect(() => scoreGuess('PACING', 'PACE')).toThrow(/length/);
  });
});

describe('bestLetterMarks', () => {
  it('keeps the best mark seen for each letter', () => {
    const best = bestLetterMarks([
      { word: 'CAPING', marks: scoreGuess('PACING', 'CAPING') },
      { word: 'PXXXXX', marks: scoreGuess('PACING', 'PXXXXX') },
      { word: 'TURBOS', marks: scoreGuess('PACING', 'TURBOS') },
    ]);
    expect(best.P).toBe('in_place'); // elsewhere, then in place
    expect(best.C).toBe('elsewhere');
    expect(best.A).toBe('in_place');
    expect(best.X).toBe('absent');
    expect(best.T).toBe('absent');
    expect(best.Z).toBeUndefined();
  });

  it('never downgrades a letter', () => {
    const best = bestLetterMarks([
      { word: 'PACING', marks: scoreGuess('PACING', 'PACING') },
      { word: 'AAAAAA', marks: scoreGuess('PACING', 'AAAAAA') },
    ]);
    expect(best.A).toBe('in_place');
  });
});
