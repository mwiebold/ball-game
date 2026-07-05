import { describe, it, expect } from 'vitest';
import { UserPresetStore, type StorageLike } from './userPresets';
import { DEFAULT_SETTINGS } from '../core/settings';

/** In-memory Storage stand-in. */
class MemStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

describe('UserPresetStore', () => {
  it('saves and lists a preset', () => {
    const store = new UserPresetStore(new MemStorage());
    store.save('My Preset', { ...DEFAULT_SETTINGS, seed: 999 });
    const list = store.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('My Preset');
    expect(list[0]!.settings.seed).toBe(999);
  });

  it('persists across store instances sharing storage', () => {
    const mem = new MemStorage();
    new UserPresetStore(mem).save('A', { ...DEFAULT_SETTINGS });
    expect(new UserPresetStore(mem).list().map((p) => p.name)).toEqual(['A']);
  });

  it('sorts presets by name', () => {
    const store = new UserPresetStore(new MemStorage());
    store.save('Zebra', DEFAULT_SETTINGS);
    store.save('Apple', DEFAULT_SETTINGS);
    expect(store.list().map((p) => p.name)).toEqual(['Apple', 'Zebra']);
  });

  it('trims names and rejects empty ones', () => {
    const store = new UserPresetStore(new MemStorage());
    expect(store.save('   ', DEFAULT_SETTINGS)).toBe(false);
    expect(store.save('  Trimmed  ', DEFAULT_SETTINGS)).toBe(true);
    expect(store.list()[0]!.name).toBe('Trimmed');
  });

  it('overwrites a preset of the same name', () => {
    const store = new UserPresetStore(new MemStorage());
    store.save('X', { ...DEFAULT_SETTINGS, seed: 1 });
    store.save('X', { ...DEFAULT_SETTINGS, seed: 2 });
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]!.settings.seed).toBe(2);
  });

  it('removes a preset', () => {
    const store = new UserPresetStore(new MemStorage());
    store.save('X', DEFAULT_SETTINGS);
    store.remove('X');
    expect(store.list()).toHaveLength(0);
  });

  it('sanitizes stored settings on read (tampered storage is safe)', () => {
    const mem = new MemStorage();
    mem.setItem(
      'ballEscape.userPresets.v1',
      JSON.stringify({ Bad: { ringCount: 9999, rotationPattern: 'sideways' } }),
    );
    const settings = new UserPresetStore(mem).list()[0]!.settings;
    expect(settings.ringCount).toBe(40); // clamped to schema max
    expect(settings.rotationPattern).toBe(DEFAULT_SETTINGS.rotationPattern); // invalid rejected
  });

  it('degrades gracefully with no storage', () => {
    const store = new UserPresetStore(null);
    expect(store.save('X', DEFAULT_SETTINGS)).toBe(true); // no throw
    expect(store.list()).toEqual([]);
  });

  it('survives corrupt JSON in storage', () => {
    const mem = new MemStorage();
    mem.setItem('ballEscape.userPresets.v1', '{not valid json');
    expect(new UserPresetStore(mem).list()).toEqual([]);
  });
});
