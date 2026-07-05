import type { Vec2 } from './types';

/**
 * Time of first outward crossing of a circle of `radius` centered at `center`,
 * for a point moving along the segment p0 -> p1. Returns the parameter τ in
 * [0, 1] at the crossing, or null if the segment does not cross outward within
 * the step.
 *
 * This is the continuous-collision core that prevents tunneling: instead of
 * testing only the end-of-step position (which a fast ball can leap past a thin
 * wall between frames), we solve analytically for when the radial distance
 * reaches the wall. Derivation: with d0 = p0 - center and m = p1 - p0, solve
 * |d0 + τ·m|² = radius², an upward parabola in τ. A point starting inside
 * (|d0| < radius) is between the two roots, so the outward crossing is the
 * larger root.
 */
export function solveOutwardCrossing(
  p0: Vec2,
  p1: Vec2,
  center: Vec2,
  radius: number,
): number | null {
  const d0x = p0.x - center.x;
  const d0y = p0.y - center.y;
  const mx = p1.x - p0.x;
  const my = p1.y - p0.y;

  const a = mx * mx + my * my;
  if (a === 0) return null; // no movement this step

  const b = 2 * (d0x * mx + d0y * my);
  const c = d0x * d0x + d0y * d0y - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null; // never reaches the circle

  const sqrtDisc = Math.sqrt(disc);
  const tau = (-b + sqrtDisc) / (2 * a); // larger root = outward crossing
  if (tau < 0 || tau > 1) return null;
  return tau;
}

/** Linear interpolation between two points. */
export function lerp(p0: Vec2, p1: Vec2, t: number): Vec2 {
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

/** Reflect velocity `v` about a unit normal `n` (v - 2(v·n)n). */
export function reflect(v: Vec2, n: Vec2): Vec2 {
  const dot = v.x * n.x + v.y * n.y;
  return { x: v.x - 2 * dot * n.x, y: v.y - 2 * dot * n.y };
}

/** Euclidean length of a vector. */
export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Clamp a speed magnitude into [min, max], preserving direction. */
export function clampSpeed(v: Vec2, min: number, max: number): Vec2 {
  const s = Math.hypot(v.x, v.y);
  if (s === 0) return v;
  let target = s;
  if (target < min) target = min;
  if (target > max) target = max;
  if (target === s) return v;
  const k = target / s;
  return { x: v.x * k, y: v.y * k };
}
