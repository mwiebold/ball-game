/**
 * Deterministic seeded pseudo-random generator (mulberry32).
 *
 * A fixed seed produces a fixed stream, which is what makes whole simulations
 * reproducible from (seed, settings) — required for shareable configs and exact
 * replays (REQUIREMENTS F-7, N-5). Do NOT use Math.random in the sim core.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Coerce to a 32-bit unsigned integer state.
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Either -1 or +1. */
  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }

  /** Angle in [0, 2π). */
  angle(): number {
    return this.next() * Math.PI * 2;
  }
}
