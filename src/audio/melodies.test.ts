import { describe, it, expect } from 'vitest';
import { MELODIES, melodyByName } from './melodies';
import { SCHEMA } from '../config/schema';

describe('melodies', () => {
  it('every melody has a non-empty note sequence', () => {
    for (const m of MELODIES) {
      expect(m.notes.length).toBeGreaterThan(0);
      expect(m.notes.every((n) => Number.isFinite(n))).toBe(true);
    }
  });

  it('melodyByName resolves each name and falls back for unknowns', () => {
    for (const m of MELODIES) {
      expect(melodyByName(m.name).name).toBe(m.name);
    }
    // Unknown name falls back to the first melody (never undefined).
    // @ts-expect-error deliberately passing an invalid name
    expect(melodyByName('nope')).toBe(MELODIES[0]);
  });

  it('the melody select options match the bundled melodies', () => {
    const control = SCHEMA.find((c) => c.key === 'melody');
    expect(control?.kind).toBe('select');
    if (control?.kind === 'select') {
      const optionValues = control.options.map((o) => o.value).sort();
      const melodyNames = MELODIES.map((m) => m.name).sort();
      expect(optionValues).toEqual(melodyNames);
    }
  });
});
