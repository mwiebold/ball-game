/**
 * Fixed-timestep game loop with a render interpolation alpha.
 *
 * Physics advances in discrete steps of `stepSeconds` (default 1/60) so the
 * simulation is deterministic and independent of display refresh rate
 * (REQUIREMENTS N-5). Rendering happens once per animation frame. When the
 * display runs faster or slower than the sim rate, `step` is called zero or
 * more times per frame to catch up, and `render` receives an interpolation
 * alpha in [0, 1) for smoothing between the two most recent sim states.
 *
 * The accumulator is clamped to avoid the "spiral of death" if the tab is
 * backgrounded and a huge time delta arrives on the next frame.
 */

export interface GameLoopOptions {
  /** Advance the simulation by one fixed step. */
  step: () => void;
  /**
   * Draw a frame. `alpha` is the fractional progress toward the next sim step,
   * useful for interpolating positions. `frameSeconds` is the real wall-clock
   * time since the previous rendered frame (for FPS/telemetry only).
   */
  render: (frameSeconds: number, alpha: number) => void;
  /** Fixed simulation step size in seconds. Defaults to 1/60. */
  stepSeconds?: number;
  /** Max simulation time processed per frame, to bound catch-up. Defaults to 0.25s. */
  maxFrameSeconds?: number;
  /** Injectable clock (ms) for testing. Defaults to performance.now. */
  now?: () => number;
  /** Injectable rAF scheduler for testing. Defaults to requestAnimationFrame. */
  raf?: (cb: (t: number) => void) => number;
  /** Injectable rAF canceller for testing. Defaults to cancelAnimationFrame. */
  cancelRaf?: (handle: number) => void;
}

export class GameLoop {
  private readonly stepSeconds: number;
  private readonly maxFrameSeconds: number;
  private readonly stepFn: () => void;
  private readonly renderFn: (frameSeconds: number, alpha: number) => void;
  private readonly now: () => number;
  private readonly raf: (cb: (t: number) => void) => number;
  private readonly cancelRaf: (handle: number) => void;

  private running = false;
  private handle: number | null = null;
  private lastMs = 0;
  private accumulator = 0;

  constructor(opts: GameLoopOptions) {
    this.stepFn = opts.step;
    this.renderFn = opts.render;
    this.stepSeconds = opts.stepSeconds ?? 1 / 60;
    this.maxFrameSeconds = opts.maxFrameSeconds ?? 0.25;
    this.now = opts.now ?? (() => performance.now());
    this.raf = opts.raf ?? ((cb) => requestAnimationFrame(cb));
    this.cancelRaf = opts.cancelRaf ?? ((h) => cancelAnimationFrame(h));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastMs = this.now();
    this.accumulator = 0;
    this.handle = this.raf(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.handle !== null) {
      this.cancelRaf(this.handle);
      this.handle = null;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  private frame = (tMs: number): void => {
    if (!this.running) return;

    let frameSeconds = (tMs - this.lastMs) / 1000;
    this.lastMs = tMs;
    if (frameSeconds > this.maxFrameSeconds) frameSeconds = this.maxFrameSeconds;

    // Epsilon guards against floating-point drift: at a display rate that
    // exactly matches the sim rate, accumulated rounding can leave the
    // accumulator a few ULP below stepSeconds, silently dropping one tick
    // every several frames. A tolerance far below any real sub-step time but
    // above fp noise keeps matched-refresh runs at exactly one step per frame.
    const epsilon = this.stepSeconds * 1e-6;
    this.accumulator += frameSeconds;
    while (this.accumulator >= this.stepSeconds - epsilon) {
      this.stepFn();
      this.accumulator -= this.stepSeconds;
    }
    if (this.accumulator < 0) this.accumulator = 0;

    const alpha = this.accumulator / this.stepSeconds;
    this.renderFn(frameSeconds, alpha);

    this.handle = this.raf(this.frame);
  };
}
