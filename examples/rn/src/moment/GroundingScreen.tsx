import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { validateGroundingScript, type GroundingScript } from '../../../../src/core';
import { useGrounding } from '../../../../src/react';
import scriptFile from '../../../../fixtures/moment/grounding.json';
import { Button, colors, styles as ui, ValidationErrors } from '../ui';
import { MomentFrame } from './MomentFrame';

export function GroundingScreen({ onLeave }: { onLeave: () => void }) {
  const parsed = useMemo(() => validateGroundingScript(scriptFile), []);
  return (
    <MomentFrame title="Grounding" onLeave={onLeave} leaveLabel="Stop anytime">
      {parsed.ok ? <Steps script={parsed.value} /> : <ValidationErrors source="fixtures/moment/grounding.json" errors={parsed.errors} />}
    </MomentFrame>
  );
}

function Steps({ script }: { script: GroundingScript }) {
  const g = useGrounding(script);
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const shown = useRef(g.index);

  // Move screen-reader focus to a newly shown step; not on first load.
  useEffect(() => {
    if (shown.current === g.index) return;
    shown.current = g.index;
    if (heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
  }, [g.index]);

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <View style={s.count} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={s.countText}>{g.step.count}</Text>
        </View>
        <Text ref={heading} style={s.heading} accessibilityRole="header" accessibilityLabel={`${g.step.count} ${g.step.heading}`}>
          {g.step.heading}
        </Text>
        <Text style={s.prompt}>{g.step.prompt}</Text>
        <Text style={ui.muted}>
          Step {g.index + 1} of {g.total}
        </Text>
      </View>
      <View style={[ui.row, s.nav]}>
        <Button label="Back" onPress={g.back} disabled={g.isFirst} />
        {g.isLast ? <Button label="Start again" primary onPress={g.restart} /> : <Button label="Next" primary onPress={g.next} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 16 },
  card: { alignItems: 'center', gap: 12, padding: 24, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  count: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 44, fontWeight: '800', color: colors.text },
  heading: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' },
  prompt: { fontSize: 22, lineHeight: 33, color: colors.text, textAlign: 'center' },
  nav: { justifyContent: 'center' },
});
