import { DEFAULT_SETTINGS } from '../core/settings';
import type { Settings } from '../core/types';
import { SCHEMA } from './schema';

/**
 * Config <-> URL-hash serialization (REQUIREMENTS S-38) plus validation.
 *
 * A whole game is defined by its Settings (seed included), so a shareable link
 * only needs to carry the settings. We encode them as URL-safe base64 JSON in
 * the location hash. Decoding always runs through `sanitizeSettings`, which
 * rebuilds a valid Settings from DEFAULT_SETTINGS and only accepts fields that
 * pass the schema's type/range checks — so a stale or hand-tampered link can
 * never feed the simulation a bad value.
 */

const HASH_KEY = 'c';

/** Coerce arbitrary decoded input into a valid, fully-populated Settings. */
export function sanitizeSettings(input: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (typeof input !== 'object' || input === null) return out;
  const rec = input as Record<string, unknown>;

  for (const control of SCHEMA) {
    const raw = rec[control.key];
    if (raw === undefined || raw === null) continue;

    switch (control.kind) {
      case 'range':
      case 'int': {
        if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
        let v = Math.min(control.max, Math.max(control.min, raw));
        if (control.kind === 'int') v = Math.round(v);
        assignNumber(out, control.key, v);
        break;
      }
      case 'select': {
        if (typeof raw !== 'string') continue;
        if (control.options.some((o) => o.value === raw)) {
          assignString(out, control.key, raw);
        }
        break;
      }
      case 'text': {
        if (typeof raw !== 'string') continue;
        assignString(out, control.key, raw.slice(0, control.maxLength));
        break;
      }
      case 'toggle': {
        if (typeof raw !== 'boolean') continue;
        assignBoolean(out, control.key, raw);
        break;
      }
    }
  }
  return out;
}

/** Encode settings to a URL-safe base64 string. */
export function encodeSettings(settings: Settings): string {
  const json = JSON.stringify(settings);
  return toBase64Url(json);
}

/** Decode a URL-safe base64 string to sanitized settings, or null if invalid. */
export function decodeSettings(encoded: string): Settings | null {
  try {
    const json = fromBase64Url(encoded);
    const parsed: unknown = JSON.parse(json);
    return sanitizeSettings(parsed);
  } catch {
    return null;
  }
}

/** Build a full shareable URL for the given settings. */
export function buildShareUrl(settings: Settings, base: string): string {
  const url = new URL(base);
  url.hash = `${HASH_KEY}=${encodeSettings(settings)}`;
  return url.toString();
}

/** Read settings from a location hash string (e.g. "#c=..."), or null. */
export function settingsFromHash(hash: string): Settings | null {
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);
  const encoded = params.get(HASH_KEY);
  if (!encoded) return null;
  return decodeSettings(encoded);
}

/** Pretty-printed JSON for file export (REQUIREMENTS S-40). */
export function settingsToJson(settings: Settings): string {
  return JSON.stringify(settings, null, 2);
}

/** Parse and sanitize settings from imported JSON text, or null if invalid. */
export function settingsFromJson(text: string): Settings | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return sanitizeSettings(parsed);
  } catch {
    return null;
  }
}

// --- helpers ---

// Narrow assignment helpers keep the union-typed Settings sound without a broad
// `as any` cast: the schema guarantees each key's kind, so numbers only land on
// numeric keys and strings only on string keys.
function assignNumber(settings: Settings, key: keyof Settings, value: number): void {
  (settings as unknown as Record<string, unknown>)[key] = value;
}
function assignString(settings: Settings, key: keyof Settings, value: string): void {
  (settings as unknown as Record<string, unknown>)[key] = value;
}
function assignBoolean(settings: Settings, key: keyof Settings, value: boolean): void {
  (settings as unknown as Record<string, unknown>)[key] = value;
}

function toBase64Url(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}
