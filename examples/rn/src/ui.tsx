import { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  bg: '#fbf8f3',
  surface: '#ffffff',
  text: '#24211d',
  muted: '#5b554d',
  border: '#cfc6b8',
  tile: '#efe8dc',
  selected: '#2f3a56',
  inPlace: '#1d5bb8',
  elsewhere: '#b8560b',
  focus: '#1f5fbf',
};

export const MIN_TAP = 44;

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
}

export function Button({ label, onPress, disabled, primary, selected, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      style={({ pressed }) => [
        styles.button,
        primary && styles.buttonPrimary,
        selected && styles.buttonSelected,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, (primary || selected) && styles.buttonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

/** A status line that screen readers announce when it changes. */
export function LiveMessage({ text }: { text: string | null }) {
  useEffect(() => {
    // Android honours accessibilityLiveRegion; iOS needs an explicit announcement.
    if (text && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
  return (
    <Text style={styles.message} accessibilityLiveRegion="polite" accessibilityRole="text">
      {text ?? ''}
    </Text>
  );
}

/** Completion event JSON and share text, shown at game end like the web playground. */
export function CompletionOutput({ event, deliveries, shareText }: { event: unknown; deliveries: number; shareText: string | null }) {
  return (
    <View style={styles.output}>
      <Text style={styles.h3} accessibilityRole="header">
        Completion event
      </Text>
      <Text style={styles.muted}>
        Delivered to onComplete {deliveries} time{deliveries === 1 ? '' : 's'}. Not sent anywhere.
      </Text>
      <Text style={styles.code} selectable>
        {JSON.stringify(event, null, 2)}
      </Text>
      <Text style={styles.h3} accessibilityRole="header">
        Share text
      </Text>
      <Text style={styles.share} selectable>
        {shareText || '(no guesses)'}
      </Text>
    </View>
  );
}

export function ValidationErrors({ source, errors }: { source: string; errors: string[] }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.h3}>This puzzle can’t be played</Text>
      <Text style={styles.body}>{source} failed validation:</Text>
      {errors.map((e) => (
        <Text key={e} style={styles.code}>
          • {e}
        </Text>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  body: { fontSize: 18, lineHeight: 26, color: colors.text },
  muted: { fontSize: 18, lineHeight: 26, color: colors.muted },
  h2: { fontSize: 24, fontWeight: '700', color: colors.text },
  h3: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  message: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: colors.text, minHeight: 26 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: MIN_TAP,
    minWidth: MIN_TAP,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.selected,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.selected },
  buttonSelected: { backgroundColor: colors.selected },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 18, fontWeight: '700', color: colors.selected },
  buttonTextPrimary: { color: '#ffffff' },
  pressed: { opacity: 0.75 },
  output: { gap: 6, paddingTop: 8 },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  share: { fontSize: 24, lineHeight: 30 },
  error: { gap: 6, padding: 12, borderWidth: 3, borderColor: colors.text, borderRadius: 12, backgroundColor: colors.surface },
});
