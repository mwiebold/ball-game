import { describe, it, expect } from 'vitest';
import { solveOutwardCrossing, reflect, clampSpeed, lerp } from './physics';

describe('solveOutwardCrossing', () => {
  const center = { x: 0, y: 0 };

  it('finds the midpoint crossing of a radius-5 circle', () => {
    const tau = solveOutwardCrossing({ x: 0, y: 0 }, { x: 10, y: 0 }, center, 5);
    expect(tau).not.toBeNull();
    expect(tau!).toBeCloseTo(0.5, 6);
  });

  it('returns null when the segment stays inside', () => {
    const tau = solveOutwardCrossing({ x: 0, y: 0 }, { x: 1, y: 0 }, center, 5);
    expect(tau).toBeNull();
  });

  it('returns null when there is no movement', () => {
    const tau = solveOutwardCrossing({ x: 1, y: 1 }, { x: 1, y: 1 }, center, 5);
    expect(tau).toBeNull();
  });

  it('catches a fast crossing that overshoots far past the wall (no tunneling)', () => {
    // Ball leaps from near center to well outside a radius-5 wall in one step.
    const tau = solveOutwardCrossing({ x: 0, y: 0 }, { x: 1000, y: 0 }, center, 5);
    expect(tau).not.toBeNull();
    expect(tau!).toBeGreaterThan(0);
    expect(tau!).toBeLessThan(1);
    // Contact point should sit on the wall.
    const p = lerp({ x: 0, y: 0 }, { x: 1000, y: 0 }, tau!);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(5, 6);
  });
});

describe('reflect', () => {
  it('reflects a horizontal velocity off a vertical wall', () => {
    const v = reflect({ x: 10, y: 3 }, { x: 1, y: 0 });
    expect(v.x).toBeCloseTo(-10, 6);
    expect(v.y).toBeCloseTo(3, 6); // tangential component preserved
  });

  it('preserves speed on reflection', () => {
    const n = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
    const v = reflect({ x: 4, y: -1 }, n);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(Math.hypot(4, -1), 6);
  });
});

describe('clampSpeed', () => {
  it('raises a slow velocity to the floor', () => {
    const v = clampSpeed({ x: 3, y: 4 }, 100, 1000); // speed 5 -> 100
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(100, 6);
  });

  it('lowers a fast velocity to the cap', () => {
    const v = clampSpeed({ x: 300, y: 400 }, 10, 100); // speed 500 -> 100
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(100, 6);
  });

  it('leaves an in-range velocity untouched', () => {
    const v = clampSpeed({ x: 3, y: 4 }, 1, 100);
    expect(v).toEqual({ x: 3, y: 4 });
  });
});
