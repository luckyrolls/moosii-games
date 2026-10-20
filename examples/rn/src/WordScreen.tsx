import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  WORD_DISPLAY_NAME,
  describeGuess,
  validateWordPuzzle,
  type LetterMark,
  type WordCompletionEvent,
  type WordPuzzle,
} from '../../../src/core';
import { useWordGame } from '../../../src/react';
import { wordFixtures } from './fixtures';
import { isValidWord } from './wordList';
import { Button, colors, CompletionOutput, LiveMessage, MIN_TAP, styles as ui, ValidationErrors } from './ui';

// QWERTY halves stacked five wide, as on narrow web boards, so every key stays >= 44pt.
const KEY_ROWS = ['QWERT', 'YUIOP', 'ASDFG', 'HJKL', 'ZXCVB', 'NM'];
const MARK_WORD: Record<LetterMark, string> = { in_place: 'in place', elsewhere: 'elsewhere', absent: 'not in the word' };

export function WordScreen() {
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  const fixture = wordFixtures[index]!;
  const parsed = useMemo(() => validateWordPuzzle(fixture.data), [fixture]);

  return (
    <View style={s.screen}>
      <Text style={ui.h3}>Puzzle</Text>
      <View style={ui.row}>
        {wordFixtures.map((f, i) => (
          <Button key={f.path} label={f.path.replace('word/', '').replace('.json', '')} selected={i === index} onPress={() => setIndex(i)} />
        ))}
        <Button label="Restart" onPress={() => setRound((r) => r + 1)} />
      </View>
      {parsed.ok ? (
        <WordGame key={`${fixture.path}|${round}`} puzzle={parsed.puzzle} />
      ) : (
        <ValidationErrors source={fixture.path} errors={parsed.errors} />
      )}
    </View>
  );
}

function WordGame({ puzzle }: { puzzle: WordPuzzle }) {
  const [received, setReceived] = useState<WordCompletionEvent[]>([]);
  const game = useWordGame(puzzle, { isValidWord, onComplete: (e) => setReceived((list) => [...list, e]) });

  return (
    <View style={s.screen}>
      <Text style={ui.h2} accessibilityRole="header">
        {WORD_DISPLAY_NAME}
      </Text>
      <Text style={ui.muted}>{puzzle.title}</Text>
      <Text style={ui.body}>● in place · ○ elsewhere · – not in the word</Text>

      {game.hint !== null && (
        <Text style={s.hint}>
          <Text style={{ fontWeight: '700' }}>Hint: </Text>
          {game.hint}
        </Text>
      )}

      <View style={s.grid}>
        {game.guesses.map((g, i) => (
          <View key={g.word} style={s.gridRow} accessible accessibilityLabel={describeGuess(g, i + 1)}>
            {[...g.word].map((letter, j) => (
              <Cell key={j} letter={letter} mark={g.marks[j]} />
            ))}
          </View>
        ))}
        {!game.isComplete && (
          <View
            style={s.gridRow}
            accessible
            accessibilityLabel={`Current guess: ${[...game.current].join(' ') || 'empty'}. ${game.current.length} of ${game.answerLength} letters.`}
          >
            {Array.from({ length: game.answerLength }, (_, j) => (
              <Cell key={j} letter={game.current[j] ?? ''} />
            ))}
          </View>
        )}
      </View>

      <LiveMessage text={game.isComplete ? null : game.messageText} />

      {!game.isComplete ? (
        <>
          <View style={s.keyboard}>
            {KEY_ROWS.map((row) => (
              <View key={row} style={s.keyRow}>
                {[...row].map((letter) => {
                  const mark = game.letterMarks[letter];
                  return (
                    <Pressable
                      key={letter}
                      onPress={() => game.typeLetter(letter)}
                      accessibilityRole="button"
                      accessibilityLabel={mark ? `${letter}, ${MARK_WORD[mark]}` : letter}
                      style={({ pressed }) => [s.key, mark && keyStyle[mark], pressed && ui.pressed]}
                    >
                      <Text style={[s.keyText, mark && keyTextStyle[mark]]}>
                        {letter}
                        {mark === 'absent' ? ' –' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <View style={s.keyRow}>
              <Button label="Delete" onPress={game.deleteLetter} />
              <Button label="Enter" primary onPress={game.submit} />
            </View>
          </View>
          <View style={ui.row}>
            <Button label={game.hintShown ? 'Hint shown' : 'Show hint'} onPress={game.showHint} disabled={game.hintShown} />
            <Button label="Show answer" onPress={game.reveal} />
          </View>
        </>
      ) : (
        <View style={s.results}>
          <Text style={ui.h3} accessibilityRole="header">
            {game.status === 'solved' ? 'Solved' : 'Answer shown'}
          </Text>
          <Text style={ui.body}>{game.messageText}</Text>
          <Text style={s.answer} accessibilityLabel={`The word: ${game.answer ?? ''}`}>
            {game.answer}
          </Text>
          <Text style={s.takeaway}>{game.takeaway}</Text>
          <CompletionOutput event={game.completionEvent} deliveries={received.length} shareText={game.shareText} />
        </View>
      )}
    </View>
  );
}

function Cell({ letter, mark }: { letter: string; mark?: LetterMark }) {
  return (
    <View style={[s.cell, mark === 'absent' && s.cellAbsent]}>
      <View style={[s.disc, mark === 'in_place' && s.discInPlace, mark === 'elsewhere' && s.discElsewhere]}>
        <Text style={[s.cellText, mark === 'in_place' && { color: '#ffffff' }, mark === 'absent' && { color: colors.muted }]}>
          {letter}
        </Text>
      </View>
      {mark === 'absent' && <View style={s.dash} />}
    </View>
  );
}

const keyStyle = StyleSheet.create({
  in_place: { backgroundColor: colors.inPlace, borderColor: colors.inPlace },
  elsewhere: { borderColor: colors.elsewhere, borderWidth: 3 },
  absent: { backgroundColor: 'transparent', borderStyle: 'dashed' },
});
const keyTextStyle = StyleSheet.create({
  in_place: { color: '#ffffff' },
  elsewhere: { color: colors.text },
  absent: { color: colors.muted, textDecorationLine: 'line-through', fontWeight: '500' },
});

const s = StyleSheet.create({
  screen: { gap: 12 },
  hint: { fontSize: 18, lineHeight: 26, color: colors.text, padding: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 12 },
  grid: { gap: 6, alignItems: 'center' },
  gridRow: { flexDirection: 'row', gap: 6 },
  cell: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#b9ae9d',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellAbsent: { backgroundColor: '#e3ddd2', borderStyle: 'dashed' },
  disc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  discInPlace: { backgroundColor: colors.inPlace },
  discElsewhere: { borderWidth: 4, borderColor: colors.elsewhere },
  cellText: { fontSize: 22, fontWeight: '700', color: colors.text },
  dash: { position: 'absolute', bottom: 5, width: 14, height: 3, borderRadius: 2, backgroundColor: colors.muted },
  keyboard: { gap: 6 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  key: {
    width: '18.5%',
    minWidth: MIN_TAP,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 18, fontWeight: '700', color: colors.text },
  results: { gap: 8 },
  answer: { fontSize: 32, fontWeight: '800', letterSpacing: 6, color: colors.text },
  takeaway: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
    color: colors.text,
    padding: 16,
    borderLeftWidth: 6,
    borderLeftColor: colors.inPlace,
    backgroundColor: colors.surface,
  },
});
