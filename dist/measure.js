"use strict";
// ============================================================
// measure.ts — Главный API: measureVisualStability
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureVisualStability = measureVisualStability;
const collector_1 = require("./collector");
const metrics_1 = require("./metrics");
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
 * @param page — Playwright Page (должна быть Chromium).
 * @param scenarioFn — async-функция с действиями на странице.
 * @param options — настройки измерения.
 * @returns StabilityResult с метриками.
 *
 * Пример:
 * ```ts
 * const result = await measureVisualStability(page, async (p) => {
 *   await p.goto('https://example.com');
 *   await p.click('#load-more');
 * });
 * ```
 */
async function measureVisualStability(page, scenarioFn, options = {}) {
    // 1. Инжект
    await (0, collector_1.injectObserver)(page, options);
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
    const { entries, rawCount } = await (0, collector_1.collectEntries)(page, options);
    // 5. Вычисление метрик
    const { cls, sessionWindows } = (0, metrics_1.calculateCLS)(entries);
    const customScore = (0, metrics_1.calculateCustomMetric)(entries, options);
    const duration = scenarioEndTime - startTime;
    // 6. Очистка
    await (0, collector_1.cleanupObserver)(page);
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
//# sourceMappingURL=measure.js.map