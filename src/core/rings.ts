import type { Rng } from './rng';
import type { Ring, Settings } from './types';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Wrap an angle into [0, 2π). */
export function normalizeAngle(a: number): number {
  let r = a % TAU;
  if (r < 0) r += TAU;
  return r;
}

/** Smallest signed difference a - b, wrapped into (-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

/** True if `angle` lies within the gap centered at `gapCenter` of half-width `gapHalf`. */
export function inGap(angle: number, gapCenter: number, gapHalf: number): boolean {
  return Math.abs(angleDiff(angle, gapCenter)) <= gapHalf;
}

/** Angular velocity for ring `index` under the chosen rotation pattern. */
export function ringOmega(settings: Settings, index: number, rng: Rng): number {
  const base = settings.rotationSpeed;
  switch (settings.rotationPattern) {
    case 'uniform':
      return base;
    case 'alternating':
      return index % 2 === 0 ? base : -base;
    case 'scale':
      // Outer rings spin progressively faster.
      return base * (1 + index * 0.18);
    case 'random':
      return base * rng.range(0.4, 1.6) * rng.sign();
  }
}

/** Initial gap-center angle for ring `index` under the chosen alignment. */
function initialGapCenter(settings: Settings, index: number, rng: Rng): number {
  switch (settings.gapAlignment) {
    case 'aligned':
      return 0;
    case 'spiral':
      return normalizeAngle(index * 0.6);
    case 'random':
      return rng.angle();
  }
}

/**
 * Build the ring stack from settings. Ring 0 is innermost. Gap size gets a
 * per-ring jitter; hue sweeps the spectrum across the stack for rendering.
 *
 * Coherent gap arrangements ('aligned', 'spiral') rotate rigidly — every ring
 * shares the base rotation speed — so the pattern stays recognizable as it
 * spins (an aligned slot or a whirlpool spiral) instead of being scrambled
 * within a moment by differing per-ring speeds. The 'random' arrangement keeps
 * the per-ring rotation pattern, where scattered drift is the intent.
 */
export function buildRings(settings: Settings, rng: Rng): Ring[] {
  const rigid = settings.gapAlignment === 'aligned' || settings.gapAlignment === 'spiral';
  const rings: Ring[] = [];
  for (let i = 0; i < settings.ringCount; i++) {
    const gapDeg =
      settings.gapDegrees + rng.range(-settings.gapJitterDegrees, settings.gapJitterDegrees);
    const gapHalf = Math.max(2 * DEG, (gapDeg * DEG) / 2);
    rings.push({
      index: i,
      radius: settings.innerRadius + i * settings.ringSpacing,
      thickness: settings.ringThickness,
      gapCenter: initialGapCenter(settings, i, rng),
      gapHalf,
      omega: rigid ? settings.rotationSpeed : ringOmega(settings, i, rng),
      hue: (360 * i) / Math.max(1, settings.ringCount),
    });
  }
  return rings;
}
