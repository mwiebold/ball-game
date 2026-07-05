/**
 * Ember-burst particle system for ring shatter (REQUIREMENTS S-19).
 *
 * Purely cosmetic and render-side: it uses Math.random (never the sim's seeded
 * RNG) so it can't affect the deterministic simulation. A hard cap on live
 * particles provides the budget-based degradation required by N-2 — once the
 * cap is hit, new bursts spawn fewer particles rather than dropping frames.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
}

const GRAVITY = 900; // world units / s^2 for embers
const MAX_PARTICLES = 700;

export class ParticleSystem {
  private particles: Particle[] = [];

  /**
   * Spawn a burst at (x, y). `intensity` in [0,1] scales the count. Respects the
   * global cap: if the pool is near full, fewer are spawned.
   */
  spawnBurst(x: number, y: number, hue: number, intensity: number): void {
    const want = Math.round(4 + intensity * 44);
    const budget = MAX_PARTICLES - this.particles.length;
    const n = Math.max(0, Math.min(want, budget));
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 480 * (0.5 + intensity);
      const maxLife = 0.5 + Math.random() * 0.9;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        hue: hue + (Math.random() * 30 - 15),
        size: 2 + Math.random() * 3,
      });
    }
  }

  update(dt: number): void {
    const live: Particle[] = [];
    for (const p of this.particles) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life > 0) live.push(p);
    }
    this.particles = live;
  }

  /** Draw additively; `scale` maps world units to canvas pixels. */
  draw(ctx: CanvasRenderingContext2D, scale: number): void {
    if (this.particles.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x * scale, p.y * scale, p.size * scale * (0.4 + 0.6 * a), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 95%, 62%, ${a})`;
      ctx.fill();
    }
    ctx.restore();
  }

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}

export { MAX_PARTICLES };
