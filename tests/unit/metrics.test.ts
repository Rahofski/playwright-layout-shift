// ============================================================
// tests/unit/metrics.test.ts — Unit-тесты вычисления метрик
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  buildSessionWindows,
  calculateCLS,
  calculateCustomMetric,
  computeAmplitude,
  entryAmplitude,
} from '../../src/metrics';
import type { LayoutShiftEntry, ShiftRect } from '../../src/types';

// ————————— Helpers —————————

function makeEntry(
  startTime: number,
  value: number,
  hadRecentInput: boolean = false,
  sources: LayoutShiftEntry['sources'] = [],
): LayoutShiftEntry {
  return { startTime, value, hadRecentInput, sources };
}

function makeRect(x: number, y: number, w: number, h: number): ShiftRect {
  return { x, y, width: w, height: h };
}

// ————————— buildSessionWindows —————————

describe('buildSessionWindows', () => {
  it('returns empty array for no entries', () => {
    expect(buildSessionWindows([])).toEqual([]);
  });

  it('groups entries within gap into one window', () => {
    const entries = [
      makeEntry(100, 0.05),
      makeEntry(200, 0.03),
      makeEntry(800, 0.02),
    ];
    const windows = buildSessionWindows(entries, 1000, 5000);
    expect(windows).toHaveLength(1);
    expect(windows[0].cumulativeScore).toBeCloseTo(0.1, 5);
  });

  it('splits into two windows when gap exceeds sessionGap', () => {
    const entries = [
      makeEntry(100, 0.05),
      makeEntry(200, 0.03),
      makeEntry(2000, 0.02), // gap = 1800 > 1000
    ];
    const windows = buildSessionWindows(entries, 1000, 5000);
    expect(windows).toHaveLength(2);
    expect(windows[0].cumulativeScore).toBeCloseTo(0.08, 5);
    expect(windows[1].cumulativeScore).toBeCloseTo(0.02, 5);
  });

  it('splits when window duration exceeds sessionMaxDuration', () => {
    const entries = [
      makeEntry(0, 0.01),
      makeEntry(500, 0.01),
      makeEntry(4500, 0.01),
      makeEntry(5500, 0.01), // duration from 0 = 5500 > 5000
    ];
    const windows = buildSessionWindows(entries, 1000, 5000);
    expect(windows).toHaveLength(2);
  });

  it('handles single entry', () => {
    const windows = buildSessionWindows([makeEntry(100, 0.05)]);
    expect(windows).toHaveLength(1);
    expect(windows[0].entries).toHaveLength(1);
    expect(windows[0].cumulativeScore).toBeCloseTo(0.05, 5);
  });

  it('sorts entries by startTime', () => {
    const entries = [
      makeEntry(500, 0.02),
      makeEntry(100, 0.05),
      makeEntry(300, 0.03),
    ];
    const windows = buildSessionWindows(entries, 1000, 5000);
    expect(windows).toHaveLength(1);
    expect(windows[0].entries[0].startTime).toBe(100);
    expect(windows[0].entries[2].startTime).toBe(500);
  });
});

// ————————— calculateCLS —————————

describe('calculateCLS', () => {
  it('returns 0 for no entries', () => {
    const { cls, sessionWindows } = calculateCLS([]);
    expect(cls).toBe(0);
    expect(sessionWindows).toEqual([]);
  });

  it('returns max session window score as CLS', () => {
    const entries = [
      makeEntry(100, 0.01),
      makeEntry(200, 0.02),
      // gap
      makeEntry(5000, 0.1),
      makeEntry(5500, 0.15),
    ];
    const { cls } = calculateCLS(entries, 1000, 5000);
    // Window 1: 0.03, Window 2: 0.25 → CLS = 0.25
    expect(cls).toBeCloseTo(0.25, 5);
  });

  it('calculates correctly for real-world-like scenario', () => {
    // Имитация: страница загружается с небольшими shift-ами,
    // затем при клике — крупный shift
    const entries = [
      makeEntry(200, 0.005),
      makeEntry(300, 0.003),
      makeEntry(500, 0.002),
      // пауза > 1s
      makeEntry(3000, 0.15),
    ];
    const { cls, sessionWindows } = calculateCLS(entries);
    expect(sessionWindows).toHaveLength(2);
    expect(cls).toBeCloseTo(0.15, 5);
  });
});

