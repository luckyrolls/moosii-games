import { describe, expect, it, vi } from 'vitest';
import { createWordState, wordReducer, type WordAction, type WordConfig, type WordState } from './engine';
import { wordMessageText } from './messages';
import { bestLetterMarks } from './scoring';
import { sampleWordPuzzle } from './testing/sampleWordPuzzle';

const DICTIONARY = new Set(['PACING', 'CAPING', 'TURBOS', 'PLACID', 'RACING', 'FACING', 'LACING']);
const isValidWord = (w: string) => DICTIONARY.has(w);

function start(config: Partial<WordConfig> = {}): WordState {
  return createWordState(sampleWordPuzzle(), { isValidWord, ...config });
}

function run(state: WordState, ...actions: WordAction[]): WordState {
  return actions.reduce(wordReducer, state);
}

function type(state: WordState, word: string): WordState {
  return run(state, ...[...word].map((letter): WordAction => ({ type: 'type_letter', letter })));
}

function guess(state: WordState, word: string): WordState {
  return run(type(state, word), { type: 'submit' });
}

describe('typing', () => {
  it('types uppercase letters up to the answer length', () => {
    const s = type(start(), 'pacingxx');
    expect(s.current).toBe('PACING');
  });

  it('ignores non-letters', () => {
    const s = run(start(), { type: 'type_letter', letter: '1' }, { type: 'type_letter', letter: 'É' }, { type: 'type_letter', letter: 'Enter' });
    expect(s.current).toBe('');
  });

  it('deletes the last letter', () => {
    const s = run(type(start(), 'PAC'), { type: 'delete_letter' });
    expect(s.current).toBe('PA');
    expect(run(start(), { type: 'delete_letter' }).current).toBe('');
  });
});

describe('submitting', () => {
  it('asks for all letters when the row is short (no turn used)', () => {
    const s = guess(start(), 'PAC');
    expect(s.message).toEqual({ kind: 'too_short', needed: 6 });
    expect(s.guesses).toHaveLength(0);
    expect(s.current).toBe('PAC');
  });

  it('scores a valid guess and clears the row', () => {
    const s = guess(start(), 'CAPING');
    expect(s.guesses).toEqual([{ word: 'CAPING', marks: ['elsewhere', 'in_place', 'elsewhere', 'in_place', 'in_place', 'in_place'] }]);
    expect(s.current).toBe('');
    expect(s.message).toEqual({ kind: 'scored' });
    expect(wordMessageText(s.message!, s)).toBe(
      'Guess 1: C elsewhere, A in place, P elsewhere, I in place, N in place, G in place.',
    );
  });

  it('rejects a word the injected dictionary refuses (no turn used, letters kept)', () => {
    const spy = vi.fn(isValidWord);
    const s = guess(start({ isValidWord: spy }), 'XXXXXX');
    expect(spy).toHaveBeenCalledWith('XXXXXX');
    expect(s.message).toEqual({ kind: 'not_a_word' });
    expect(s.guesses).toHaveLength(0);
    expect(s.current).toBe('XXXXXX');
  });

  it('always accepts the answer, even if the dictionary does not', () => {
    const s = guess(start({ isValidWord: () => false }), 'PACING');
    expect(s.status).toBe('solved');
  });

  it('defaults to accepting any word when no dictionary is injected', () => {
    const s = guess(createWordState(sampleWordPuzzle()), 'QQQQQQ');
    expect(s.guesses).toHaveLength(1);
  });

  it('flags a repeated guess without using a turn', () => {
    let s = guess(start(), 'RACING');
    s = guess(s, 'RACING');
    expect(s.message).toEqual({ kind: 'already_guessed' });
    expect(s.guesses).toHaveLength(1);
  });

  it('solving ends the game', () => {
    let s = guess(start(), 'RACING');
    s = guess(s, 'PACING');
    expect(s.status).toBe('solved');
    expect(s.message).toEqual({ kind: 'solved' });
    expect(wordMessageText(s.message!, s)).toBe('You found it: PACING.');
    expect(s.guesses).toHaveLength(2);
  });
});

describe('guess limits', () => {
  it('unlimited (null, the default) never ends on guesses', () => {
    expect(createWordState(sampleWordPuzzle()).config.maxGuesses).toBeNull();
    let s = start();
    for (const w of ['RACING', 'FACING', 'LACING', 'CAPING', 'TURBOS', 'PLACID']) s = guess(s, w);
    expect(s.status).toBe('playing');
    expect(s.guesses).toHaveLength(6);
    expect(guess(s, 'PACING').status).toBe('solved');
  });

  it('capped mode reveals after the last allowed guess', () => {
    let s = start({ maxGuesses: 2 });
    s = guess(s, 'RACING');
    s = guess(s, 'NOTAWD'); // invalid: does not count
    expect(s.guesses).toHaveLength(1);
    s = run(s, { type: 'delete_letter' }, { type: 'delete_letter' }, { type: 'delete_letter' },
      { type: 'delete_letter' }, { type: 'delete_letter' }, { type: 'delete_letter' });
    s = guess(s, 'FACING');
    expect(s.status).toBe('revealed');
    expect(s.message).toEqual({ kind: 'revealed', reason: 'out_of_guesses' });
    expect(wordMessageText(s.message!, s)).toBe('That was the last guess. The word was PACING.');
  });

  it('solving on the last allowed guess counts as solved', () => {
    const s = guess(guess(start({ maxGuesses: 2 }), 'RACING'), 'PACING');
    expect(s.status).toBe('solved');
  });
});

describe('hint and reveal', () => {
  it('shows the hint once and records it', () => {
    const s = run(start(), { type: 'show_hint' });
    expect(s.hintShown).toBe(true);
    expect(run(s, { type: 'show_hint' })).toBe(s);
  });

  it('reveal ends the game as revealed', () => {
    const s = run(type(start(), 'PA'), { type: 'reveal' });
    expect(s.status).toBe('revealed');
    expect(s.message).toEqual({ kind: 'revealed', reason: 'player' });
    expect(s.current).toBe('');
  });

  it('ignores every action once complete', () => {
    const done = run(start(), { type: 'reveal' });
    for (const action of [
      { type: 'type_letter', letter: 'A' },
      { type: 'delete_letter' },
      { type: 'submit' },
      { type: 'show_hint' },
      { type: 'reveal' },
    ] satisfies WordAction[]) {
      expect(wordReducer(done, action)).toBe(done);
    }
  });
});

describe('keyboard state', () => {
  it('tracks the best mark for each letter across guesses', () => {
    let s = guess(start(), 'CAPING');
    s = guess(s, 'PLACID');
    const best = bestLetterMarks(s.guesses);
    expect(best.P).toBe('in_place');
    expect(best.L).toBe('absent');
    expect(best.C).toBe('elsewhere');
  });
});
