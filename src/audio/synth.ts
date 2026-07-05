import type { SimEvent } from '../core/events';
import type { Settings } from '../core/types';
import { melodyByName } from './melodies';

/**
 * Web Audio synth for bounce tones and ring-break SFX (REQUIREMENTS S-30..S-32).
 *
 * All sound is synthesized (no assets). The AudioContext is created lazily on
 * the first user gesture to satisfy the browser autoplay policy (N-6) — before
 * `unlock()` runs, every play call is a no-op. Everything is wrapped so a
 * missing/blocked audio device never throws into the game loop.
 *
 * MVP scope is simple tones (a bounce plays a note; 'rising' raises the pitch as
 * more rings are cleared). Full melody mode is deferred to the P2 backlog.
 */

// Pentatonic offsets (semitones) over a base note keep random-ish bounces musical.
const SCALE = [0, 2, 4, 7, 9];
const BASE_FREQ = 220; // A3
const MELODY_BASE_FREQ = 261.63; // C4

function scaleFreq(step: number): number {
  const octave = Math.floor(step / SCALE.length);
  const semis = SCALE[((step % SCALE.length) + SCALE.length) % SCALE.length]! + octave * 12;
  return BASE_FREQ * Math.pow(2, semis / 12);
}

function semitoneFreq(base: number, semitones: number): number {
  return base * Math.pow(2, semitones / 12);
}

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private melodyIndex = 0;

  /** Restart the melody sequence (call when the run restarts). */
  resetMelody(): void {
    this.melodyIndex = 0;
  }

  /** Create/resume the AudioContext. Call from a user-gesture handler. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor: typeof AudioContext | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.noiseBuffer = this.makeNoiseBuffer(this.ctx);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      // Audio unavailable — stay silent.
    }
  }

  /** Route a sim event to a sound, respecting settings. */
  handle(event: SimEvent, settings: Settings): void {
    if (!this.ctx || !this.master || !settings.soundEnabled) return;
    if (event.type === 'bounce') this.bounce(event.speed, event.ringIndex, settings);
    else if (event.type === 'ringBreak' && settings.ringBreakSound) this.ringBreak(settings);
  }

  private bounce(speed: number, ringIndex: number, settings: Settings): void {
    if (settings.bounceSound === 'off' || !this.ctx || !this.master) return;

    let freq: number;
    if (settings.bounceSound === 'melody') {
      const melody = melodyByName(settings.melody);
      const note = melody.notes[this.melodyIndex % melody.notes.length] ?? 0;
      this.melodyIndex += 1;
      freq = semitoneFreq(MELODY_BASE_FREQ, note);
    } else {
      const step = settings.bounceSound === 'rising' ? ringIndex : 0;
      freq = scaleFreq(step);
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const loud = Math.min(1, Math.max(0.25, speed / 900));
    const peak = settings.volume * loud * 0.3;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private ringBreak(settings: Settings): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.25);

    const gain = this.ctx.createGain();
    const peak = settings.volume * 0.35;
    gain.gain.setValueAtTime(Math.max(0.0002, peak), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);

    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 0.32);
  }

  private makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
