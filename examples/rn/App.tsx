import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GAME_DISPLAY_NAME, WORD_DISPLAY_NAME } from '../../src/core';
import { GroupsScreen } from './src/GroupsScreen';
import { WordScreen } from './src/WordScreen';
import { Button, colors, styles as ui } from './src/ui';

type Game = 'groups' | 'word';

export default function App() {
  const [game, setGame] = useState<Game>('groups');
  return (
    <View style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={ui.h2} accessibilityRole="header">
          Moosii games RN proof
        </Text>
        <Text style={ui.muted}>Shared src/core and src/react, rendered with React Native. Fixtures are not reviewed content.</Text>
        <View style={ui.row} accessibilityRole="radiogroup">
          <Button label={GAME_DISPLAY_NAME} selected={game === 'groups'} onPress={() => setGame('groups')} />
          <Button label={WORD_DISPLAY_NAME} selected={game === 'word'} onPress={() => setGame('word')} />
        </View>
        {game === 'groups' ? <GroupsScreen /> : <WordScreen />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingTop: 48, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
});
