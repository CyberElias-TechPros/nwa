import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../scenarios.js';

describe('conformance scenarios', () => {
  it('has 20 stable scenario IDs', () => {
    expect(SCENARIOS).toHaveLength(20);
    for (const s of SCENARIOS) expect(typeof s).toBe('string');
  });
});
