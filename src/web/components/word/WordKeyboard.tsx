import type { PointerEvent } from 'react';
import type { LetterMark } from '../../../core';
import { MarkIcon } from './MarkIcon';
import { MARK_LABEL } from './markLabels';

/** QWERTY rows, each split in two halves. Wide boards show halves side by side; narrow boards stack them. */
const ROWS: [string, string][] = [
  ['QWERT', 'YUIOP'],
  ['ASDFG', 'HJKL'],
  ['ZXCVB', 'NM'],
];

interface WordKeyboardProps {
  letterMarks: Partial<Record<string, LetterMark>>;
  disabled: boolean;
  onKey: (key: string) => void;
}

// Keep pointer taps from moving focus onto the key, so a physical Enter afterwards submits the
// guess instead of re-pressing the last tapped key. Keyboard users can still Tab to every key.
const keepFocus = (e: PointerEvent) => e.preventDefault();

export function WordKeyboard({ letterMarks, disabled, onKey }: WordKeyboardProps) {
  return (
    <div className="mg-keyboard" role="group" aria-label="Keyboard">
      {ROWS.map((halves, r) => (
        <div className="mg-keyboard__row" key={r}>
          {halves.map((letters) => (
            <div className="mg-keyboard__half" key={letters}>
              {[...letters].map((letter) => {
                const mark = letterMarks[letter];
                return (
                  <button
                    key={letter}
                    type="button"
                    className={['mg-key', mark ? `mg-key--${mark}` : ''].join(' ')}
                    aria-label={mark ? `${letter}, ${MARK_LABEL[mark]}` : letter}
                    disabled={disabled}
                    onPointerDown={keepFocus}
                    onClick={() => onKey(letter)}
                  >
                    {letter}
                    {mark && <MarkIcon mark={mark} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ))}
      <div className="mg-keyboard__row mg-keyboard__actions">
        <button type="button" className="mg-key mg-key--action" disabled={disabled} onPointerDown={keepFocus} onClick={() => onKey('Backspace')}>
          Delete
        </button>
        <button type="button" className="mg-key mg-key--action mg-key--enter" disabled={disabled} onPointerDown={keepFocus} onClick={() => onKey('Enter')}>
          Enter
        </button>
      </div>
    </div>
  );
}
