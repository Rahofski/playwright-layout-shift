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
 *
 * Порядок работы:
 *  1) Инжектим PerformanceObserver на страницу.
 *  2) Выполняем пользовательский сценарий (scenarioFn).
 *  3) Ждём settleTimeout для дозаписи отложенных shift-ов.
 *  4) Собираем entries, вычисляем метрики.
 *  5) Очищаем observer.
 *
 * ```
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

  // 3. Ожидание «успокоения» страницы
  const settleTimeout = options.settleTimeout ?? DEFAULT_SETTLE_TIMEOUT;
  if (settleTimeout > 0) {
    await page.waitForTimeout(settleTimeout);
  }

  // 4. Сбор данных
  const { entries, rawCount } = await collectEntries(page, options);

  // 5. Вычисление метрик
  const { cls, sessionWindows } = calculateCLS(entries);
  const customScore = calculateCustomMetric(entries, options);

  const duration = scenarioEndTime - startTime;

  // 6. Очистка
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
