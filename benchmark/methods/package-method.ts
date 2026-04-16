// ============================================================
// benchmark/methods/package-method.ts — Метод: playwright-layout-shift (пакет)
// ============================================================

import type { Page } from 'playwright';
import type { MeasureMethod, ScenarioConfig } from '../types';
import {
  measureVisualStability,
  buildElementBreakdown,
} from '../../src/index';

const SETTLE_TIMEOUT = 500;

export const packageMethod: MeasureMethod = {
  name: 'playwright-layout-shift',

  async run(page: Page, scenario: ScenarioConfig) {
    const memBefore = process.memoryUsage().heapUsed;
    const cpuBefore = process.cpuUsage();
    const start = performance.now();

    const result = await measureVisualStability(page, async (p) => {
      await p.goto(scenario.path);
      if (scenario.waitSelector) {
        await p.waitForSelector(scenario.waitSelector, { timeout: 5000 });
      }
      await p.waitForTimeout(scenario.waitFor);
    }, { settleTimeout: SETTLE_TIMEOUT, captureSources: true });

    // Дополнительно: breakdown (часть функциональности пакета)
    const breakdown = buildElementBreakdown(result.entries);

    const elapsed = performance.now() - start;
    const cpuAfter = process.cpuUsage(cpuBefore);
    const memAfter = process.memoryUsage().heapUsed;

    return {
      executionTime: elapsed,
      memoryDelta: memAfter - memBefore,
      memoryPeak: memAfter,
      cpuUser: cpuAfter.user,
      cpuSystem: cpuAfter.system,
      cls: result.cls,
      shiftsDetected: result.filteredShifts,
      hasBreakdown: breakdown.length > 0 || result.filteredShifts === 0,
      hasSources: result.entries.some(e => e.sources.length > 0),
    };
  },
};
