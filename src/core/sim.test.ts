import { describe, it, expect } from 'vitest';
import { World } from './sim';
import { DEFAULT_SETTINGS } from './settings';
import type { SimEvent } from './events';
import type { Settings } from './types';

/** Run a world to completion (or a step cap), returning all emitted events. */
function runToEnd(settings: Settings, maxSteps = 60 * 180): SimEvent[] {
  const world = new World(settings);
  const events: SimEvent[] = [];
  for (let i = 0; i < maxSteps && world.isPlaying; i++) {
    events.push(...world.step());
  }
  return events;
}

describe('World determinism (F-7, N-5)', () => {
  it('same seed + settings produce identical ball state after N steps', () => {
    const a = new World(DEFAULT_SETTINGS);
    const b = new World(DEFAULT_SETTINGS);
    for (let i = 0; i < 600; i++) {
      a.step();
      b.step();
    }
    expect(a.ball).toEqual(b.ball);
    expect(a.innermostIndex).toBe(b.innermostIndex);
    expect(a.elapsed).toBe(b.elapsed);
  });

  it('same seed produces an identical event stream', () => {
    const a = runToEnd(DEFAULT_SETTINGS);
    const b = runToEnd(DEFAULT_SETTINGS);
    expect(a).toEqual(b);
  });

  it('different seeds diverge', () => {
    const a = new World({ ...DEFAULT_SETTINGS, seed: 1 });
    const b = new World({ ...DEFAULT_SETTINGS, seed: 2 });
    for (let i = 0; i < 600; i++) {
      a.step();
      b.step();
    }
    expect(a.ball).not.toEqual(b.ball);
  });
});

describe('ring destruction', () => {
  it('destroys rings strictly innermost-first', () => {
    // Big gaps + long timer so the ball clears every ring.
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ringCount: 6,
      gapDegrees: 120,
      gapJitterDegrees: 0,
      countdownSeconds: 0, // sandbox: no time pressure
    };
    const events = runToEnd(settings);
    const breakOrder = events
      .filter((e) => e.type === 'ringBreak')
      .map((e) => (e as Extract<SimEvent, { type: 'ringBreak' }>).ringIndex);

    expect(breakOrder).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('advances the innermost index as rings break', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ringCount: 4,
      gapDegrees: 140,
      gapJitterDegrees: 0,
      countdownSeconds: 0,
    };
    const world = new World(settings);
    let lastIndex = 0;
    for (let i = 0; i < 60 * 120 && world.isPlaying; i++) {
      world.step();
      expect(world.innermostIndex).toBeGreaterThanOrEqual(lastIndex);
      lastIndex = world.innermostIndex;
    }
  });
});

describe('win / lose', () => {
  it('emits exactly one win when the last ring is cleared', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ringCount: 5,
      gapDegrees: 120,
      gapJitterDegrees: 0,
      countdownSeconds: 0,
    };
    const events = runToEnd(settings);
    const wins = events.filter((e) => e.type === 'win');
    expect(wins).toHaveLength(1);
  });

  it('loses when the countdown expires with rings remaining', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ringCount: 30,
      gapDegrees: 6, // tiny openings
      gapJitterDegrees: 0,
      countdownSeconds: 0.5,
    };
    const world = new World(settings);
    const events: SimEvent[] = [];
    for (let i = 0; i < 60 && world.isPlaying; i++) {
      events.push(...world.step());
    }
    expect(world.phase).toBe('lost');
    expect(events.some((e) => e.type === 'lose')).toBe(true);
  });

  it('never loses in sandbox mode (countdown disabled)', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, countdownSeconds: 0 };
    const world = new World(settings);
    for (let i = 0; i < 600; i++) world.step();
    expect(world.phase).not.toBe('lost');
  });
});

describe('aspect ratio (S-8)', () => {
  it('sets world dimensions and center per aspect', () => {
    const portrait = new World({ ...DEFAULT_SETTINGS, aspect: '9:16' });
    expect(portrait.width).toBe(1080);
    expect(portrait.height).toBe(1920);
    expect(portrait.center).toEqual({ x: 540, y: 960 });

    const square = new World({ ...DEFAULT_SETTINGS, aspect: '1:1' });
    expect(square.width).toBe(1080);
    expect(square.height).toBe(1080);
    expect(square.center).toEqual({ x: 540, y: 540 });

    const landscape = new World({ ...DEFAULT_SETTINGS, aspect: '16:9' });
    expect(landscape.width).toBe(1920);
    expect(landscape.height).toBe(1080);
    expect(landscape.center).toEqual({ x: 960, y: 540 });
  });

  it('recomputes dimensions on reset when aspect changes', () => {
    const world = new World({ ...DEFAULT_SETTINGS, aspect: '9:16' });
    world.settings.aspect = '16:9';
    world.reset();
    expect(world.width).toBe(1920);
    expect(world.center.x).toBe(960);
  });

  it('stays playable and finite in every aspect', () => {
    for (const aspect of ['9:16', '1:1', '16:9'] as const) {
      const world = new World({ ...DEFAULT_SETTINGS, aspect });
      for (let i = 0; i < 600; i++) world.step();
      expect(Number.isFinite(world.ball.x)).toBe(true);
      expect(Number.isFinite(world.ball.y)).toBe(true);
    }
  });
});

describe('reset', () => {
  it('restores identical initial state', () => {
    const world = new World(DEFAULT_SETTINGS);
    const initialBall = { ...world.ball };
    for (let i = 0; i < 300; i++) world.step();
    world.reset();
    expect(world.ball).toEqual(initialBall);
    expect(world.innermostIndex).toBe(0);
    expect(world.phase).toBe('playing');
    expect(world.elapsed).toBe(0);
  });
});
