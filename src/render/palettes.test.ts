import { describe, it, expect } from 'vitest';
import { isAngular, paletteHue, ringSolidColor, ballColor } from './palettes';
import type { PaletteName } from '../core/types';

describe('palettes', () => {
  it('marks only rainbowAngle as angular', () => {
    expect(isAngular('rainbowAngle')).toBe(true);
    for (const p of ['rainbowRing', 'mono', 'fire', 'ice'] as PaletteName[]) {
      expect(isAngular(p)).toBe(false);
    }
  });

  it('rainbowAngle hue tracks the angle', () => {
    expect(paletteHue('rainbowAngle', 0, 0, 10)).toBeCloseTo(0);
    expect(paletteHue('rainbowAngle', 0.5, 0, 10)).toBeCloseTo(180);
    // wraps negative/over-1 angles
    expect(paletteHue('rainbowAngle', 1.25, 0, 10)).toBeCloseTo(90);
  });

  it('fire and ice stay within their hue bands across the stack', () => {
    for (let i = 0; i < 12; i++) {
      const fire = paletteHue('fire', 0, i, 12);
      expect(fire).toBeGreaterThanOrEqual(8);
      expect(fire).toBeLessThanOrEqual(54);
      const ice = paletteHue('ice', 0, i, 12);
      expect(ice).toBeGreaterThanOrEqual(170);
      expect(ice).toBeLessThanOrEqual(265);
    }
  });

  it('ringSolidColor produces an hsl string', () => {
    expect(ringSolidColor('rainbowRing', 3, 12)).toMatch(/^hsl\(/);
  });

  it('ballColor is defined for every palette', () => {
    for (const p of ['rainbowAngle', 'rainbowRing', 'mono', 'fire', 'ice'] as PaletteName[]) {
      expect(ballColor(p)).toMatch(/^#|^hsl/);
    }
  });
});
