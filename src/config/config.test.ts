import { describe, it, expect } from 'vitest';
import { SCHEMA, GROUPS } from './schema';
import { DEFAULT_SETTINGS } from '../core/settings';
import { PRESETS } from './presets';
import { randomizeSettings } from './randomize';
import { Rng } from '../core/rng';
import { World } from '../core/sim';
import type { Settings } from '../core/types';

describe('schema integrity', () => {
  it('every control key exists in Settings with a default value', () => {
    for (const c of SCHEMA) {
      expect(DEFAULT_SETTINGS[c.key]).toBeDefined();
    }
  });

  it('every numeric default sits within its control bounds', () => {
    for (const c of SCHEMA) {
      if (c.kind === 'range' || c.kind === 'int') {
        const v = DEFAULT_SETTINGS[c.key] as number;
        expect(v).toBeGreaterThanOrEqual(c.min);
        expect(v).toBeLessThanOrEqual(c.max);
      }
    }
  });

  it('every control belongs to a declared group', () => {
    for (const c of SCHEMA) {
      expect(GROUPS).toContain(c.group);
    }
  });

  it('has no duplicate keys', () => {
    const keys = SCHEMA.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('presets', () => {
  it('every preset validates against schema bounds', () => {
    for (const preset of PRESETS) {
      for (const c of SCHEMA) {
        if (c.kind === 'range' || c.kind === 'int') {
          const v = preset.settings[c.key] as number;
          expect(v, `${preset.name}.${c.key}`).toBeGreaterThanOrEqual(c.min);
          expect(v, `${preset.name}.${c.key}`).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  it('each preset is runnable and reaches a terminal or steady state', () => {
    for (const preset of PRESETS) {
      const world = new World(preset.settings);
      for (let i = 0; i < 60 * 30 && world.isPlaying; i++) world.step();
      // No throw, and the ball stays finite.
      expect(Number.isFinite(world.ball.x)).toBe(true);
      expect(Number.isFinite(world.ball.y)).toBe(true);
    }
  });
});

describe('randomizeSettings', () => {
  it('is deterministic for a given rng seed', () => {
    const a = randomizeSettings(new Rng(123));
    const b = randomizeSettings(new Rng(123));
    expect(a).toEqual(b);
  });

  it('produces schema-valid configs across many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s: Settings = randomizeSettings(new Rng(seed));
      for (const c of SCHEMA) {
        if (c.kind === 'range' || c.kind === 'int') {
          const v = s[c.key] as number;
          expect(v, `seed ${seed} ${c.key}`).toBeGreaterThanOrEqual(c.min);
          expect(v, `seed ${seed} ${c.key}`).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  it('keeps the outer ring inside the arena', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = randomizeSettings(new Rng(seed));
      const outer = s.innerRadius + (s.ringCount - 1) * s.ringSpacing;
      expect(outer, `seed ${seed}`).toBeLessThanOrEqual(500);
    }
  });
});
