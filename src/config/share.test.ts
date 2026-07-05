import { describe, it, expect } from 'vitest';
import {
  encodeSettings,
  decodeSettings,
  sanitizeSettings,
  buildShareUrl,
  settingsFromHash,
} from './share';
import { DEFAULT_SETTINGS } from '../core/settings';
import { PRESETS } from './presets';

describe('encode / decode round-trip', () => {
  it('preserves default settings', () => {
    const encoded = encodeSettings(DEFAULT_SETTINGS);
    expect(decodeSettings(encoded)).toEqual(DEFAULT_SETTINGS);
  });

  it('preserves every bundled preset', () => {
    for (const preset of PRESETS) {
      const encoded = encodeSettings(preset.settings);
      expect(decodeSettings(encoded)).toEqual(preset.settings);
    }
  });

  it('returns null for garbage input', () => {
    expect(decodeSettings('not-valid-base64!!')).toBeNull();
    expect(decodeSettings('')).toBeNull();
  });
});

describe('sanitizeSettings (untrusted input hardening)', () => {
  it('fills a fully-populated Settings from defaults', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });

  it('clamps out-of-range numbers to the schema bounds', () => {
    const s = sanitizeSettings({ ringCount: 9999, gravity: -50 });
    expect(s.ringCount).toBe(40); // max
    expect(s.gravity).toBe(0); // min
  });

  it('rounds integer controls', () => {
    expect(sanitizeSettings({ ringCount: 12.7 }).ringCount).toBe(13);
  });

  it('rejects invalid select values, keeping the default', () => {
    const s = sanitizeSettings({ rotationPattern: 'sideways' });
    expect(s.rotationPattern).toBe(DEFAULT_SETTINGS.rotationPattern);
  });

  it('accepts valid select values', () => {
    expect(sanitizeSettings({ gapAlignment: 'spiral' }).gapAlignment).toBe('spiral');
  });

  it('truncates over-long caption text', () => {
    const long = 'x'.repeat(500);
    expect(sanitizeSettings({ caption: long }).caption.length).toBe(120);
  });

  it('ignores unknown keys and non-number numerics', () => {
    const s = sanitizeSettings({ bogus: 5, gravity: 'fast' });
    expect(s.gravity).toBe(DEFAULT_SETTINGS.gravity);
    expect('bogus' in s).toBe(false);
  });
});

describe('URL helpers', () => {
  it('builds a shareable URL and reads it back', () => {
    const custom = { ...DEFAULT_SETTINGS, seed: 424242, ringCount: 9 };
    const url = buildShareUrl(custom, 'https://example.com/app/');
    expect(url).toContain('#c=');
    const hash = new URL(url).hash;
    expect(settingsFromHash(hash)).toEqual(custom);
  });

  it('returns null when the hash has no config', () => {
    expect(settingsFromHash('')).toBeNull();
    expect(settingsFromHash('#other=1')).toBeNull();
  });
});
