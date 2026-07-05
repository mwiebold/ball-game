/** Shared value types for the simulation core. */

export interface Vec2 {
  x: number;
  y: number;
}

/** Rotation speed pattern across the ring stack (REQUIREMENTS S-4). */
export type RotationPattern = 'uniform' | 'alternating' | 'scale' | 'random';

/** Initial gap placement across rings (REQUIREMENTS S-7). */
export type GapAlignment = 'aligned' | 'spiral' | 'random';

/** Color palette for rings/ball (REQUIREMENTS S-17). */
export type PaletteName = 'rainbowAngle' | 'rainbowRing' | 'mono' | 'fire' | 'ice';

/** Bounce sound mode (REQUIREMENTS S-31, S-34 adds 'melody'). */
export type BounceSound = 'off' | 'tone' | 'rising' | 'melody';

/** Bundled melody sequences for melody mode (REQUIREMENTS S-34). */
export type MelodyName = 'twinkle' | 'ode' | 'frere' | 'scale' | 'arp';

/** Canvas aspect ratio (REQUIREMENTS S-8). */
export type AspectRatio = '9:16' | '1:1' | '16:9';

/**
 * Full simulation settings. Phase 1 hard-codes a default; Phase 2 drives these
 * from the settings panel schema. Distances are in world units (see
 * WORLD_WIDTH/HEIGHT), angles in radians unless a field says degrees, time in
 * seconds.
 */
export interface Settings {
  seed: number;

  // Rings
  ringCount: number;
  innerRadius: number; // radius of the innermost ring
  ringSpacing: number; // radial gap between consecutive rings
  ringThickness: number; // stroke width, world units
  gapDegrees: number; // angular size of each ring's opening
  gapJitterDegrees: number; // random +/- variation of gap size per ring
  rotationSpeed: number; // base angular velocity, rad/s
  rotationPattern: RotationPattern;
  gapAlignment: GapAlignment;

  // Ball & physics
  gravity: number; // downward acceleration, world units / s^2
  restitution: number; // bounce energy retention (1 = elastic)
  ballRadius: number;
  initialSpeed: number; // launch speed magnitude
  minSpeed: number; // speed floor so the sim never stalls
  maxSpeed: number; // speed cap for stability

  // Rules
  countdownSeconds: number; // 0 disables the timer (sandbox)
  caption: string;

  // Visuals
  palette: PaletteName;
  glow: number; // 0 (flat) .. 1 (heavy bloom)
  trail: boolean;
  trailLength: number; // number of trail samples
  particles: boolean; // ring-shatter ember bursts
  particleIntensity: number; // 0 .. 1
  impactFlare: boolean; // flash on bounce

  // Audio
  soundEnabled: boolean;
  volume: number; // 0 .. 1
  bounceSound: BounceSound;
  melody: MelodyName; // used when bounceSound === 'melody'
  ringBreakSound: boolean;

  // Layout & feel
  aspect: AspectRatio;
  screenShake: boolean;
}

export type Phase = 'playing' | 'won' | 'lost';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Ring {
  index: number; // 0 = innermost
  radius: number; // centerline radius
  thickness: number;
  gapCenter: number; // current angle of gap center (radians), updated by rotation
  gapHalf: number; // half of the gap's angular width
  omega: number; // angular velocity, rad/s
  hue: number; // base hue for rendering (degrees)
}
