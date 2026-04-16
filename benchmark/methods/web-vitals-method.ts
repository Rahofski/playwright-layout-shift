// ============================================================
// benchmark/methods/web-vitals-method.ts — Метод: web-vitals подход
//
// Эмулирует подход Google web-vitals: session windowing с CLS.
// Инжектируется inline-реализация (аналог web-vitals onCLS).
// Без внешних зависимостей — self-contained скрипт.
// ============================================================

import type { Page } from 'playwright';
import type { MeasureMethod, ScenarioConfig } from '../types';

const SETTLE_TIMEOUT = 500;

/**
 * Инжект-скрипт, реализующий session windowing аналогично web-vitals.
 * https://github.com/GoogleChrome/web-vitals
 *
 * Записывает entries с sources (previousRect/currentRect),
 * но вычисляет CLS по session windows (gap ≤ 1s, max duration ≤ 5s).
 */
const INJECT_SCRIPT = `
(function() {
  if (window.__wv_state) return;
  window.__wv_state = {
    entries: [],
    sessionEntries: [],
    sessionValue: 0,
    maxSessionValue: 0,
    allSessions: []
  };

  try {
    var state = window.__wv_state;
    var observer = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.hadRecentInput) continue;

        // Сериализуем sources
        var sources = [];
        if (entry.sources) {
          for (var j = 0; j < entry.sources.length; j++) {
            var src = entry.sources[j];
            var prev = src.previousRect || { x:0, y:0, width:0, height:0 };
            var curr = src.currentRect || { x:0, y:0, width:0, height:0 };
            sources.push({
              previousRect: { x: prev.x, y: prev.y, width: prev.width, height: prev.height },
              currentRect: { x: curr.x, y: curr.y, width: curr.width, height: curr.height }
            });
          }
        }

        var serialized = {
          startTime: entry.startTime,
          value: entry.value,
          sources: sources
        };

        state.entries.push(serialized);

        // Session windowing (web-vitals algorithm)
        if (state.sessionEntries.length === 0) {
          state.sessionEntries = [serialized];
          state.sessionValue = serialized.value;
        } else {
          var lastEntry = state.sessionEntries[state.sessionEntries.length - 1];
          var gap = serialized.startTime - lastEntry.startTime;
          var sessionDuration = serialized.startTime - state.sessionEntries[0].startTime;

          if (gap < 1000 && sessionDuration < 5000) {
            state.sessionEntries.push(serialized);
            state.sessionValue += serialized.value;
          } else {
            // Закрыть текущую сессию, начать новую
            state.allSessions.push({
              score: state.sessionValue,
              count: state.sessionEntries.length
            });
            state.sessionEntries = [serialized];
            state.sessionValue = serialized.value;
          }
        }

        if (state.sessionValue > state.maxSessionValue) {
          state.maxSessionValue = state.sessionValue;
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
    window.__wv_observer = observer;
  } catch(e) {}
})();
`;

const COLLECT_SCRIPT = `
(function() {
  var state = window.__wv_state || { entries: [], maxSessionValue: 0 };
  return {
    entries: state.entries,
    cls: state.maxSessionValue,
    sessionsCount: (state.allSessions || []).length + (state.sessionEntries && state.sessionEntries.length > 0 ? 1 : 0)
  };
})();
`;

const CLEANUP_SCRIPT = `
(function() {
  if (window.__wv_observer) {
    window.__wv_observer.disconnect();
    delete window.__wv_observer;
  }
  delete window.__wv_state;
})();
`;

export const webVitalsMethod: MeasureMethod = {
  name: 'web-vitals-approach',

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
    const raw: {
      entries: Array<{ startTime: number; value: number; sources: any[] }>;
      cls: number;
      sessionsCount: number;
    } = await page.evaluate(COLLECT_SCRIPT);

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
      hasBreakdown: false,  // web-vitals не даёт per-element breakdown
      hasSources: true,     // sources есть, но без CSS-селекторов
    };
  },
};
