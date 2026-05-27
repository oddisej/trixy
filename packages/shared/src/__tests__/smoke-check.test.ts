import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('fast-check smoke check', () => {
  it('should verify fast-check is configured with numRuns: 100', () => {
    let runCount = 0;

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (n) => {
        runCount++;
        return n >= 1 && n <= 100;
      })
    );

    // With numRuns: 100 configured globally, we expect exactly 100 runs
    expect(runCount).toBe(100);
  });

  it('should verify basic property: addition is commutative', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      })
    );
  });

  it('should verify basic property: string concatenation length', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        return (a + b).length === a.length + b.length;
      })
    );
  });
});
