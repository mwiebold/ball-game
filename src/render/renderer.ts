import type { World } from '../core/sim';

const TAU = Math.PI * 2;

/**
 * Phase 1 renderer: basic flat-color drawing of the world onto a 2D canvas.
 *
 * Draws surviving ring arcs (skipping each ring's gap), the ball with a short
 * motion trail, the caption, the countdown, and a win/lose overlay. The richer
 * neon glow, rainbow-by-angle palette, and shatter particles are Phase 3.
 */
export class Renderer {
  private trail: Array<{ x: number; y: number }> = [];
  private readonly maxTrail = 24;

  /** Clear trail state on restart. */
  reset(): void {
    this.trail = [];
  }

  draw(ctx: CanvasRenderingContext2D, world: World): void {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const scale = cw / world.width; // canvas matches world aspect (9:16)

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    const cx = world.center.x * scale;
    const cy = world.center.y * scale;

    this.drawRings(ctx, world, scale, cx, cy);
    this.drawBall(ctx, world, scale);
    this.drawHud(ctx, world, scale);
  }

  private drawRings(
    ctx: CanvasRenderingContext2D,
    world: World,
    scale: number,
    cx: number,
    cy: number,
  ): void {
    ctx.lineCap = 'round';
    for (let i = world.innermostIndex; i < world.rings.length; i++) {
      const ring = world.rings[i]!;
      // Draw the wall: the complement of the gap arc.
      const start = ring.gapCenter + ring.gapHalf;
      const end = ring.gapCenter - ring.gapHalf + TAU;
      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius * scale, start, end);
      ctx.strokeStyle = `hsl(${ring.hue}, 85%, 60%)`;
      ctx.lineWidth = ring.thickness * scale;
      ctx.stroke();
    }
  }

  private drawBall(ctx: CanvasRenderingContext2D, world: World, scale: number): void {
    const ball = world.ball;
    const bx = ball.x * scale;
    const by = ball.y * scale;

    // Update and draw a fading trail.
    this.trail.push({ x: bx, y: by });
    if (this.trail.length > this.maxTrail) this.trail.shift();
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i]!;
      const t = i / this.trail.length;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ball.radius * scale * (0.3 + 0.7 * t), 0, TAU);
      ctx.fillStyle = `rgba(255, 60, 200, ${0.05 + 0.25 * t})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(bx, by, ball.radius * scale, 0, TAU);
    ctx.fillStyle = '#ff3cc8';
    ctx.fill();
  }

  private drawHud(ctx: CanvasRenderingContext2D, world: World, scale: number): void {
    const cw = ctx.canvas.width;
    ctx.textAlign = 'center';

    // Caption near the top.
    ctx.fillStyle = '#e8e8f0';
    ctx.font = `${Math.round(34 * scale)}px system-ui, sans-serif`;
    ctx.fillText(world.settings.caption, cw / 2, 90 * scale);

    // Countdown (if enabled).
    if (world.settings.countdownSeconds > 0) {
      const secs = Math.ceil(world.timeRemaining);
      const mm = Math.floor(secs / 60);
      const ss = secs % 60;
      ctx.fillStyle = world.timeRemaining < 10 ? '#ff5a5a' : '#c8c8d4';
      ctx.font = `${Math.round(30 * scale)}px monospace`;
      ctx.fillText(`${mm}:${ss.toString().padStart(2, '0')}`, cw / 2, 140 * scale);
    }

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
