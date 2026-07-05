import type { Settings } from '../core/types';

/**
 * The settings schema: a single source of truth describing every user-editable
 * setting. It drives three things so they can never drift apart (BUILD_PLAN):
 *   1. the auto-generated settings panel UI,
 *   2. URL/JSON serialization and validation (clamping untrusted input),
 *   3. preset validation.
 *
 * `live: true` means a change takes effect on the running simulation without
 * rebuilding it (the sim reads the value every step, or it is render-only).
 * `live: false` means the change is structural — the world must be rebuilt from
 * the seed for it to take effect.
 */

export type ControlKind = 'range' | 'int' | 'select' | 'text' | 'toggle';

interface BaseControl {
  key: keyof Settings;
  group: GroupName;
  label: string;
  live: boolean;
  help?: string;
}

export interface NumberControl extends BaseControl {
  kind: 'range' | 'int';
  min: number;
  max: number;
  step: number;
}

export interface SelectControl extends BaseControl {
  kind: 'select';
  options: ReadonlyArray<{ value: string; label: string }>;
}

export interface TextControl extends BaseControl {
  kind: 'text';
  maxLength: number;
}

export interface ToggleControl extends BaseControl {
  kind: 'toggle';
}

export type Control = NumberControl | SelectControl | TextControl | ToggleControl;

export const GROUPS = [
  'Arena & Rings',
  'Ball & Physics',
  'Rules',
  'Visuals',
  'Audio',
  'Layout',
] as const;
export type GroupName = (typeof GROUPS)[number];

