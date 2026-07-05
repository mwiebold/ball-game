import type { PaletteName } from '../core/types';

/**
 * Color palettes for the ring stack and ball (REQUIREMENTS S-17).
 *
 * Only 'rainbowAngle' is angular (hue mapped to the angle around the circle,
 * like the reference video) — it is drawn with a conic gradient. The others are
 * solid per ring. `paletteHue` gives the representative hue at a point, used for
 * shatter particles and the ball tint.
 */

const TAU = Math.PI * 2;

export function isAngular(palette: PaletteName): boolean {
  return palette === 'rainbowAngle';
}

/** Hue (degrees) at a given normalized angle [0,1) and ring index. */
export function paletteHue(
  palette: PaletteName,
  angleNorm: number,
  index: number,
  count: number,
): number {
  const frac = count > 1 ? index / (count - 1) : 0;
  switch (palette) {
    case 'rainbowAngle':
      return (((angleNorm % 1) + 1) % 1) * 360;
    case 'rainbowRing':
      return frac * 330;
    case 'mono':
      return 320;
    case 'fire':
      return 8 + frac * 46; // deep red -> yellow
    case 'ice':
      return 170 + frac * 95; // cyan -> violet
  }
}

/** Solid CSS color for a ring under a non-angular palette. */
export function ringSolidColor(palette: PaletteName, index: number, count: number): string {
  const hue = paletteHue(palette, 0, index, count);
  const light = palette === 'mono' ? 62 : 60;
  return `hsl(${hue}, 88%, ${light}%)`;
}

/** Build the conic gradient used for the 'rainbowAngle' palette. */
export function angularGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): CanvasGradient {
  const g = ctx.createConicGradient(0, cx, cy);
  const stops = 12;
  for (let i = 0; i <= stops; i++) {
    g.addColorStop(i / stops, `hsl(${(i / stops) * 360}, 88%, 60%)`);
  }
  return g;
}

/** CSS color for the ball, tinted to complement the palette. */
export function ballColor(palette: PaletteName): string {
  switch (palette) {
    case 'fire':
      return '#ffd24a';
    case 'ice':
      return '#7cf0ff';
    default:
      return '#ff3cc8';
  }
}

export { TAU };
