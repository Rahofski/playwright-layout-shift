// ============================================================
// tests/unit/breakdown.test.ts — Unit-тесты per-element breakdown
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildElementBreakdown } from '../../src/breakdown';
import type { LayoutShiftEntry, ShiftRect } from '../../src/types';

function makeRect(x: number, y: number, w: number, h: number): ShiftRect {
  return { x, y, width: w, height: h };
}

function makeEntry(
  startTime: number,
  value: number,
  sources: LayoutShiftEntry['sources'] = [],
): LayoutShiftEntry {
  return { startTime, value, hadRecentInput: false, sources };
}

describe('buildElementBreakdown', () => {
  it('returns empty array for no entries', () => {
    expect(buildElementBreakdown([])).toEqual([]);
  });

  it('returns empty array when entries have no sources', () => {
    const entries = [makeEntry(100, 0.05)];
    expect(buildElementBreakdown(entries)).toEqual([]);
  });

  it('aggregates single entry with one source', () => {
    const entries = [
      makeEntry(100, 0.1, [
        {
          selector: '#header',
          previousRect: makeRect(0, 0, 800, 60),
          currentRect: makeRect(0, 100, 800, 60),
        },
      ]),
    ];

    const result = buildElementBreakdown(entries);
    expect(result).toHaveLength(1);
    expect(result[0].selector).toBe('#header');
    expect(result[0].shiftCount).toBe(1);
    expect(result[0].totalValue).toBeCloseTo(0.1, 5);
  });

  it('splits value evenly among multiple sources', () => {
    const entries = [
      makeEntry(100, 0.12, [
        {
          selector: '#a',
          previousRect: makeRect(0, 0, 100, 50),
          currentRect: makeRect(0, 50, 100, 50),
        },
        {
          selector: '#b',
          previousRect: makeRect(200, 0, 100, 50),
          currentRect: makeRect(200, 50, 100, 50),
        },
      ]),
    ];

    const result = buildElementBreakdown(entries);
    expect(result).toHaveLength(2);
    expect(result[0].totalValue).toBeCloseTo(0.06, 5);
    expect(result[1].totalValue).toBeCloseTo(0.06, 5);
  });

  it('groups multiple entries by selector', () => {
    const entries = [
      makeEntry(100, 0.1, [
        {
          selector: '#header',
          previousRect: makeRect(0, 0, 800, 60),
          currentRect: makeRect(0, 50, 800, 60),
        },
      ]),
      makeEntry(500, 0.2, [
        {
          selector: '#header',
          previousRect: makeRect(0, 50, 800, 60),
          currentRect: makeRect(0, 100, 800, 60),
        },
      ]),
    ];

    const result = buildElementBreakdown(entries);
    expect(result).toHaveLength(1);
    expect(result[0].selector).toBe('#header');
    expect(result[0].shiftCount).toBe(2);
    expect(result[0].totalValue).toBeCloseTo(0.3, 5);
    expect(result[0].rects).toHaveLength(2);
  });

  it('sorts by totalValue descending', () => {
    const entries = [
      makeEntry(100, 0.02, [
        {
          selector: '#small',
          previousRect: makeRect(0, 0, 100, 50),
          currentRect: makeRect(0, 10, 100, 50),
        },
      ]),
      makeEntry(200, 0.5, [
        {
          selector: '#big',
          previousRect: makeRect(0, 0, 800, 400),
          currentRect: makeRect(0, 200, 800, 400),
        },
      ]),
    ];

    const result = buildElementBreakdown(entries);
    expect(result[0].selector).toBe('#big');
    expect(result[1].selector).toBe('#small');
  });

  it('uses (unknown) for empty selectors', () => {
    const entries = [
      makeEntry(100, 0.05, [
        {
          selector: '',
          previousRect: makeRect(0, 0, 100, 50),
          currentRect: makeRect(0, 50, 100, 50),
        },
      ]),
    ];
    const result = buildElementBreakdown(entries);
    expect(result[0].selector).toBe('(unknown)');
  });

  it('calculates amplitude correctly', () => {
    const entries = [
      makeEntry(100, 0.1, [
        {
          selector: '#box',
          previousRect: makeRect(0, 0, 100, 100),
          currentRect: makeRect(0, 200, 100, 100), // moved 200px down
        },
      ]),
    ];

    const result = buildElementBreakdown(entries);
    expect(result[0].meanAmplitude).toBeGreaterThan(0);
    expect(result[0].maxAmplitude).toBe(result[0].meanAmplitude);
  });
});
