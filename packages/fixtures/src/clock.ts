/** Deterministic test clock — replaces Date.now in tests. */
export class FakeClock {
  private nowMs: number;
  constructor(startIso = '2026-11-02T09:00:00Z') {
    this.nowMs = new Date(startIso).getTime();
  }
  now(): number {
    return this.nowMs;
  }
  advance(ms: number) {
    this.nowMs += ms;
  }
  toISO() {
    return new Date(this.nowMs).toISOString();
  }
}
