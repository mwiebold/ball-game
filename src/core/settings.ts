import type { AspectRatio, Settings } from './types';

/** Simulation coordinate space (9:16). Rendering scales this to the canvas. */
export const WORLD_WIDTH = 1080;
export const WORLD_HEIGHT = 1920;

/**
 * World dimensions for a given aspect ratio (REQUIREMENTS S-8). The smaller
 * dimension is fixed at 1080 so the ring stack (sized in absolute world units)
 * always fits regardless of orientation.
 */
export function worldDimsFor(aspect: AspectRatio): { width: number; height: number } {
  switch (aspect) {
    case '1:1':
      return { width: 1080, height: 1080 };
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
    default:
      return { width: 1080, height: 1920 };
  }
}

/**
 * Phase 1 default settings — tuned so the ball is lively and reliably finds the
 * gaps within the countdown. Phase 2 replaces this with schema-driven presets
 * (including a "Reference video" preset). Outer ring radius stays inside the
 * world half-width (540) so the whole stack is visible.
 */
export const DEFAULT_SETTINGS: Settings = {
  seed: 1,

  ringCount: 12,
  innerRadius: 120,
  ringSpacing: 34,
  ringThickness: 6,
  gapDegrees: 62,
  gapJitterDegrees: 14,
  rotationSpeed: 0.9,
  rotationPattern: 'alternating',
  gapAlignment: 'random',

  gravity: 2600,
  restitution: 1.0,
  ballRadius: 15,
  initialSpeed: 700,
  minSpeed: 260,
  maxSpeed: 2400,

  countdownSeconds: 60,
  caption: 'The ball has to escape in under 1 minute!',

  palette: 'rainbowAngle',
  glow: 0.6,
  trail: true,
  trailLength: 24,
  particles: true,
  particleIntensity: 0.7,
  impactFlare: true,

  soundEnabled: true,
  volume: 0.5,
  bounceSound: 'rising',
  melody: 'twinkle',
  ringBreakSound: true,

  aspect: '9:16',
  screenShake: true,
};
