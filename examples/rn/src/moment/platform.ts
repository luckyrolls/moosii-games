import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { MomentClock } from '../../../../src/core';

/** React Native time source for Take a Moment (paces breathing phases only). */
export const rnClock: MomentClock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  after: (ms, callback) => {
    const id = setTimeout(callback, ms);
    return () => clearTimeout(id);
  },
};

/** The OS "reduce motion" setting, kept live. */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
