// ============================================================
// benchmark/stats.ts — Статистические функции
// ============================================================

import type { StatSummary } from './types';

/**
 * t-значения для двустороннего 95% CI (α=0.025 на хвост).
 * Для n=30 → df=29.
 */
function tValue(df: number): number {
  // Таблица t-распределения для α=0.025 (двусторонний 95% CI)
  const table: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
    16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
    21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
    26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
    40: 2.021, 60: 2.000, 120: 1.980,
  };
  if (table[df]) return table[df];
  // Для больших df → приблизительно 1.96
  if (df > 120) return 1.96;
  // Ближайшее снизу
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= df) return table[keys[i]];
  }
  return 1.96;
}

export function computeStats(values: number[]): StatSummary {
  const n = values.length;
  if (n === 0) {
    return { mean: 0, std: 0, ci95: [0, 0], min: 0, max: 0, median: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);

  const mean = values.reduce((a, b) => a + b, 0) / n;

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);

  const t = tValue(n - 1);
  const margin = t * (std / Math.sqrt(n));

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  return {
    mean,
    std,
    ci95: [mean - margin, mean + margin],
    min: sorted[0],
    max: sorted[n - 1],
    median,
  };
}
