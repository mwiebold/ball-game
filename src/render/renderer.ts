import type { SimEvent } from '../core/events';
import type { World } from '../core/sim';
import type { Ring } from '../core/types';
import { ParticleSystem } from './particles';
import { angularGradient, ballColor, isAngular, paletteHue, ringSolidColor, TAU } from './palettes';

interface Flare {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface TrailPoint {
  x: number;
  y: number;
}

/**
 * Phase 3 renderer: neon rendering of the world.
 *
 * Rings use the selected palette (the reference's rainbow-by-angle is a conic
 * gradient) with an additive glow pass. The ball has a radial-gradient glow, a
 * fading trail, and an expanding flare on each bounce. Ring shatter spawns ember
 * particles. Glow uses the additive 'lighter' composite with translucent
 * over-strokes rather than shadowBlur, per the BUILD_PLAN performance note.
 *
 * Event handling (`handleEvent`) is driven from the sim's event stream so
 * flares and particles line up with real bounces and ring breaks.
 */
export class Renderer {
  private readonly particles = new ParticleSystem();
  private trail: TrailPoint[] = [];
  private flares: Flare[] = [];
  private shake = 0; // current screen-shake magnitude, world units

  reset(): void {
    this.trail = [];
    this.flares = [];
    this.particles.clear();
    this.shake = 0;
  }

  /** React to a sim event (bounce flare, ring-break embers). */
  handleEvent(event: SimEvent, world: World): void {
    const s = world.settings;
    if (event.type === 'bounce' && s.impactFlare) {
      const angleNorm = angleNormOf(event.x, event.y, world.center.x, world.center.y);
      this.flares.push({
        x: event.x,
        y: event.y,
        life: 0.25,
        maxLife: 0.25,
        hue: paletteHue(s.palette, angleNorm, event.ringIndex, world.rings.length),
      });
      if (this.flares.length > 24) this.flares.shift();
    } else if (event.type === 'ringBreak') {
      if (s.particles) {
        const angleNorm = angleNormOf(event.x, event.y, world.center.x, world.center.y);
        const hue = paletteHue(s.palette, angleNorm, event.ringIndex, world.rings.length);
        this.particles.spawnBurst(event.x, event.y, hue, s.particleIntensity);
      }
      if (s.screenShake) this.shake = Math.max(this.shake, 12);
    }
  }

  draw(ctx: CanvasRenderingContext2D, world: World, frameSeconds: number): void {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const scale = cw / world.width;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    // Screen shake: offset the playfield (not the HUD) by a decaying jitter.
    let ox = 0;
    let oy = 0;
    if (this.shake > 0.01) {
      ox = (Math.random() * 2 - 1) * this.shake * scale;
      oy = (Math.random() * 2 - 1) * this.shake * scale;
      this.shake = Math.max(0, this.shake - frameSeconds * 60);
    } else {
      this.shake = 0;
    }

    ctx.save();
    ctx.translate(ox, oy);

    const cx = world.center.x * scale;
    const cy = world.center.y * scale;

    this.drawRings(ctx, world, scale, cx, cy);

    this.particles.update(frameSeconds);
    this.particles.draw(ctx, scale);

    this.updateFlares(frameSeconds);
    this.drawTrailAndBall(ctx, world, scale);
    this.drawFlares(ctx, scale);

    ctx.restore();

    this.drawHud(ctx, world, scale);
  }

  private drawRings(
    ctx: CanvasRenderingContext2D,
    world: World,
    scale: number,
    cx: number,
    cy: number,
  ): void {
    const s = world.settings;
    ctx.lineCap = 'round';
    const angular = isAngular(s.palette);
    const gradient = angular ? angularGradient(ctx, cx, cy) : null;

    for (let i = world.innermostIndex; i < world.rings.length; i++) {
      const ring = world.rings[i]!;
      const stroke: string | CanvasGradient =
        gradient ?? ringSolidColor(s.palette, i, world.rings.length);
      this.drawRingArc(ctx, ring, scale, cx, cy, stroke, s.glow);
    }
  }

  private drawRingArc(
    ctx: CanvasRenderingContext2D,
    ring: Ring,
    scale: number,
    cx: number,
    cy: number,
    stroke: string | CanvasGradient,
    glow: number,
  ): void {
    const r = ring.radius * scale;
    const start = ring.gapCenter + ring.gapHalf;
    const end = ring.gapCenter - ring.gapHalf + TAU;
    const base = Math.max(1, ring.thickness * scale);

    // Additive glow underlay.
    if (glow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 * glow;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = base * (1 + 5 * glow);
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, end);
      ctx.stroke();
      ctx.restore();
    }

