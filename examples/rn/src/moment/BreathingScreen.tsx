import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { validateBreathingPatterns, type BreathingPattern } from '../../../../src/core';
import { useBreathing } from '../../../../src/react';
import patternsFile from '../../../../fixtures/moment/breathing-patterns.json';
import { Button, LiveMessage, styles as ui, ValidationErrors } from '../ui';
import { MomentFrame, momentColors as c } from './MomentFrame';
import { rnClock, useReduceMotion } from './platform';

const SESSIONS: { label: string; ms: number | null }[] = [
  { label: '1 min', ms: 60_000 },
  { label: '3 min', ms: 180_000 },
  { label: '5 min', ms: 300_000 },
  { label: 'No timer', ms: null },
];
const PETALS = Array.from({ length: 8 }, (_, i) => i * 45);

export function BreathingScreen({ onLeave }: { onLeave: () => void }) {
  const parsed = useMemo(() => validateBreathingPatterns(patternsFile), []);
  const [patternId, setPatternId] = useState<string | null>(null);
  const [sessionMs, setSessionMs] = useState<number | null>(null);

  return (
    <MomentFrame title="Breathing Garden" onLeave={onLeave}>
      {!parsed.ok ? (
        <ValidationErrors source="fixtures/moment/breathing-patterns.json" errors={parsed.errors} />
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          {(() => {
            const patterns = parsed.value.patterns;
            const pattern = patterns.find((p) => p.id === patternId) ?? patterns[0]!;
            return (
              <Garden
                key={pattern.id}
                pattern={pattern}
                patterns={patterns}
                onPattern={setPatternId}
                sessionMs={sessionMs}
                onSession={setSessionMs}
              />
            );
          })()}
        </ScrollView>
      )}
    </MomentFrame>
  );
}

function Garden({
  pattern,
  patterns,
  onPattern,
  sessionMs,
  onSession,
}: {
  pattern: BreathingPattern;
  patterns: BreathingPattern[];
  onPattern: (id: string) => void;
  sessionMs: number | null;
  onSession: (ms: number | null) => void;
}) {
  const breath = useBreathing(pattern, { clock: rnClock, sessionMs });
  const reduced = useReduceMotion();
  const open = useRef(new Animated.Value(0)).current;
  const isOpen = breath.phase === 'inhale' || breath.phase === 'hold_in';

  // One native-driven animation per phase, lasting exactly the time left in that phase.
  useEffect(() => {
    const anim = Animated.timing(open, {
      toValue: isOpen ? 1 : 0,
      duration: breath.running ? Math.max(0, breath.phaseRemainingMs) : 1200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [breath.phaseSerial, breath.running, breath.phaseRemainingMs, isOpen, open]);

  // Reduced motion: no scaling or turning, only a fade between dim and full colour.
  const outer = reduced
    ? { opacity: open.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: 0.85 }] }
    : {
        transform: [
          { scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.42, 1] }) },
          { rotate: open.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) },
        ],
      };
  const inner = reduced
    ? { opacity: open.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ scale: 0.85 }] }
    : {
        transform: [
          { scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }) },
          { rotate: open.interpolate({ inputRange: [0, 1], outputRange: ['10deg', '0deg'] }) },
        ],
      };

  return (
    <View style={s.garden}>
      <View style={s.flower} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Animated.View style={[s.layer, outer]}>
          {PETALS.map((deg) => (
            <View key={deg} style={[s.petal, s.petalOuter, { transform: [{ rotate: `${deg}deg` }, { translateY: -48 }] }]} />
          ))}
        </Animated.View>
        <Animated.View style={[s.layer, inner]}>
          {PETALS.map((deg) => (
            <View key={deg} style={[s.petal, s.petalInner, { transform: [{ rotate: `${deg + 22.5}deg` }, { translateY: -30 }] }]} />
          ))}
        </Animated.View>
        <View style={s.centre} />
      </View>

      <View style={s.phase}>
        <LiveMessage text={breath.phaseText} />
      </View>

      {breath.running ? <Button label="Stop" onPress={breath.stop} /> : <Button label="Start" primary onPress={breath.start} />}
      <Text style={ui.muted}>Follow the flower if you like, or just watch.</Text>

      {patterns.length > 1 && (
        <View style={s.group}>
          <Text style={ui.h3}>Pattern</Text>
          {patterns.map((p) => (
            <Button key={p.id} label={p.label} selected={p.id === pattern.id} onPress={() => onPattern(p.id)} />
          ))}
        </View>
      )}

      <View style={s.group}>
        <Text style={ui.h3}>How long</Text>
        <View style={ui.row}>
          {SESSIONS.map((o) => (
            <Button key={o.label} label={o.label} selected={sessionMs === o.ms} onPress={() => onSession(o.ms)} />
          ))}
        </View>
      </View>

      <View style={s.group}>
        <Text style={ui.h3}>Pace</Text>
        <View style={[ui.row, { alignItems: 'center' }]}>
          <Button label="Slower" onPress={breath.slower} disabled={!breath.canSlower} />
          <Text style={[ui.body, { fontWeight: '600' }]} accessibilityLiveRegion="polite">
            {breath.paceText}
          </Text>
          <Button label="Faster" onPress={breath.faster} disabled={!breath.canFaster} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: 48 },
  garden: { alignItems: 'center', gap: 16 },
  flower: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  petal: { position: 'absolute', borderWidth: 1.5, borderColor: c.petalEdge },
  petalOuter: { width: 52, height: 110, borderRadius: 26, backgroundColor: c.petalOuter },
  petalInner: { width: 36, height: 72, borderRadius: 18, backgroundColor: c.petalInner },
  centre: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.petalCentre, borderWidth: 1.5, borderColor: c.petalEdge },
  phase: { minHeight: 40, alignItems: 'center' },
  group: { alignSelf: 'stretch', gap: 8, alignItems: 'center' },
});
