import { describe, expect, it } from 'vitest';
import { FakeClock } from '../clock.js';

describe('FakeClock', () => {
  it('advances deterministically', () => {
    const c = new FakeClock('2026-10-21T00:00:00Z');
    expect(c.now()).toBe(new Date('2026-10-21T00:00:00Z').getTime());
    c.advance(5_000);
    expect(c.now()).toBe(new Date('2026-10-21T00:00:05Z').getTime());
  });
});
