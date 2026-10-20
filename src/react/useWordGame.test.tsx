// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sampleWordPuzzle } from '../core/word/testing/sampleWordPuzzle';
import type { WordPuzzle } from '../core';
import { useWordGame, type UseWordGameOptions, type WordGame } from './useWordGame';

const fixedNow = () => new Date(2026, 9, 20, 9, 0);
const DICTIONARY = new Set(['PACING', 'RACING', 'FACING', 'CAPING']);
const isValidWord = (w: string) => DICTIONARY.has(w);

function setup(options: UseWordGameOptions = {}, puzzle: WordPuzzle = sampleWordPuzzle()) {
  return renderHook<WordGame, { puzzle: WordPuzzle; options: UseWordGameOptions }>(
    (props) => useWordGame(props.puzzle, props.options),
    { initialProps: { puzzle, options: { now: fixedNow, isValidWord, ...options } } },
  );
}

function enter(get: () => WordGame, word: string) {
  for (const letter of word) act(() => void get().pressKey(letter));
  act(() => void get().pressKey('Enter'));
}

describe('useWordGame', () => {
  it('starts empty and unlimited', () => {
    const { result } = setup();
    expect(result.current.answerLength).toBe(6);
    expect(result.current.guesses).toEqual([]);
    expect(result.current.maxGuesses).toBeNull();
    expect(result.current.guessesRemaining).toBeNull();
    expect(result.current.hint).toBeNull();
    expect(result.current.answer).toBeNull();
    expect(result.current.takeaway).toBeNull();
    expect(result.current.completionEvent).toBeNull();
    expect(result.current.shareText).toBeNull();
  });

  it('pressKey handles letters, Backspace and Enter, and reports unknown keys', () => {
    const { result } = setup();
    let handled = false;
    act(() => void (handled = result.current.pressKey('p')));
    expect(handled).toBe(true);
    act(() => void result.current.pressKey('X'));
    act(() => void result.current.pressKey('Backspace'));
    expect(result.current.current).toBe('P');
    act(() => void (handled = result.current.pressKey('Tab')));
    expect(handled).toBe(false);
    act(() => result.current.typeLetter('a'));
    act(() => result.current.deleteLetter());
    expect(result.current.current).toBe('P');
    expect(result.current.canSubmit).toBe(false);
  });

  it('describes a scored guess and updates keyboard marks', () => {
    const { result } = setup();
    enter(() => result.current, 'CAPING');
    expect(result.current.messageText).toBe(
      'Guess 1: C elsewhere, A in place, P elsewhere, I in place, N in place, G in place.',
    );
    expect(result.current.letterMarks.C).toBe('elsewhere');
    expect(result.current.letterMarks.A).toBe('in_place');
  });

  it('uses the injected dictionary and the latest one passed', () => {
    const { result, rerender } = setup();
    enter(() => result.current, 'ZZZZZZ');
    expect(result.current.message).toEqual({ kind: 'not_a_word' });
    expect(result.current.guesses).toHaveLength(0);
    rerender({ puzzle: sampleWordPuzzle(), options: { now: fixedNow, isValidWord: () => true } });
    expect(result.current.current).toBe('ZZZZZZ'); // a new dictionary does not reset the game
    act(() => void result.current.pressKey('Enter'));
    expect(result.current.guesses).toHaveLength(1);
  });

  it('shows the hint, and the hint is recorded in the event', () => {
    const onComplete = vi.fn();
    const { result } = setup({ onComplete });
    act(() => result.current.showHint());
    expect(result.current.hint).toBe('Spreading your energy out');
    enter(() => result.current, 'RACING');
    enter(() => result.current, 'PACING');
    expect(result.current.status).toBe('solved');
    expect(result.current.answer).toBe('PACING');
    expect(result.current.takeaway).toBe('A test takeaway.');
    expect(result.current.completionEvent).toEqual({
      schema_version: 1,
      game: 'word',
      puzzle_id: 'test-word-1',
      outcome: 'solved',
      guesses_count: 2,
      hint_used: true,
      completed_local_date: '2026-10-20',
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.shareText?.split('\n')).toHaveLength(2);
  });

  it('capped mode reveals after the last guess and fires onComplete once', () => {
    const onComplete = vi.fn();
    const { result, rerender } = setup({ maxGuesses: 1, onComplete });
    expect(result.current.guessesRemaining).toBe(1);
    enter(() => result.current, 'RACING');
    expect(result.current.status).toBe('revealed');
    expect(result.current.guessesRemaining).toBe(0);
    expect(result.current.answer).toBe('PACING');
    expect(result.current.hint).toBe('Spreading your energy out'); // shown at the end
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'revealed', hint_used: false }));
    rerender({ puzzle: sampleWordPuzzle(), options: { now: fixedNow, isValidWord, maxGuesses: 1, onComplete } });
    act(() => void result.current.pressKey('Enter'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reveal ends the game', () => {
    const { result } = setup();
    act(() => result.current.reveal());
    expect(result.current.completionEvent?.outcome).toBe('revealed');
    expect(result.current.shareText).toBe('');
  });

  it('starts over for a different puzzle', () => {
    const { result, rerender } = setup();
    act(() => void result.current.pressKey('P'));
    rerender({ puzzle: sampleWordPuzzle({ puzzle_id: 'other', answer: 'SOOTHE' }), options: { now: fixedNow } });
    expect(result.current.current).toBe('');
    expect(result.current.puzzle.answer).toBe('SOOTHE');
  });
});
