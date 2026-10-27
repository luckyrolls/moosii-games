import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GAME_DISPLAY_NAME, JIGSAW_DISPLAY_NAME, WORD_DISPLAY_NAME } from '../../src/core';
import { GroupsScreen } from './src/GroupsScreen';
import { JigsawScreen } from './src/JigsawScreen';
import { WordScreen } from './src/WordScreen';
import { BreathingScreen } from './src/moment/BreathingScreen';
import { GroundingScreen } from './src/moment/GroundingScreen';
import { momentColors } from './src/moment/MomentFrame';
import { PondScreen } from './src/moment/PondScreen';
import { Button, colors, styles as ui } from './src/ui';

type Game = 'groups' | 'word' | 'jigsaw';
type Moment = 'breathing' | 'pond' | 'grounding';

const MOMENTS: { value: Moment; label: string }[] = [
  { value: 'breathing', label: 'Breathing Garden' },
  { value: 'pond', label: 'Ripple Pond' },
  { value: 'grounding', label: 'Grounding' },
];

export default function App() {
  const [game, setGame] = useState<Game>('groups');
  const [moment, setMoment] = useState<Moment | null>(null);
  const leave = () => setMoment(null);

  // A Take a Moment activity gets the whole screen, with its own Back.
  if (moment) {
    return (
      <View style={[s.safe, { backgroundColor: momentColors.bg }]}>
        <StatusBar style="dark" />
        {moment === 'breathing' && <BreathingScreen onLeave={leave} />}
        {moment === 'pond' && <PondScreen onLeave={leave} />}
        {moment === 'grounding' && <GroundingScreen onLeave={leave} />}
      </View>
    );
  }

  return (
    <View style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={ui.h2} accessibilityRole="header">
          Moosii games RN proof
        </Text>
        <Text style={ui.muted}>Shared src/core and src/react, rendered with React Native. Fixtures are not reviewed content.</Text>

        <View style={s.moments}>
          <Text style={ui.h2} accessibilityRole="header">
            Take a Moment
          </Text>
          <Text style={ui.muted}>A separate, quiet space. Nothing to win, score or finish.</Text>
          <View style={ui.row}>
            {MOMENTS.map((m) => (
              <Button key={m.value} label={m.label} onPress={() => setMoment(m.value)} />
            ))}
          </View>
        </View>

        <Text style={ui.h2} accessibilityRole="header">
          Daily games
        </Text>
        <View style={ui.row} accessibilityRole="radiogroup">
          <Button label={GAME_DISPLAY_NAME} selected={game === 'groups'} onPress={() => setGame('groups')} />
          <Button label={WORD_DISPLAY_NAME} selected={game === 'word'} onPress={() => setGame('word')} />
          <Button label={JIGSAW_DISPLAY_NAME} selected={game === 'jigsaw'} onPress={() => setGame('jigsaw')} />
        </View>
        {game === 'groups' && <GroupsScreen />}
        {game === 'word' && <WordScreen />}
        {game === 'jigsaw' && <JigsawScreen onBack={() => setGame('groups')} />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, paddingTop: 48, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  moments: { gap: 10, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: momentColors.bg },
});
