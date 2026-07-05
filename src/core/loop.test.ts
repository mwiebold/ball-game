import { describe, it, expect } from 'vitest';
import { GameLoop } from './loop';

/**
 * Drives the loop with a fake clock and a manual rAF queue so we can assert the
 * fixed-timestep accumulator behavior deterministically.
 */
function makeHarness() {
  let time = 0;
  const queue: Array<(t: number) => void> = [];
  const loopRefs: { loop?: GameLoop } = {};

  const now = () => time;
  const raf = (cb: (t: number) => void): number => {
    queue.push(cb);
    return queue.length;
  };
  const cancelRaf = () => {};

  /** Advance wall-clock by `ms` and run exactly one queued frame callback. */
  const tick = (ms: number) => {
    time += ms;
    const cb = queue.shift();
    if (cb) cb(time);
  };

  return { now, raf, cancelRaf, tick, setLoop: (l: GameLoop) => (loopRefs.loop = l) };
}

describe('GameLoop', () => {
  it('runs one fixed step per sim interval at matched refresh', () => {
    const h = makeHarness();
    let steps = 0;
    let renders = 0;
    const loop = new GameLoop({
      step: () => steps++,
      render: () => renders++,
      stepSeconds: 1 / 60,
      now: h.now,
      raf: h.raf,
      cancelRaf: h.cancelRaf,
    });
    h.setLoop(loop);
    loop.start();

    // 10 frames at ~16.667ms each => 10 steps, 10 renders.
    for (let i = 0; i < 10; i++) h.tick(1000 / 60);

    expect(steps).toBe(10);
    expect(renders).toBe(10);
  });

  it('catches up with multiple steps on a slow frame', () => {
    const h = makeHarness();
    let steps = 0;
    const loop = new GameLoop({
      step: () => steps++,
      render: () => {},
      stepSeconds: 1 / 60,
      now: h.now,
      raf: h.raf,
      cancelRaf: h.cancelRaf,
    });
    loop.start();

    // One big 100ms frame => 6 fixed steps (100ms / 16.667ms = 6.0).
    h.tick(100);
    expect(steps).toBe(6);
  });

  it('clamps huge deltas to avoid the spiral of death', () => {
    const h = makeHarness();
    let steps = 0;
    const loop = new GameLoop({
      step: () => steps++,
      render: () => {},
      stepSeconds: 1 / 60,
      maxFrameSeconds: 0.25,
      now: h.now,
      raf: h.raf,
      cancelRaf: h.cancelRaf,
    });
    loop.start();

    // 10 seconds elapsed (backgrounded tab) clamps to 0.25s => 15 steps, not 600.
    h.tick(10_000);
    expect(steps).toBe(15);
  });

  it('passes an interpolation alpha in [0, 1) to render', () => {
    const h = makeHarness();
    let lastAlpha = -1;
    const loop = new GameLoop({
      step: () => {},
      render: (_dt, alpha) => (lastAlpha = alpha),
      stepSeconds: 1 / 60,
      now: h.now,
      raf: h.raf,
      cancelRaf: h.cancelRaf,
    });
    loop.start();

    // Advance half a step; no full step fires, alpha ~= 0.5.
    h.tick(1000 / 120);
    expect(lastAlpha).toBeGreaterThanOrEqual(0);
    expect(lastAlpha).toBeLessThan(1);
    expect(lastAlpha).toBeCloseTo(0.5, 1);
  });

  it('does not run frames after stop()', () => {
    const h = makeHarness();
    let renders = 0;
    const loop = new GameLoop({
      step: () => {},
      render: () => renders++,
      now: h.now,
      raf: h.raf,
      cancelRaf: h.cancelRaf,
    });
    loop.start();
    h.tick(1000 / 60);
    expect(renders).toBe(1);

    loop.stop();
    h.tick(1000 / 60);
    expect(renders).toBe(1);
    expect(loop.isRunning).toBe(false);
  });
});
