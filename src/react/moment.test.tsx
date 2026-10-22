// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BreathingPattern, GroundingScript } from '../core';
import { DEFAULT_POND_CONFIG } from '../core';
import { FakeClock } from './testing/fakeClock';
import { useBreathing } from './useBreathing';
import { useGrounding } from './useGrounding';
import { useRipples } from './useRipples';

const fourSix: BreathingPattern = { id: 'a', label: 'A', inhale_s: 4, hold_in_s: 0, exhale_s: 6, hold_out_s: 0 };
const withHold: BreathingPattern = { id: 'b', label: 'B', inhale_s: 4, hold_in_s: 1, exhale_s: 5, hold_out_s: 0 };

function advance(clock: FakeClock, ms: number) {
  clock.advance(ms, (fn) => act(fn));
}

describe('useBreathing', () => {
  it('is idle until started, with no timers scheduled', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useBreathing(fourSix, { clock }));
    expect(result.current).toMatchObject({ running: false, phase: null, phaseText: null, pace: 1, paceText: 'Usual pace' });
    expect(clock.pending).toBe(0);
  });

  it('walks the phases with the agreed words, at phase boundaries', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useBreathing(withHold, { clock }));
    act(() => result.current.start());
    expect(result.current).toMatchObject({ running: true, phase: 'inhale', phaseText: 'Breathe in', phaseDurationMs: 4000, phaseSerial: 1 });
    advance(clock, 3999);
    expect(result.current.phase).toBe('inhale');
    advance(clock, 1);
    expect(result.current).toMatchObject({ phase: 'hold_in', phaseText: 'Pause', phaseDurationMs: 1000, phaseSerial: 2 });
    advance(clock, 1000);
    expect(result.current).toMatchObject({ phase: 'exhale', phaseText: 'Breathe out', phaseDurationMs: 5000 });
    advance(clock, 5000);
    expect(result.current).toMatchObject({ phase: 'inhale', phaseSerial: 4 });
  });

  it('runs with no timer until stopped', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useBreathing(fourSix, { clock, sessionMs: null }));
    act(() => result.current.start());
    advance(clock, 30 * 60_000);
    expect(result.current.running).toBe(true);
    act(() => result.current.stop());
    expect(result.current).toMatchObject({ running: false, phase: null });
    expect(clock.pending).toBe(0);
  });

  it('ends a timed session at the end of a breath, not mid-breath', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useBreathing(fourSix, { clock, sessionMs: 60_000 }));
    act(() => result.current.start());
    advance(clock, 59_999);
    expect(result.current.running).toBe(true);
    advance(clock, 1); // 60 s is exactly 6 breaths of 10 s
    expect(result.current.running).toBe(false);

    const odd = renderHook(() => useBreathing(fourSix, { clock, sessionMs: 55_000 }));
    act(() => odd.result.current.start());
    advance(clock, 55_000);
    expect(odd.result.current).toMatchObject({ running: true, phase: 'exhale' }); // finishes this breath
    advance(clock, 5_000);
    expect(odd.result.current.running).toBe(false);
  });

  it('changes pace at the next breath and stays within limits', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useBreathing(fourSix, { clock }));
    act(() => result.current.start());
    act(() => result.current.slower());
    expect(result.current).toMatchObject({ pace: 1.15, paceText: 'A little slower', phaseDurationMs: 4000 });
    advance(clock, 4000);
    expect(result.current.phaseDurationMs).toBe(6000); // this breath keeps the old pace
    advance(clock, 6000);
    expect(result.current.phaseDurationMs).toBeCloseTo(4600); // next breath is slower
    for (let i = 0; i < 10; i++) act(() => result.current.slower());
    expect(result.current.pace).toBe(1.5); // 1.5 keeps the exhale at 9 s
    expect(result.current.canSlower).toBe(false);
  });

  it('catches up correctly when a callback fires very late (e.g. app in the background)', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useBreathing(fourSix, { clock }));
    act(() => result.current.start());
    clock.jump(3 * 10_000 + 5_000); // 3.5 breaths pass with no callbacks
    advance(clock, 0); // the overdue callback finally fires
    expect(result.current).toMatchObject({ phase: 'exhale', phaseDurationMs: 6000 });
    expect(result.current.phaseRemainingMs).toBeCloseTo(5000); // 1 s into this exhale
    advance(clock, 5000);
    expect(result.current.phase).toBe('inhale');
  });

  it('stops when the pattern changes', () => {
    const clock = new FakeClock();
    const { result, rerender } = renderHook((p: BreathingPattern) => useBreathing(p, { clock }), { initialProps: fourSix });
    act(() => result.current.start());
    rerender(withHold);
    expect(result.current.running).toBe(false);
  });

  it('exposes no score, points, streak or completion fields', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useBreathing(fourSix, { clock }));
    const keys = Object.keys(result.current).join(' ');
    expect(keys).not.toMatch(/score|point|streak|complete|finish|done|onComplete/i);
  });
});

