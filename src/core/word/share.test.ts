import { describe, expect, it } from 'vitest';
import { buildWordShareText } from './share';
import { buildWordCompletionEvent } from './completion';
import { createWordState, wordReducer, type WordAction, type WordState } from './engine';
import { scoreGuess } from './scoring';
import { sampleWordPuzzle } from './testing/sampleWordPuzzle';

const BLUE = '\u{1F535}';
const ORANGE = '\u{1F7E0}';
const WHITE = '⚪';

function guess(state: WordState, word: string): WordState {
  const actions: WordAction[] = [...word].map((letter) => ({ type: 'type_letter', letter }));
  return [...actions, { type: 'submit' } as const].reduce(wordReducer, state);
}

describe('buildWordShareText', () => {
  it('renders one row of circles per guess', () => {
    const text = buildWordShareText([
      { word: 'CAPING', marks: scoreGuess('PACING', 'CAPING') },
      { word: 'PACING', marks: scoreGuess('PACING', 'PACING') },
    ]);
    expect(text).toBe(`${ORANGE}${BLUE}${ORANGE}${BLUE}${BLUE}${BLUE}\n${BLUE.repeat(6)}`);
  });

  it('uses only the three allowed symbols, and no letters, words or numbers', () => {
    const text = buildWordShareText([
      { word: 'TURBOS', marks: scoreGuess('PACING', 'TURBOS') },
      { word: 'AAAAAA', marks: scoreGuess('PACING', 'AAAAAA') },
    ]);
    const symbols = new Set([...text.replace(/\n/g, '')]);
    expect([...symbols].every((c) => [BLUE, ORANGE, WHITE].includes(c))).toBe(true);
    expect(text).not.toMatch(/[A-Za-z0-9]/);
    for (const banned of ['\u{1F7E9}', '\u{1F7E8}', '⬜', '⬛']) expect(text).not.toContain(banned);
  });

  it('is empty with no guesses', () => {
    expect(buildWordShareText([])).toBe('');
  });
});

describe('buildWordCompletionEvent', () => {
  const when = new Date(2026, 9, 20, 8, 0);

  it('is null while playing', () => {
    expect(buildWordCompletionEvent(createWordState(sampleWordPuzzle()), when)).toBeNull();
  });

  it('describes a solved game with hint used', () => {
    let s = createWordState(sampleWordPuzzle());
    s = wordReducer(s, { type: 'show_hint' });
    s = guess(s, 'RACING');
    s = guess(s, 'PACING');
    expect(buildWordCompletionEvent(s, when)).toEqual({
      schema_version: 1,
      game: 'word',
      puzzle_id: 'test-word-1',
      outcome: 'solved',
      guesses_count: 2,
      hint_used: true,
      completed_local_date: '2026-10-20',
    });
  });

  it('describes a revealed game without hint', () => {
    const s = wordReducer(guess(createWordState(sampleWordPuzzle()), 'RACING'), { type: 'reveal' });
    const event = buildWordCompletionEvent(s, when);
    expect(event).toMatchObject({ outcome: 'revealed', guesses_count: 1, hint_used: false });
  });

  it('carries no points and no guessed words or answer', () => {
    let s = createWordState(sampleWordPuzzle());
    s = guess(s, 'RACING');
    s = guess(s, 'PACING');
    const event = buildWordCompletionEvent(s, when)!;
    expect(Object.keys(event).sort()).toEqual(
      ['completed_local_date', 'game', 'guesses_count', 'hint_used', 'outcome', 'puzzle_id', 'schema_version'],
    );
    const json = JSON.stringify(event);
    expect(json).not.toMatch(/point|score|moosie/i);
    expect(json).not.toContain('RACING');
    expect(json).not.toContain('PACING');
  });
});
