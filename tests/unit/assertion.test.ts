// ============================================================
// tests/unit/assertion.test.ts — Unit-тесты assertion
// ============================================================

import { describe, it, expect } from 'vitest';
import { assertVisualStability } from '../../src/assertion';
import { VisualStabilityError } from '../../src/types';
import type { StabilityResult } from '../../src/types';

function makeResult(overrides: Partial<StabilityResult> = {}): StabilityResult {
  return {
    entries: [],
    cls: 0,
    customScore: 0,
    sessionWindows: [],
    totalRawShifts: 0,
    filteredShifts: 0,
    scenarioDuration: 1000,
    ...overrides,
  };
}

describe('assertVisualStability', () => {
  it('does not throw when CLS is below threshold', () => {
    const result = makeResult({ cls: 0.05 });
    expect(() => assertVisualStability(result, { clsThreshold: 0.1 })).not.toThrow();
  });

  it('throws VisualStabilityError when CLS exceeds threshold', () => {
    const result = makeResult({ cls: 0.15 });
    expect(() => assertVisualStability(result, { clsThreshold: 0.1 }))
      .toThrowError(VisualStabilityError);
  });

  it('includes CLS info in error message', () => {
    const result = makeResult({ cls: 0.25 });
    try {
      assertVisualStability(result, { clsThreshold: 0.1 });
    } catch (e) {
      expect(e).toBeInstanceOf(VisualStabilityError);
      const err = e as VisualStabilityError;
      expect(err.message).toContain('0.2500');
      expect(err.message).toContain('0.1');
      expect(err.result).toBe(result);
    }
  });

  it('does not throw for customScore when threshold is not set', () => {
    const result = makeResult({ customScore: 999 });
    expect(() => assertVisualStability(result)).not.toThrow();
  });

  it('throws when customScore exceeds threshold', () => {
    const result = makeResult({ customScore: 0.3 });
    expect(() =>
      assertVisualStability(result, { customScoreThreshold: 0.2 })
    ).toThrowError(VisualStabilityError);
  });

  it('throws with both violations', () => {
    const result = makeResult({ cls: 0.2, customScore: 0.5 });
    try {
      assertVisualStability(result, {
        clsThreshold: 0.1,
        customScoreThreshold: 0.3,
      });
    } catch (e) {
      const err = e as VisualStabilityError;
      expect(err.message).toContain('CLS');
      expect(err.message).toContain('Custom score');
    }
  });

  it('uses default CLS threshold 0.1', () => {
    const result = makeResult({ cls: 0.11 });
    expect(() => assertVisualStability(result)).toThrowError(VisualStabilityError);
  });

  it('passes at exactly threshold boundary', () => {
    // CLS = threshold → NOT exceeding (> not >=)
    const result = makeResult({ cls: 0.1 });
    expect(() => assertVisualStability(result, { clsThreshold: 0.1 })).not.toThrow();
  });
});
