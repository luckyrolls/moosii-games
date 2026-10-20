import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GAME_DISPLAY_NAME,
  ITEMS_PER_GROUP,
  validatePuzzle,
  type Difficulty,
  type GroupsCompletionEvent,
  type GroupsPuzzle,
} from '../../../src/core';
import { useGroupsGame, type GroupView } from '../../../src/react';
import { groupsFixtures } from './fixtures';
import { Button, colors, CompletionOutput, LiveMessage, MIN_TAP, styles as ui, ValidationErrors } from './ui';

// Distinct shape per difficulty, so groups are never told apart by colour alone.
const SHAPE: Record<Difficulty, string> = { 1: '●', 2: '▲', 3: '■', 4: '◆' };
const FILL: Record<Difficulty, string> = { 1: '#f3c9a1', 2: '#a9c8ec', 3: '#cdb8e3', 4: '#d8c3a0' };

export function GroupsScreen() {
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  const fixture = groupsFixtures[index]!;
  const parsed = useMemo(() => validatePuzzle(fixture.data), [fixture]);

  return (
    <View style={s.screen}>
      <Text style={ui.h3}>Puzzle</Text>
      <View style={ui.row}>
        {groupsFixtures.map((f, i) => (
          <Button key={f.path} label={f.path.replace('.json', '')} selected={i === index} onPress={() => setIndex(i)} />
        ))}
        <Button label="Restart" onPress={() => setRound((r) => r + 1)} />
      </View>
      {parsed.ok ? (
        <GroupsGame key={`${fixture.path}|${round}`} puzzle={parsed.puzzle} />
      ) : (
        <ValidationErrors source={fixture.path} errors={parsed.errors} />
      )}
    </View>
  );
}

function GroupsGame({ puzzle }: { puzzle: GroupsPuzzle }) {
  const [received, setReceived] = useState<GroupsCompletionEvent[]>([]);
  const game = useGroupsGame(puzzle, { onComplete: (e) => setReceived((list) => [...list, e]) });
  const full = game.selected.length >= ITEMS_PER_GROUP;

  return (
    <View style={s.screen}>
      <Text style={ui.h2} accessibilityRole="header">
        {GAME_DISPLAY_NAME}
      </Text>
      <Text style={ui.muted}>{puzzle.title}</Text>

      {game.groups.map((view) => (
        <GroupCard key={view.index} view={view} />
      ))}

      {!game.isComplete && (
        <>
          <View style={s.tiles}>
            {game.tiles.map((item) => {
              const selected = game.selected.includes(item);
              return (
                <Pressable
                  key={item}
                  onPress={() => game.toggle(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                  accessibilityState={{ selected, disabled: !selected && full }}
                  style={({ pressed }) => [s.tile, selected && s.tileSelected, pressed && ui.pressed]}
                >
                  <Text style={[s.tileText, selected && s.tileTextSelected]}>
                    {selected ? '✓ ' : ''}
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={ui.muted}>
            Selected: {game.selected.length} of {ITEMS_PER_GROUP} · Mistakes: {game.mistakes}
          </Text>
        </>
      )}

      <LiveMessage text={game.messageText} />

      {!game.isComplete ? (
        <View style={ui.row}>
          <Button label="Check" primary onPress={game.submit} disabled={!game.canSubmit} />
          <Button label="Shuffle" onPress={game.shuffle} />
          <Button label="Clear" onPress={game.clearSelection} disabled={game.selected.length === 0} />
          <Button label="Show answers" onPress={game.reveal} />
        </View>
      ) : (
        <CompletionOutput event={game.completionEvent} deliveries={received.length} shareText={game.shareText} />
      )}
    </View>
  );
}

function GroupCard({ view }: { view: GroupView }) {
  const { group, foundByPlayer } = view;
  return (
    <View
      style={[s.group, { backgroundColor: FILL[group.difficulty] }, !foundByPlayer && s.groupRevealed]}
      accessible
      accessibilityLabel={`${group.label}${foundByPlayer ? '' : ', revealed'}: ${group.items.join(', ')}`}
    >
      <Text style={s.groupShape}>{SHAPE[group.difficulty]}</Text>
      <View style={s.groupBody}>
        <Text style={s.groupLabel}>
          {group.label}
          {foundByPlayer ? '' : ' (revealed)'}
        </Text>
        <Text style={ui.body}>{group.items.join(', ')}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { gap: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '48.5%',
    minHeight: Math.max(MIN_TAP, 56),
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: { backgroundColor: colors.selected, borderColor: colors.selected },
  tileText: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  tileTextSelected: { color: '#ffffff' },
  group: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.text },
  groupRevealed: { borderStyle: 'dashed' },
  groupShape: { fontSize: 24, color: colors.text, width: 28, textAlign: 'center' },
  groupBody: { flex: 1 },
  groupLabel: { fontSize: 18, fontWeight: '700', color: colors.text },
});
