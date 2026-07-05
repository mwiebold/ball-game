import { describe, it, expect } from 'vitest';
import { ParticleSystem, MAX_PARTICLES } from './particles';

describe('ParticleSystem', () => {
  it('never exceeds the particle budget (N-2 degradation)', () => {
    const ps = new ParticleSystem();
    // Far more bursts than the cap allows.
    for (let i = 0; i < 200; i++) ps.spawnBurst(0, 0, 200, 1);
    expect(ps.count).toBeLessThanOrEqual(MAX_PARTICLES);
  });

  it('spawns a minimum handful even at zero intensity', () => {
    const ps = new ParticleSystem();
    ps.spawnBurst(0, 0, 100, 0);
    expect(ps.count).toBeGreaterThan(0);
  });

  it('spawns more at higher intensity', () => {
    const low = new ParticleSystem();
    low.spawnBurst(0, 0, 100, 0.1);
    const high = new ParticleSystem();
    high.spawnBurst(0, 0, 100, 1);
    expect(high.count).toBeGreaterThan(low.count);
  });

  it('removes particles as they expire', () => {
    const ps = new ParticleSystem();
    ps.spawnBurst(0, 0, 100, 1);
    expect(ps.count).toBeGreaterThan(0);
    // Advance well past the max lifetime.
    for (let i = 0; i < 30; i++) ps.update(0.1);
    expect(ps.count).toBe(0);
  });

  it('clear empties the pool', () => {
    const ps = new ParticleSystem();
    ps.spawnBurst(0, 0, 100, 1);
    ps.clear();
    expect(ps.count).toBe(0);
  });
});
