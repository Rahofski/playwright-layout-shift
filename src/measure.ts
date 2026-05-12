// ============================================================
// measure.ts — Главный API: measureVisualStability
// ============================================================

import type { Page } from 'playwright';
import type {
  MeasureOptions,
  StabilityResult,
  ScenarioFn,
  CustomMetricOptions,
} from './types';
import { injectObserver, collectEntries, cleanupObserver } from './collector';
import { calculateCLS, calculateCustomMetric } from './metrics';

const DEFAULT_SETTLE_TIMEOUT = 1000;

/**
 * Измеряет визуальную стабильность страницы в ходе выполнения пользовательского
 * сценария.
 */
export async function measureVisualStability(
  page: Page,
  scenarioFn: ScenarioFn,
  options: MeasureOptions & CustomMetricOptions = {},
): Promise<StabilityResult> {
  // 1. Инжект
  await injectObserver(page, options);

  // 2. Сценарий
  const startTime = Date.now();
  await scenarioFn(page);
  const scenarioEndTime = Date.now();

  const settleTimeout = options.settleTimeout ?? DEFAULT_SETTLE_TIMEOUT;
  if (settleTimeout > 0) {
    await page.waitForTimeout(settleTimeout);
  }
  const { entries, rawCount } = await collectEntries(page, options);

  const { cls, sessionWindows } = calculateCLS(entries);
  const customScore = calculateCustomMetric(entries, options);

  const duration = scenarioEndTime - startTime;

  await cleanupObserver(page);

  return {
    entries,
    cls,
    customScore,
    sessionWindows,
    totalRawShifts: rawCount,
    filteredShifts: entries.length,
    scenarioDuration: duration,
  };
}
