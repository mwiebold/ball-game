import { describe, it, expect } from 'vitest';
import { Synth } from './synth';
import { DEFAULT_SETTINGS } from '../core/settings';
import type { SimEvent } from '../core/events';

/**
 * In the node test env there is no AudioContext. These tests assert the audio
 * layer is inert and safe before `unlock()` — it must never throw into the game
 * loop when a device is unavailable (real playback is covered in the browser).
 */
describe('Synth (no-audio safety)', () => {
  it('constructs without touching window/AudioContext', () => {
    expect(() => new Synth()).not.toThrow();
  });

  it('handle() is a no-op before unlock and never throws', () => {
    const synth = new Synth();
    const bounce: SimEvent = { type: 'bounce', x: 0, y: 0, speed: 500, ringIndex: 2 };
    const ringBreak: SimEvent = { type: 'ringBreak', x: 0, y: 0, ringIndex: 2 };
    expect(() => synth.handle(bounce, DEFAULT_SETTINGS)).not.toThrow();
    expect(() => synth.handle(ringBreak, DEFAULT_SETTINGS)).not.toThrow();
  });
});
