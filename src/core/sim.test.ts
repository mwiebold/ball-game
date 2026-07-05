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
