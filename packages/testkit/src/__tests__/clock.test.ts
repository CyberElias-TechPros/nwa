import { describe, expect, it } from 'vitest';
import { FakeClock } from '../clock.js';

describe('@nwa/testkit', () => {
  it('re-exports FakeClock from fixtures', () => {
    const c = new FakeClock('2026-10-21T00:00:00Z');
    c.advance(1_000);
    expect(c.toISO()).toBe('2026-10-21T00:00:01.000Z');
  });
});
