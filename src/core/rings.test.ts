import { describe, it, expect } from 'vitest';
import { normalizeAngle, angleDiff, inGap, buildRings, ringOmega } from './rings';
import { Rng } from './rng';
import { DEFAULT_SETTINGS } from './settings';
import type { Settings } from './types';

const TAU = Math.PI * 2;

describe('angle helpers', () => {
  it('normalizeAngle wraps into [0, 2π)', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0);
    expect(normalizeAngle(-0.1)).toBeCloseTo(TAU - 0.1, 6);
    expect(normalizeAngle(TAU + 0.3)).toBeCloseTo(0.3, 6);
  });

  it('angleDiff returns the shortest signed distance across the wrap', () => {
    expect(angleDiff(0.1, 6.2)).toBeCloseTo(0.1 - (6.2 - TAU), 6);
    expect(Math.abs(angleDiff(0.1, 6.2))).toBeLessThan(0.2);
    expect(angleDiff(Math.PI / 2, 0)).toBeCloseTo(Math.PI / 2, 6);
  });
});

describe('inGap', () => {
  it('detects an angle inside the gap', () => {
    expect(inGap(0, 0, 0.5)).toBe(true);
    expect(inGap(0.4, 0, 0.5)).toBe(true);
  });

  it('rejects an angle outside the gap', () => {
    expect(inGap(Math.PI, 0, 0.5)).toBe(false);
    expect(inGap(0.6, 0, 0.5)).toBe(false);
  });

  it('handles gaps straddling the 0/2π seam', () => {
    // Gap centered at ~0 with half 0.3; an angle at 6.25 (~ -0.03) is inside.
    expect(inGap(6.25, 0.0, 0.3)).toBe(true);
  });
});

describe('buildRings', () => {
  it('creates rings innermost-first with increasing radius', () => {
    const rings = buildRings(DEFAULT_SETTINGS, new Rng(DEFAULT_SETTINGS.seed));
    expect(rings).toHaveLength(DEFAULT_SETTINGS.ringCount);
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i]!.radius).toBeGreaterThan(rings[i - 1]!.radius);
      expect(rings[i]!.index).toBe(i);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = buildRings(DEFAULT_SETTINGS, new Rng(5));
    const b = buildRings(DEFAULT_SETTINGS, new Rng(5));
    expect(a).toEqual(b);
  });

  it('spiral arrangement offsets each ring gap progressively', () => {
    const rings = buildRings({ ...DEFAULT_SETTINGS, gapAlignment: 'spiral' }, new Rng(1));
    // Gap centers step by a fixed amount per ring (a spiral), not all equal.
    expect(rings[1]!.gapCenter).not.toBeCloseTo(rings[0]!.gapCenter, 3);
    expect(rings[2]!.gapCenter - rings[1]!.gapCenter).toBeCloseTo(
      rings[1]!.gapCenter - rings[0]!.gapCenter,
      3,
    );
  });

  it('coherent alignments (aligned, spiral) rotate rigidly so the pattern persists', () => {
    for (const gapAlignment of ['aligned', 'spiral'] as const) {
      const rings = buildRings(
        { ...DEFAULT_SETTINGS, gapAlignment, rotationPattern: 'alternating', rotationSpeed: 0.9 },
        new Rng(1),
      );
      // Every ring shares the base speed -> the arrangement spins as a rigid body.
      for (const ring of rings) expect(ring.omega).toBe(0.9);
    }
  });

  it('random alignment keeps the per-ring rotation pattern', () => {
    const rings = buildRings(
      {
        ...DEFAULT_SETTINGS,
        gapAlignment: 'random',
        rotationPattern: 'alternating',
        rotationSpeed: 1,
      },
      new Rng(1),
    );
    // Alternating pattern -> adjacent rings differ in omega.
    expect(rings[0]!.omega).not.toBe(rings[1]!.omega);
  });
});

describe('ringOmega patterns', () => {
  const base: Settings = { ...DEFAULT_SETTINGS, rotationSpeed: 1 };

  it('uniform: same speed every ring', () => {
    const s = { ...base, rotationPattern: 'uniform' as const };
    expect(ringOmega(s, 0, new Rng(1))).toBe(1);
    expect(ringOmega(s, 3, new Rng(1))).toBe(1);
  });

  it('alternating: flips sign by index', () => {
    const s = { ...base, rotationPattern: 'alternating' as const };
    expect(ringOmega(s, 0, new Rng(1))).toBe(1);
    expect(ringOmega(s, 1, new Rng(1))).toBe(-1);
  });

  it('scale: outer rings faster', () => {
    const s = { ...base, rotationPattern: 'scale' as const };
    expect(ringOmega(s, 5, new Rng(1))).toBeGreaterThan(ringOmega(s, 0, new Rng(1)));
  });
});
