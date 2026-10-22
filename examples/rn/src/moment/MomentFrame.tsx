import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, colors, styles as ui } from '../ui';

/** Always-visible leave button plus title, shared by the three activities. */
export function MomentFrame({
  title,
  onLeave,
  leaveLabel = 'Back',
  children,
}: {
  title: string;
  onLeave: () => void;
  leaveLabel?: string;
  children: ReactNode;
}) {
  return (
    <View style={s.frame}>
      <View style={s.bar}>
        <Button label={`← ${leaveLabel}`} accessibilityLabel={`${leaveLabel}, leave ${title}`} onPress={onLeave} />
        <Text style={ui.h2} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export const momentColors = {
  bg: '#f5f1ea',
  petalOuter: '#b9a3d9',
  petalInner: '#f2b98f',
  petalCentre: '#e2b24a',
  petalEdge: '#5d4a7a',
  water: '#a9cbdc',
  ring: 'rgba(255,255,255,0.95)',
  ringShade: 'rgba(22,64,92,0.45)',
  leaf: '#b9853b',
  leafEdge: '#6e4a17',
  text: colors.text,
};

const s = StyleSheet.create({
  frame: { flex: 1, gap: 16, padding: 16, backgroundColor: momentColors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
});
