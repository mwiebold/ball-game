import type { SimEvent } from './events';
import { clampSpeed, lerp, reflect, solveOutwardCrossing } from './physics';
import { buildRings, inGap, normalizeAngle } from './rings';
import { Rng } from './rng';
import { WORLD_HEIGHT, WORLD_WIDTH } from './settings';
import type { Ball, Phase, Ring, Settings, Vec2 } from './types';

export const STEP_SECONDS = 1 / 60;

/**
 * The ball-escape simulation.
 *
 * A single ball falls under gravity inside a stack of concentric ring arcs. It
 * only ever interacts with the innermost surviving ring (all others are outside
 * it), so collision is a single continuous circle-vs-arc test per step. When
 * the ball passes through that ring's gap, the ring shatters and the next ring
 * out becomes innermost — so rings are destroyed strictly innermost-first.
 * Clearing the last ring is a win; the countdown expiring first is a loss.
 *
 * The whole run is a pure function of (settings, seed): given the same inputs it
 * produces byte-identical state and events (REQUIREMENTS F-7, N-5). Rendering,
 * audio, and particles live outside this class.
 */
export class World {
  readonly settings: Settings;
  readonly width = WORLD_WIDTH;
  readonly height = WORLD_HEIGHT;
  readonly center: Vec2;

  rings: Ring[] = [];
  ball!: Ball;
  /** Index of the innermost surviving ring; === rings.length once all cleared. */
  innermostIndex = 0;
  phase: Phase = 'playing';
  elapsed = 0;
  timeRemaining: number;

  private rng!: Rng;

  constructor(settings: Settings) {
    this.settings = settings;
    this.center = { x: this.width / 2, y: this.height / 2 };
    this.timeRemaining = settings.countdownSeconds;
    this.reset();
  }

  /** Restore the world to its initial seeded state. */
  reset(): void {
    this.rng = new Rng(this.settings.seed);
    this.rings = buildRings(this.settings, this.rng);
    this.innermostIndex = 0;
    this.phase = 'playing';
    this.elapsed = 0;
    this.timeRemaining = this.settings.countdownSeconds;

    const dir = this.rng.angle();
    this.ball = {
      x: this.center.x,
      y: this.center.y,
      vx: Math.cos(dir) * this.settings.initialSpeed,
      vy: Math.sin(dir) * this.settings.initialSpeed,
      radius: this.settings.ballRadius,
    };
  }

  /** True while the run is live. */
  get isPlaying(): boolean {
    return this.phase === 'playing';
  }

  /** Advance the simulation by one fixed step, returning events for this step. */
  step(): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.phase !== 'playing') return events;

    const dt = STEP_SECONDS;
    this.elapsed += dt;

    // Rotate surviving rings.
    for (let i = this.innermostIndex; i < this.rings.length; i++) {
      const ring = this.rings[i]!;
      ring.gapCenter = normalizeAngle(ring.gapCenter + ring.omega * dt);
    }

    this.integrateBall(dt, events);

    // Countdown / loss.
    if (this.settings.countdownSeconds > 0) {
      this.timeRemaining = Math.max(0, this.settings.countdownSeconds - this.elapsed);
      if (this.timeRemaining <= 0 && this.phase === 'playing') {
        this.phase = 'lost';
        events.push({ type: 'lose', ringsRemaining: this.rings.length - this.innermostIndex });
      }
    }

    return events;
  }

  private integrateBall(dt: number, events: SimEvent[]): void {
    const ball = this.ball;
    const s = this.settings;

    // Semi-implicit Euler: gravity, then move.
    ball.vy += s.gravity * dt;
    const capped = clampSpeed({ x: ball.vx, y: ball.vy }, 0, s.maxSpeed);
    ball.vx = capped.x;
    ball.vy = capped.y;

    const p0: Vec2 = { x: ball.x, y: ball.y };
    const p1: Vec2 = { x: ball.x + ball.vx * dt, y: ball.y + ball.vy * dt };

    const ring = this.rings[this.innermostIndex];
    if (!ring) {
      ball.x = p1.x;
      ball.y = p1.y;
      return;
    }

    // Ball bounces when its outer edge reaches the ring centerline: dist >= R - r.
    const wallRadius = ring.radius - ball.radius;
    const dx = p1.x - this.center.x;
    const dy = p1.y - this.center.y;
    const distNew = Math.hypot(dx, dy);

    if (distNew < wallRadius) {
      ball.x = p1.x;
      ball.y = p1.y;
      return;
    }

    // At or beyond the wall this step. Find the contact angle (continuous when
    // possible so a fast ball can't skip the wall).
    const tau = solveOutwardCrossing(p0, p1, this.center, wallRadius);
    const contact = tau !== null ? lerp(p0, p1, tau) : p1;
    const contactAngle = Math.atan2(contact.y - this.center.y, contact.x - this.center.x);

    if (inGap(contactAngle, ring.gapCenter, ring.gapHalf)) {
      // Passing through the opening.
      ball.x = p1.x;
      ball.y = p1.y;
      // Ring breaks once the ball is fully past the centerline.
      if (distNew >= ring.radius + ball.radius) {
        events.push({ type: 'ringBreak', x: p1.x, y: p1.y, ringIndex: ring.index });
        this.innermostIndex += 1;
        if (this.innermostIndex >= this.rings.length) {
          this.phase = 'won';
          events.push({ type: 'win', timeSeconds: this.elapsed });
        }
      }
      return;
    }

    // Hit the wall: reflect about the radial normal and place just inside.
    const nx = contact.x - this.center.x;
    const ny = contact.y - this.center.y;
    const nlen = Math.hypot(nx, ny) || 1;
    const n: Vec2 = { x: nx / nlen, y: ny / nlen };

    let v = reflect({ x: ball.vx, y: ball.vy }, n);
    v = { x: v.x * s.restitution, y: v.y * s.restitution };
    v = clampSpeed(v, s.minSpeed, s.maxSpeed);
    ball.vx = v.x;
    ball.vy = v.y;

    // Reposition just inside the wall so the next step starts clean.
    ball.x = this.center.x + n.x * (wallRadius - 0.5);
    ball.y = this.center.y + n.y * (wallRadius - 0.5);

    events.push({
      type: 'bounce',
      x: ball.x,
      y: ball.y,
      speed: Math.hypot(v.x, v.y),
      ringIndex: ring.index,
    });
  }
}
