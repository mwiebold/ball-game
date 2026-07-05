import { DEFAULT_SETTINGS } from '../core/settings';
import type { Settings } from '../core/types';

/**
 * Bundled presets (REQUIREMENTS S-36), including a "Reference video" preset
 * tuned to resemble the source clip: many thin rings, a full rainbow, small
 * gaps, and a slow spin. Each preset is a complete Settings so loading one is a
 * straight replace.
 */
export interface Preset {
  name: string;
  settings: Settings;
}

export const PRESETS: readonly Preset[] = [
  {
    name: 'Default',
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    name: 'Reference video',
    settings: {
      ...DEFAULT_SETTINGS,
      seed: 7,
      ringCount: 16,
      innerRadius: 90,
      ringSpacing: 26,
      ringThickness: 4,
      gapDegrees: 34,
      gapJitterDegrees: 10,
      rotationSpeed: 0.5,
      rotationPattern: 'scale',
      gapAlignment: 'random',
      gravity: 2600,
      ballRadius: 13,
      initialSpeed: 680,
      countdownSeconds: 60,
      caption: 'The ball has to escape in under 1 minute!',
    },
  },
  {
    name: 'Chaos',
    settings: {
      ...DEFAULT_SETTINGS,
      seed: 13,
      ringCount: 24,
      innerRadius: 70,
      ringSpacing: 18,
      ringThickness: 3,
      gapDegrees: 26,
      gapJitterDegrees: 18,
      rotationSpeed: 1.8,
      rotationPattern: 'random',
      gapAlignment: 'random',
      initialSpeed: 900,
      countdownSeconds: 90,
      caption: 'Can it escape the chaos?',
    },
  },
  {
    name: 'Speedrun',
    settings: {
      ...DEFAULT_SETTINGS,
      seed: 3,
      ringCount: 6,
      innerRadius: 140,
      ringSpacing: 48,
      ringThickness: 7,
      gapDegrees: 80,
      gapJitterDegrees: 10,
      rotationSpeed: 1.2,
      rotationPattern: 'alternating',
      initialSpeed: 820,
      countdownSeconds: 20,
      caption: 'Escape in 20 seconds!',
    },
  },
  {
    name: 'Zen (sandbox)',
    settings: {
      ...DEFAULT_SETTINGS,
      seed: 21,
      ringCount: 14,
      innerRadius: 100,
      ringSpacing: 30,
      ringThickness: 5,
      gapDegrees: 50,
      gapJitterDegrees: 20,
      rotationSpeed: 0.3,
      rotationPattern: 'uniform',
      gravity: 1600,
      restitution: 1.0,
      initialSpeed: 500,
      countdownSeconds: 0,
      caption: 'No timer — just watch it bounce.',
    },
  },
];

export function presetByName(name: string): Preset | undefined {
  return PRESETS.find((p) => p.name === name);
}
