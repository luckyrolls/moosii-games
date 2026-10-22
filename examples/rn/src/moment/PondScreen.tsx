import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import type { Leaf, PondConfig, RippleView } from '../../../../src/core';
import { useRipples } from '../../../../src/react';
import { styles as ui } from '../ui';
import { MomentFrame, momentColors as c } from './MomentFrame';
import { rnClock, useReduceMotion } from './platform';

const LEAF_W = 52;
const LEAF_H = 30;
const DRIFT_MS = [17_000, 21_000, 25_000];

export function PondScreen({ onLeave }: { onLeave: () => void }) {
  const reduced = useReduceMotion();
  const pond = useRipples({ clock: rnClock, reducedMotion: reduced });
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const onPress = (e: GestureResponderEvent) => {
    if (!size.w || !size.h) return;
    pond.tap(e.nativeEvent.locationX / size.w, e.nativeEvent.locationY / size.h);
  };

  return (
    <MomentFrame title="Ripple Pond" onLeave={onLeave}>
      <Text style={ui.muted}>Tap the water anywhere.</Text>
      <Pressable
        style={s.pond}
        onLayout={onLayout}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Pond"
        accessibilityHint="Double-tap to make a ripple in the middle"
        onAccessibilityTap={() => pond.tap(0.5, 0.5)}
      >
        {size.w > 0 &&
          pond.leaves.map((leaf, i) => (
            <LeafView key={leaf.id} leaf={leaf} size={size} reduced={reduced} driftMs={DRIFT_MS[i % DRIFT_MS.length]!} />
          ))}
        {size.w > 0 &&
          pond.ripples.map((r) => <Ring key={r.id} ripple={r} size={size} config={pond.config} reduced={reduced} />)}
      </Pressable>
    </MomentFrame>
  );
}

/** One ripple, animated natively from its age to the end of its life. */
function Ring({ ripple, size, config, reduced }: { ripple: RippleView; size: { w: number; h: number }; config: PondConfig; reduced: boolean }) {
  const t = useRef(new Animated.Value(ripple.progress)).current;
  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: Math.max(0, config.rippleLifetimeMs - ripple.ageMs),
      easing: reduced ? Easing.linear : Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Each ripple animates once, from the age it had when it first appeared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const min = Math.min(size.w, size.h);
  const diameter = 2 * (reduced ? config.reducedRadius : config.maxRadius) * min;
  const opacity = reduced
    ? t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] })
    : t.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0.75, 0] });
  const scale = reduced ? 1 : t;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.ring,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          left: ripple.x * size.w - diameter / 2,
          top: ripple.y * size.h - diameter / 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

/** A leaf: slides to its resting point when nudged, and drifts slowly around it. */
function LeafView({ leaf, size, reduced, driftMs }: { leaf: Leaf; size: { w: number; h: number }; reduced: boolean; driftMs: number }) {
  const target = { x: leaf.x * size.w - LEAF_W / 2, y: leaf.y * size.h - LEAF_H / 2 };
  const pos = useRef(new Animated.ValueXY(target)).current;
  const rot = useRef(new Animated.Value(leaf.rotation)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      pos.setValue(target);
      rot.setValue(leaf.rotation);
      return;
    }
    const anim = Animated.parallel([
      Animated.timing(pos, { toValue: target, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rot, { toValue: leaf.rotation, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaf.x, leaf.y, leaf.rotation, size.w, size.h, reduced]);

  useEffect(() => {
    if (reduced) {
      drift.stopAnimation();
      drift.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: driftMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: driftMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, driftMs, drift]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.leafBox,
        {
          transform: [
            { translateX: pos.x },
            { translateY: pos.y },
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-9, 9] }) },
            { translateY: drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-5, 6, -5] }) },
            { rotate: rot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
            { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) },
          ],
        },
      ]}
    >
      <View style={s.leaf} />
      <View style={s.vein} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  pond: {
    flex: 1,
    minHeight: 320,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#cfc6b8',
    backgroundColor: c.water,
  },
  ring: { position: 'absolute', borderWidth: 3, borderColor: c.ring, shadowColor: c.ringShade, shadowOpacity: 1, shadowRadius: 1, shadowOffset: { width: 0, height: 0 } },
  leafBox: { position: 'absolute', left: 0, top: 0, width: LEAF_W, height: LEAF_H, alignItems: 'center', justifyContent: 'center' },
  leaf: { width: LEAF_W, height: LEAF_H, borderTopLeftRadius: LEAF_H, borderBottomRightRadius: LEAF_H, backgroundColor: c.leaf, borderWidth: 1.5, borderColor: c.leafEdge },
  vein: { position: 'absolute', width: LEAF_W - 10, height: 1.5, backgroundColor: c.leafEdge },
});
