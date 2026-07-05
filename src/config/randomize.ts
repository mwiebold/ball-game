import { DEFAULT_SETTINGS } from '../core/settings';
import type { Rng } from '../core/rng';
import type { GapAlignment, RotationPattern, Settings } from '../core/types';

/**
 * Produce a randomized but tasteful, playable config (REQUIREMENTS S-37).
 *
 * Takes an Rng so the result is reproducible and unit-testable; the UI seeds it
 * from a fresh random seed. Ring geometry is clamped so the outer ring stays
 * within the visible arena, and gaps/rotation stay in ranges that keep the ball
 * lively and able to escape.
 */

const OUTER_LIMIT = 490; // keep the outer ring inside the world half-width (540)

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[rng.int(0, arr.length - 1)]!;
}

export function randomizeSettings(rng: Rng): Settings {
  const innerRadius = rng.int(80, 160);

  // Cap ring count so the stack fits, then derive a spacing that also fits.
  const maxCount = Math.max(3, Math.floor((OUTER_LIMIT - innerRadius) / 14) + 1);
  const ringCount = Math.min(rng.int(6, 22), maxCount);
  const maxSpacing = ringCount > 1 ? (OUTER_LIMIT - innerRadius) / (ringCount - 1) : 60;
  const ringSpacing = Math.max(14, Math.min(maxSpacing, rng.int(18, 44)));

  const patterns: RotationPattern[] = ['uniform', 'alternating', 'scale', 'random'];
  const alignments: GapAlignment[] = ['aligned', 'spiral', 'random'];

  return {
    ...DEFAULT_SETTINGS,
    seed: rng.int(0, 999999),
    ringCount,
    innerRadius,
    ringSpacing,
    ringThickness: rng.int(3, 8),
    gapDegrees: rng.int(28, 90),
    gapJitterDegrees: rng.int(0, 20),
    rotationSpeed: Math.round(rng.range(0.3, 1.8) * rng.sign() * 100) / 100,
    rotationPattern: pick(rng, patterns),
    gapAlignment: pick(rng, alignments),
    gravity: rng.int(1800, 3400),
    ballRadius: rng.int(10, 20),
    initialSpeed: rng.int(500, 900),
    countdownSeconds: pick(rng, [0, 30, 45, 60, 90]),
  };
}