export const SCHEMA: readonly Control[] = [
  // --- Arena & Rings ---
  {
    key: 'ringCount',
    group: 'Arena & Rings',
    label: 'Ring count',
    kind: 'int',
    min: 1,
    max: 40,
    step: 1,
    live: false,
  },
  {
    key: 'innerRadius',
    group: 'Arena & Rings',
    label: 'Inner radius',
    kind: 'range',
    min: 40,
    max: 300,
    step: 5,
    live: false,
  },
  {
    key: 'ringSpacing',
    group: 'Arena & Rings',
    label: 'Ring spacing',
    kind: 'range',
    min: 14,
    max: 80,
    step: 1,
    live: false,
  },
  {
    key: 'ringThickness',
    group: 'Arena & Rings',
    label: 'Ring thickness',
    kind: 'range',
    min: 1,
    max: 14,
    step: 1,
    live: true,
  },
  {
    key: 'gapDegrees',
    group: 'Arena & Rings',
    label: 'Gap size (°)',
    kind: 'range',
    min: 5,
    max: 180,
    step: 1,
    live: false,
  },
  {
    key: 'gapJitterDegrees',
    group: 'Arena & Rings',
    label: 'Gap jitter (°)',
    kind: 'range',
    min: 0,
    max: 60,
    step: 1,
    live: false,
  },
  {
    key: 'rotationSpeed',
    group: 'Arena & Rings',
    label: 'Rotation speed',
    kind: 'range',
    min: -3,
    max: 3,
    step: 0.05,
    live: false,
  },
  {
    key: 'rotationPattern',
    group: 'Arena & Rings',
    label: 'Rotation pattern',
    kind: 'select',
    live: false,
    options: [
      { value: 'uniform', label: 'Uniform' },
      { value: 'alternating', label: 'Alternating' },
      { value: 'scale', label: 'Faster outward' },
      { value: 'random', label: 'Random' },
    ],
  },
  {
    key: 'gapAlignment',
    group: 'Arena & Rings',
    label: 'Gap alignment',
    kind: 'select',
    live: false,
    options: [
      { value: 'aligned', label: 'Aligned' },
      { value: 'spiral', label: 'Spiral' },
      { value: 'random', label: 'Random' },
    ],
  },

  // --- Ball & Physics ---
  {
    key: 'gravity',
    group: 'Ball & Physics',
    label: 'Gravity',
    kind: 'range',
    min: 0,
    max: 6000,
    step: 50,
    live: true,
  },
  {
    key: 'restitution',
    group: 'Ball & Physics',
    label: 'Bounciness',
    kind: 'range',
    min: 0.8,
    max: 1.2,
    step: 0.01,
    live: true,
  },
  {
    key: 'ballRadius',
    group: 'Ball & Physics',
    label: 'Ball size',
    kind: 'range',
    min: 6,
    max: 40,
    step: 1,
    live: false,
  },
  {
    key: 'initialSpeed',
    group: 'Ball & Physics',
    label: 'Launch speed',
    kind: 'range',
    min: 100,
    max: 1400,
    step: 10,
    live: false,
  },
  {
    key: 'minSpeed',
    group: 'Ball & Physics',
    label: 'Speed floor',
    kind: 'range',
    min: 0,
    max: 800,
    step: 10,
    live: true,
  },
  {
    key: 'maxSpeed',
    group: 'Ball & Physics',
    label: 'Speed cap',
    kind: 'range',
    min: 800,
    max: 4000,
    step: 50,
    live: true,
  },

  // --- Rules ---
  {
    key: 'countdownSeconds',
    group: 'Rules',
    label: 'Countdown (s, 0 = off)',
    kind: 'range',
    min: 0,
    max: 300,
    step: 5,
    live: true,
  },
  { key: 'caption', group: 'Rules', label: 'Caption', kind: 'text', maxLength: 120, live: true },
  {
    key: 'seed',
    group: 'Rules',
    label: 'Seed',
    kind: 'int',
    min: 0,
    max: 999999,
    step: 1,
    live: false,
  },

  // --- Visuals ---
  {
    key: 'palette',
    group: 'Visuals',
    label: 'Palette',
    kind: 'select',
    live: true,
    options: [
      { value: 'rainbowAngle', label: 'Rainbow (by angle)' },
      { value: 'rainbowRing', label: 'Rainbow (by ring)' },
      { value: 'mono', label: 'Mono' },
      { value: 'fire', label: 'Fire' },
      { value: 'ice', label: 'Ice' },
    ],
  },
  {
    key: 'glow',
    group: 'Visuals',
    label: 'Glow',
    kind: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    live: true,
  },
  { key: 'trail', group: 'Visuals', label: 'Ball trail', kind: 'toggle', live: true },
  {
    key: 'trailLength',
    group: 'Visuals',
    label: 'Trail length',
    kind: 'int',
    min: 0,
    max: 60,
    step: 1,
    live: true,
  },
  { key: 'particles', group: 'Visuals', label: 'Shatter particles', kind: 'toggle', live: true },
  {
    key: 'particleIntensity',
    group: 'Visuals',
    label: 'Particle amount',
    kind: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    live: true,
  },
  { key: 'impactFlare', group: 'Visuals', label: 'Impact flare', kind: 'toggle', live: true },

  // --- Audio ---
  { key: 'soundEnabled', group: 'Audio', label: 'Sound', kind: 'toggle', live: true },
  {
    key: 'volume',
    group: 'Audio',
    label: 'Volume',
    kind: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    live: true,
  },
  {
    key: 'bounceSound',
    group: 'Audio',
    label: 'Bounce sound',
    kind: 'select',
    live: true,
    options: [
      { value: 'off', label: 'Off' },
      { value: 'tone', label: 'Single tone' },
      { value: 'rising', label: 'Rising per ring' },
      { value: 'melody', label: 'Melody' },
    ],
  },
  {
    key: 'melody',
    group: 'Audio',
    label: 'Melody (for melody mode)',
    kind: 'select',
    live: true,
    options: [
      { value: 'twinkle', label: 'Twinkle Twinkle' },
      { value: 'ode', label: 'Ode to Joy' },
      { value: 'frere', label: 'Frère Jacques' },
      { value: 'scale', label: 'Major scale' },
      { value: 'arp', label: 'Arpeggio' },
    ],
  },
  { key: 'ringBreakSound', group: 'Audio', label: 'Ring-break SFX', kind: 'toggle', live: true },

  // --- Layout & feel ---
  {
    key: 'aspect',
    group: 'Layout',
    label: 'Aspect ratio',
    kind: 'select',
    live: false,
    options: [
      { value: '9:16', label: 'Portrait 9:16' },
      { value: '1:1', label: 'Square 1:1' },
      { value: '16:9', label: 'Landscape 16:9' },
    ],
  },
  { key: 'screenShake', group: 'Layout', label: 'Screen shake', kind: 'toggle', live: true },
];

/** Look up a control by its settings key. */
export function controlFor(key: keyof Settings): Control | undefined {
  return SCHEMA.find((c) => c.key === key);
}
