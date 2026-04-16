// ============================================================
// benchmark/methods/manual-method.ts — Метод: ручной Playwright-скрипт
//
// Baseline: разработчик сам пишет page.evaluate() с PerformanceObserver.
// Минимальный подход без пакета — типичный «Stack Overflow» сниппет.
// ============================================================

import type { Page } from 'playwright';
import type { MeasureMethod, ScenarioConfig } from '../types';

const SETTLE_TIMEOUT = 500;

/** Инжект-скрипт: голый PerformanceObserver без source capture */
const INJECT_SCRIPT = `
(function() {
  if (window.__bench_entries) return;
  window.__bench_entries = [];
  try {
    var observer = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (!e.hadRecentInput) {
          window.__bench_entries.push({
            startTime: e.startTime,
            value: e.value
          });
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
    window.__bench_observer = observer;
  } catch(e) {}
})();
`;

const COLLECT_SCRIPT = `
(function() {
  var entries = window.__bench_entries || [];
  // Простейший CLS: сумма всех value (без session windows)
  var cls = 0;
  for (var i = 0; i < entries.length; i++) cls += entries[i].value;
  return { entries: entries, cls: cls };
})();
`;

const CLEANUP_SCRIPT = `
(function() {
  if (window.__bench_observer) {
    window.__bench_observer.disconnect();
    delete window.__bench_observer;
  }
  delete window.__bench_entries;
})();
`;

export const manualMethod: MeasureMethod = {
  name: 'manual-playwright',

  async run(page: Page, scenario: ScenarioConfig) {
    const memBefore = process.memoryUsage().heapUsed;
    const cpuBefore = process.cpuUsage();
    const start = performance.now();

    // 1. Инжект
    await page.addInitScript(INJECT_SCRIPT);
    await page.evaluate(INJECT_SCRIPT);

    // 2. Сценарий
    await page.goto(scenario.path);
    if (scenario.waitSelector) {
      await page.waitForSelector(scenario.waitSelector, { timeout: 5000 });
    }
    await page.waitForTimeout(scenario.waitFor);

    // 3. Settle
    await page.waitForTimeout(SETTLE_TIMEOUT);

    // 4. Сбор
    const raw: { entries: Array<{ startTime: number; value: number }>; cls: number } =
      await page.evaluate(COLLECT_SCRIPT);

    // 5. Очистка
    await page.evaluate(CLEANUP_SCRIPT).catch(() => {});

    const elapsed = performance.now() - start;
    const cpuAfter = process.cpuUsage(cpuBefore);
    const memAfter = process.memoryUsage().heapUsed;

    return {
      executionTime: elapsed,
      memoryDelta: memAfter - memBefore,
      memoryPeak: memAfter,
      cpuUser: cpuAfter.user,
      cpuSystem: cpuAfter.system,
      cls: raw.cls,
      shiftsDetected: raw.entries.length,
      hasBreakdown: false,  // ручной метод не даёт breakdown
      hasSources: false,    // нет source rects
    };
  },
};