    // Crisp ring.
    ctx.strokeStyle = stroke;
    ctx.lineWidth = base;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
  }

  private drawTrailAndBall(ctx: CanvasRenderingContext2D, world: World, scale: number): void {
    const s = world.settings;
    const ball = world.ball;
    const bx = ball.x * scale;
    const by = ball.y * scale;
    const br = ball.radius * scale;
    const color = ballColor(s.palette);

    // Trail.
    if (s.trail && s.trailLength > 0) {
      this.trail.push({ x: bx, y: by });
      while (this.trail.length > s.trailLength) this.trail.shift();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i]!;
        const t = i / this.trail.length;
        ctx.beginPath();
        ctx.arc(p.x, p.y, br * (0.25 + 0.6 * t), 0, TAU);
        ctx.fillStyle = colorWithAlpha(color, 0.04 + 0.3 * t);
        ctx.fill();
      }
      ctx.restore();
    } else if (this.trail.length) {
      this.trail = [];
    }

    // Glow halo.
    if (s.glow > 0) {
      const halo = br * (2 + 3 * s.glow);
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, halo);
      grad.addColorStop(0, colorWithAlpha(color, 0.5 * s.glow));
      grad.addColorStop(1, colorWithAlpha(color, 0));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, halo, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Core.
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }

  private updateFlares(dt: number): void {
    for (const f of this.flares) f.life -= dt;
    this.flares = this.flares.filter((f) => f.life > 0);
  }

  private drawFlares(ctx: CanvasRenderingContext2D, scale: number): void {
    if (this.flares.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flares) {
      const t = f.life / f.maxLife; // 1 -> 0
      const radius = (6 + (1 - t) * 26) * scale;
      ctx.beginPath();
      ctx.arc(f.x * scale, f.y * scale, radius, 0, TAU);
      ctx.strokeStyle = `hsla(${f.hue}, 95%, 70%, ${t})`;
      ctx.lineWidth = 2.5 * scale * t;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHud(ctx: CanvasRenderingContext2D, world: World, scale: number): void {
    const cw = ctx.canvas.width;
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6 * scale;

    ctx.fillStyle = '#f2f2f8';
    ctx.font = `${Math.round(34 * scale)}px system-ui, sans-serif`;
    ctx.fillText(world.settings.caption, cw / 2, 90 * scale);

    if (world.settings.countdownSeconds > 0) {
      const secs = Math.ceil(world.timeRemaining);
      const mm = Math.floor(secs / 60);
      const ss = secs % 60;
      ctx.fillStyle = world.timeRemaining < 10 ? '#ff6a6a' : '#c8c8d4';
      ctx.font = `${Math.round(30 * scale)}px monospace`;
      ctx.fillText(`${mm}:${ss.toString().padStart(2, '0')}`, cw / 2, 140 * scale);
    }
    ctx.restore();

    if (world.phase === 'won' || world.phase === 'lost') {
      this.drawEndOverlay(ctx, world, scale);
    }
  }

  private drawEndOverlay(ctx: CanvasRenderingContext2D, world: World, scale: number): void {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = 'center';
    const won = world.phase === 'won';
    ctx.fillStyle = won ? '#6cff9e' : '#ff6c6c';
    ctx.font = `bold ${Math.round(64 * scale)}px system-ui, sans-serif`;
    ctx.fillText(won ? 'ESCAPED!' : "TIME'S UP", cw / 2, ch / 2 - 20 * scale);

    if (won) {
      ctx.fillStyle = '#c8c8d4';
      ctx.font = `${Math.round(28 * scale)}px system-ui, sans-serif`;
      ctx.fillText(`in ${world.elapsed.toFixed(1)}s`, cw / 2, ch / 2 + 30 * scale);
    }

    ctx.fillStyle = '#8a8a99';
    ctx.font = `${Math.round(24 * scale)}px system-ui, sans-serif`;
    ctx.fillText('click or press R to replay', cw / 2, ch / 2 + 80 * scale);
  }
}

/** Normalized [0,1) angle of a point around the center. */
function angleNormOf(x: number, y: number, cx: number, cy: number): number {
  const a = Math.atan2(y - cy, x - cx);
  return (((a / TAU) % 1) + 1) % 1;
}

/** Apply an alpha to a hex or hsl color by drawing over globalAlpha-free. */
function colorWithAlpha(color: string, alpha: number): string {
  // color is a hex like #ff3cc8 — convert to rgba.
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
