import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POND_CONFIG as C,
  addRipple,
  createPond,
  nudgeLeaves,
  pruneRipples,
  ripplesAt,
  tapPond,
  type PondState,
} from './ripples';

const emptyPond = (): PondState => ({ ...createPond(), leaves: [] });

describe('ripples', () => {
  it('spawns a ripple at the tap with increasing ids', () => {
    let s = addRipple(emptyPond(), 0.5, 0.25, 1000);
    s = addRipple(s, 0.1, 0.9, 1100);
    expect(s.ripples).toEqual([
      { id: 1, x: 0.5, y: 0.25, bornMs: 1000 },
      { id: 2, x: 0.1, y: 0.9, bornMs: 1100 },
    ]);
  });

  it('clamps taps to the pond', () => {
    const s = addRipple(emptyPond(), -0.2, 1.4, 0);
    expect(s.ripples[0]).toMatchObject({ x: 0, y: 1 });
  });

  it('ages: grows and fades over its lifetime', () => {
    const s = addRipple(emptyPond(), 0.5, 0.5, 0);
    const [born] = ripplesAt(s, 0);
    const [mid] = ripplesAt(s, C.rippleLifetimeMs / 2);
    const [late] = ripplesAt(s, C.rippleLifetimeMs - 1);
    expect(born).toMatchObject({ ageMs: 0, progress: 0, radius: 0, opacity: 0.9 });
    expect(mid!.radius).toBeGreaterThan(0);
    expect(mid!.radius).toBeLessThan(C.maxRadius);
    expect(late!.radius).toBeGreaterThan(mid!.radius);
    expect(late!.opacity).toBeLessThan(mid!.opacity);
    expect(late!.opacity).toBeLessThan(0.01);
  });

  it('expires at the end of its lifetime', () => {
    const s = addRipple(emptyPond(), 0.5, 0.5, 0);
    expect(ripplesAt(s, C.rippleLifetimeMs - 1)).toHaveLength(1);
    expect(ripplesAt(s, C.rippleLifetimeMs)).toHaveLength(0);
    expect(pruneRipples(s, C.rippleLifetimeMs).ripples).toEqual([]);
    expect(pruneRipples(s, 10)).toBe(s); // unchanged state is returned as is
  });

  it('drops expired ripples when a new one is added', () => {
    let s = addRipple(emptyPond(), 0.5, 0.5, 0);
    s = addRipple(s, 0.2, 0.2, C.rippleLifetimeMs + 5);
    expect(s.ripples.map((r) => r.id)).toEqual([2]);
  });

  it('caps concurrent ripples, dropping the oldest', () => {
    let s = emptyPond();
    for (let i = 0; i < 20; i++) s = addRipple(s, 0.5, 0.5, i * 10);
    expect(s.ripples).toHaveLength(C.maxRipples);
    expect(s.ripples[0]!.id).toBe(20 - C.maxRipples + 1);
    expect(ripplesAt(s, 200)).toHaveLength(C.maxRipples);
  });

  it('reduced motion: fixed small radius, still fades', () => {
    const s = addRipple(emptyPond(), 0.5, 0.5, 0);
    const early = ripplesAt(s, 100, { reducedMotion: true })[0]!;
    const late = ripplesAt(s, 2000, { reducedMotion: true })[0]!;
    expect(early.radius).toBe(C.reducedRadius);
    expect(late.radius).toBe(C.reducedRadius);
    expect(late.opacity).toBeLessThan(early.opacity);
  });

  it('has no score, goal or count of taps beyond ids', () => {
    const s = tapPond(createPond(), 0.5, 0.5, 0);
    expect(Object.keys(s).sort()).toEqual(['leaves', 'nextId', 'ripples']);
  });
});

describe('leaves', () => {
  it('starts with three leaves inside the pond', () => {
    const { leaves } = createPond();
    expect(leaves).toHaveLength(3);
    for (const l of leaves) {
      expect(l.x).toBeGreaterThan(0);
      expect(l.x).toBeLessThan(1);
    }
  });

  it('a tap near a leaf nudges it away from the tap', () => {
    const s = createPond();
    const leaf = s.leaves[0]!;
    const moved = nudgeLeaves(s, leaf.x - 0.05, leaf.y, C).leaves[0]!;
    expect(moved.x).toBeGreaterThan(leaf.x);
    expect(moved.y).toBeCloseTo(leaf.y);
    expect(moved.rotation).not.toBe(leaf.rotation);
  });

  it('a tap far from every leaf moves nothing', () => {
    const s = createPond();
    expect(nudgeLeaves(s, 0.95, 0.05, C)).toBe(s);
  });

  it('a tap exactly on a leaf still moves it, and leaves stay inside the pond', () => {
    let s: PondState = { ...createPond(), leaves: [{ id: 1, x: 0.9, y: 0.9, rotation: 0 }] };
    for (let i = 0; i < 10; i++) s = nudgeLeaves(s, s.leaves[0]!.x, s.leaves[0]!.y, C);
    expect(s.leaves[0]!.x).toBeLessThanOrEqual(0.92);
    expect(s.leaves[0]!.y).toBeLessThanOrEqual(0.92);
  });

  it('tapPond makes a ripple and nudges nearby leaves', () => {
    const s = createPond();
    const leaf = s.leaves[1]!;
    const after = tapPond(s, leaf.x, leaf.y + 0.03, 500);
    expect(after.ripples).toHaveLength(1);
    expect(after.leaves[1]).not.toEqual(leaf);
    expect(after.leaves[0]).toEqual(s.leaves[0]);
  });
});