// ————————— computeAmplitude —————————

describe('computeAmplitude', () => {
  it('returns 0 for zero rects', () => {
    const zero = makeRect(0, 0, 0, 0);
    expect(computeAmplitude(zero, zero)).toBe(0);
  });

  it('computes nonzero amplitude for displaced rects', () => {
    const prev = makeRect(100, 100, 200, 50);
    const curr = makeRect(100, 200, 200, 50);
    // Center moves from (200, 125) to (200, 225) → dy=100
    // Diagonal(1920,1080) ≈ 2202.9
    const amp = computeAmplitude(prev, curr, 1920, 1080);
    expect(amp).toBeGreaterThan(0);
    expect(amp).toBeCloseTo(100 / Math.sqrt(1920 ** 2 + 1080 ** 2), 4);
  });

  it('uses custom viewport dimensions', () => {
    const prev = makeRect(0, 0, 100, 100);
    const curr = makeRect(100, 0, 100, 100);
    // Center: (50,50) → (150,50), dx=100
    const amp = computeAmplitude(prev, curr, 1000, 1000);
    const diag = Math.sqrt(1000 ** 2 + 1000 ** 2);
    expect(amp).toBeCloseTo(100 / diag, 5);
  });
});

// ————————— entryAmplitude —————————

describe('entryAmplitude', () => {
  it('returns 0 for entry without sources', () => {
    expect(entryAmplitude(makeEntry(0, 0.1))).toBe(0);
  });

  it('averages amplitudes across sources', () => {
    const entry = makeEntry(0, 0.1, false, [
      {
        selector: 'div',
        previousRect: makeRect(0, 0, 100, 100),
        currentRect: makeRect(0, 100, 100, 100), // dy=100
      },
      {
        selector: 'span',
        previousRect: makeRect(0, 0, 100, 100),
        currentRect: makeRect(0, 0, 100, 100), // no move
      },
    ]);
    const amp = entryAmplitude(entry);
    expect(amp).toBeGreaterThan(0);
  });
});

// ————————— calculateCustomMetric —————————

describe('calculateCustomMetric', () => {
  it('returns 0 for no entries', () => {
    expect(calculateCustomMetric([])).toBe(0);
  });

  it('without sources, equals CLS (amplitudeWeight has no effect)', () => {
    const entries = [makeEntry(100, 0.1), makeEntry(200, 0.05)];
    const customScore = calculateCustomMetric(entries);
    const { cls } = calculateCLS(entries);
    // Без sources amplitudes = 0, score = Σ(value * (1 + 0.5*0)) = Σ value
    expect(customScore).toBeCloseTo(cls, 5);
  });

  it('increases score when amplitude is present', () => {
    const entries = [
      makeEntry(100, 0.1, false, [
        {
          selector: 'div',
          previousRect: makeRect(0, 0, 200, 100),
          currentRect: makeRect(0, 200, 200, 100),
        },
      ]),
    ];
    const scoreWithAmp = calculateCustomMetric(entries, { amplitudeWeight: 1.0 });
    const scoreNoAmp = calculateCustomMetric(entries, { amplitudeWeight: 0.0 });
    expect(scoreWithAmp).toBeGreaterThan(scoreNoAmp);
  });

  it('amplitudeWeight=0 gives same result as CLS', () => {
    const entries = [
      makeEntry(100, 0.1, false, [
        {
          selector: 'div',
          previousRect: makeRect(0, 0, 200, 100),
          currentRect: makeRect(0, 200, 200, 100),
        },
      ]),
    ];
    const score = calculateCustomMetric(entries, { amplitudeWeight: 0 });
    const { cls } = calculateCLS(entries);
    expect(score).toBeCloseTo(cls, 5);
  });
});
