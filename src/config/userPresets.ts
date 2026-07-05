import type { Settings } from '../core/types';
import { sanitizeSettings } from './share';

/**
 * User-saved presets persisted in localStorage (REQUIREMENTS S-39).
 *
 * Reads always run through `sanitizeSettings`, so a corrupted or tampered
 * localStorage entry can never feed the simulation a bad value. All storage
 * access is guarded — a disabled/full/absent store degrades to "no user
 * presets" instead of throwing.
 */

const STORAGE_KEY = 'ballEscape.userPresets.v1';

/** Minimal subset of the Web Storage API, so the store is easy to unit-test. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface UserPreset {
  name: string;
  settings: Settings;
}

export class UserPresetStore {
  constructor(private readonly storage: StorageLike | null) {}

  /** All saved presets, sanitized, sorted by name. */
  list(): UserPreset[] {
    const map = this.read();
    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, settings: sanitizeSettings(map[name]) }));
  }

  /** Save (or overwrite) a preset. Returns false for an empty name. */
  save(name: string, settings: Settings): boolean {
    const clean = name.trim();
    if (!clean) return false;
    const map = this.read();
    map[clean] = settings;
    this.write(map);
    return true;
  }

  /** Delete a preset by name. */
  remove(name: string): void {
    const map = this.read();
    delete map[name];
    this.write(map);
  }

  private read(): Record<string, unknown> {
    try {
      if (!this.storage) return {};
      const text = this.storage.getItem(STORAGE_KEY);
      if (!text) return {};
      const parsed: unknown = JSON.parse(text);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private write(map: Record<string, unknown>): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Storage full or unavailable — silently skip persistence.
    }
  }
}

export { STORAGE_KEY };
