import type { Page } from 'playwright';
import type { MeasureOptions, StabilityResult, ScenarioFn, CustomMetricOptions } from './types';
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
export declare function measureVisualStability(page: Page, scenarioFn: ScenarioFn, options?: MeasureOptions & CustomMetricOptions): Promise<StabilityResult>;
//# sourceMappingURL=measure.d.ts.map