describe('useRipples', () => {
  it('starts with three leaves and no ripples', () => {
    const { result } = renderHook(() => useRipples({ clock: new FakeClock() }));
    expect(result.current.ripples).toEqual([]);
    expect(result.current.leaves).toHaveLength(3);
  });

  it('adds a ripple per tap with its age at the latest tap', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useRipples({ clock }));
    act(() => result.current.tap(0.1, 0.1));
    clock.advance(500);
    act(() => result.current.tap(0.9, 0.9));
    expect(result.current.ripples.map((r) => [r.id, r.ageMs])).toEqual([
      [1, 500],
      [2, 0],
    ]);
  });

  it('drops expired ripples on the next tap and caps the list', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useRipples({ clock }));
    act(() => result.current.tap(0.5, 0.5));
    clock.advance(DEFAULT_POND_CONFIG.rippleLifetimeMs);
    act(() => result.current.tap(0.5, 0.5));
    expect(result.current.ripples.map((r) => r.id)).toEqual([2]);
    for (let i = 0; i < 30; i++) act(() => result.current.tap(0.5, 0.5));
    expect(result.current.ripples).toHaveLength(DEFAULT_POND_CONFIG.maxRipples);
  });

  it('nudges a leaf tapped near it', () => {
    const { result } = renderHook(() => useRipples({ clock: new FakeClock() }));
    const leaf = result.current.leaves[0]!;
    act(() => result.current.tap(leaf.x - 0.03, leaf.y));
    expect(result.current.leaves[0]!.x).toBeGreaterThan(leaf.x);
  });

  it('reduced motion keeps ripples at a fixed small radius', () => {
    const clock = new FakeClock();
    const { result } = renderHook(() => useRipples({ clock, reducedMotion: true }));
    act(() => result.current.tap(0.5, 0.5));
    clock.advance(1000);
    act(() => result.current.tap(0.2, 0.2));
    expect(result.current.ripples.every((r) => r.radius === DEFAULT_POND_CONFIG.reducedRadius)).toBe(true);
  });
});

describe('useGrounding', () => {
  const script: GroundingScript = {
    schema_version: 1,
    kind: 'grounding_script',
    title: 'T',
    steps: [5, 4, 3, 2, 1].map((count) => ({ count, heading: `H${count}`, prompt: `P${count}.` })),
  };

  it('shows one step at a time with next/back/restart', () => {
    const { result } = renderHook(() => useGrounding(script));
    expect(result.current).toMatchObject({ index: 0, total: 5, isFirst: true, isLast: false, step: { count: 5 } });
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.step.count).toBe(3);
    act(() => result.current.back());
    expect(result.current.step.count).toBe(4);
    for (let i = 0; i < 9; i++) act(() => result.current.next());
    expect(result.current).toMatchObject({ isLast: true, step: { count: 1 } });
    act(() => result.current.restart());
    expect(result.current.index).toBe(0);
  });

  it('has nothing to type and nothing that marks it finished', () => {
    const { result } = renderHook(() => useGrounding(script));
    expect(Object.keys(result.current).sort()).toEqual(['back', 'index', 'isFirst', 'isLast', 'next', 'restart', 'step', 'total']);
  });
});
