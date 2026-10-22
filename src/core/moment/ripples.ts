/**
 * Ripple Pond state. Positions are normalised to the pond: x and y run 0..1, and radii are a
 * fraction of the pond's smaller side, so the same state renders on any screen.
 * No score, no goal: taps only make ripples and nudge leaves.
 */

export interface PondConfig {
  rippleLifetimeMs: number;
  /** Most ripples alive at once; the oldest goes first when a new one would exceed it. */
  maxRipples: number;
  /** Radius a ripple reaches at the end of its life. */
  maxRadius: number;
  /** Fixed radius used when motion is reduced (ripples fade in place). */
  reducedRadius: number;
  /** A tap within this distance of a leaf nudges it. */
  leafNudgeRadius: number;
  /** How far a leaf moves when nudged by a tap right on top of it. */
  leafNudgeDistance: number;
}

export const DEFAULT_POND_CONFIG: PondConfig = {
  rippleLifetimeMs: 2600,
  maxRipples: 12,
  maxRadius: 0.3,
  reducedRadius: 0.06,
  leafNudgeRadius: 0.14,
  leafNudgeDistance: 0.1,
};

export interface Ripple {
  id: number;
  x: number;
  y: number;
  bornMs: number;
}

export interface RippleView extends Ripple {
  ageMs: number;
  /** 0 when born, approaching 1 at expiry. */
  progress: number;
  radius: number;
  opacity: number;
}

export interface Leaf {
  id: number;
  /** Resting position; renderers add a slow drift around it. */
  x: number;
  y: number;
  /** Degrees. */
  rotation: number;
}

export interface PondState {
  ripples: Ripple[];
  leaves: Leaf[];
  nextId: number;
}

/** Leaves stay this far from the pond edge. */
const LEAF_MARGIN = 0.08;

export function createPond(): PondState {
  return {
    ripples: [],
    leaves: [
      { id: 1, x: 0.28, y: 0.32, rotation: -20 },
      { id: 2, x: 0.7, y: 0.45, rotation: 35 },
      { id: 3, x: 0.42, y: 0.74, rotation: 80 },
    ],
    nextId: 1,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;

export function isRippleAlive(r: Ripple, t: number, config: PondConfig = DEFAULT_POND_CONFIG): boolean {
  const age = t - r.bornMs;
  return age >= 0 && age < config.rippleLifetimeMs;
}

/** Drop ripples that have expired by time `t`. */
export function pruneRipples(state: PondState, t: number, config: PondConfig = DEFAULT_POND_CONFIG): PondState {
  const ripples = state.ripples.filter((r) => isRippleAlive(r, t, config));
  return ripples.length === state.ripples.length ? state : { ...state, ripples };
}

/** Add a ripple at (x, y) at time t, dropping expired ones and keeping at most maxRipples. */
export function addRipple(state: PondState, x: number, y: number, t: number, config: PondConfig = DEFAULT_POND_CONFIG): PondState {
  const alive = state.ripples.filter((r) => isRippleAlive(r, t, config));
  const ripple: Ripple = { id: state.nextId, x: clamp(x, 0, 1), y: clamp(y, 0, 1), bornMs: t };
  const ripples = [...alive, ripple].slice(-config.maxRipples);
  return { ...state, ripples, nextId: state.nextId + 1 };
}

/** Push leaves near (x, y) gently away from it. Leaves farther than leafNudgeRadius don't move. */
export function nudgeLeaves(state: PondState, x: number, y: number, config: PondConfig = DEFAULT_POND_CONFIG): PondState {
  let moved = false;
  const leaves = state.leaves.map((leaf) => {
    const dx = leaf.x - x;
    const dy = leaf.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist > config.leafNudgeRadius) return leaf;
    moved = true;
    // Straight under the tap: drift down-right rather than divide by zero.
    const [ux, uy] = dist === 0 ? [Math.SQRT1_2, Math.SQRT1_2] : [dx / dist, dy / dist];
    const push = config.leafNudgeDistance * (1 - dist / config.leafNudgeRadius / 2);
    return {
      ...leaf,
      x: clamp(leaf.x + ux * push, LEAF_MARGIN, 1 - LEAF_MARGIN),
      y: clamp(leaf.y + uy * push, LEAF_MARGIN, 1 - LEAF_MARGIN),
      rotation: leaf.rotation + (ux >= 0 ? 12 : -12),
    };
  });
  return moved ? { ...state, leaves } : state;
}

/** A tap on the pond: a ripple, and a nudge for any leaf close by. */
export function tapPond(state: PondState, x: number, y: number, t: number, config: PondConfig = DEFAULT_POND_CONFIG): PondState {
  return nudgeLeaves(addRipple(state, x, y, t, config), x, y, config);
}

/**
 * Live ripples at time t with their size and opacity. With reducedMotion, ripples keep a small
 * fixed radius and only fade.
 */
export function ripplesAt(
  state: PondState,
  t: number,
  options: { reducedMotion?: boolean; config?: PondConfig } = {},
): RippleView[] {
  const config = options.config ?? DEFAULT_POND_CONFIG;
  return state.ripples
    .filter((r) => isRippleAlive(r, t, config))
    .map((r) => {
      const ageMs = t - r.bornMs;
      const progress = ageMs / config.rippleLifetimeMs;
      return {
        ...r,
        ageMs,
        progress,
        radius: options.reducedMotion ? config.reducedRadius : config.maxRadius * easeOutCubic(progress),
        opacity: 0.9 * (1 - progress) ** 2,
      };
    });
}
