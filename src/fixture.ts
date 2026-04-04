// ============================================================
// fixture.ts — Playwright Test fixture для визуальной стабильности
// ============================================================
import { test as base, type Page } from '@playwright/test';
import type {
  MeasureOptions,
  StabilityResult,
  CustomMetricOptions,
  AssertionOptions,
  ScenarioFn,
} from './types';
import { measureVisualStability } from './measure';
import { assertVisualStability } from './assertion';

/**
 * Тип helper-а, доступного в тестах через fixture.
 */
export interface VisualStabilityHelper {
  /**
   * Измеряет визуальную стабильность в ходе сценария.
   */
  measure: (
    page: Page,
    scenarioFn: ScenarioFn,
    options?: MeasureOptions & CustomMetricOptions,
  ) => Promise<StabilityResult>;

  /**
   * Измеряет + сразу assert по порогам.
   * Возвращает результат (если проверка пройдена).
   */
  measureAndAssert: (
    page: Page,
    scenarioFn: ScenarioFn,
    options?: MeasureOptions & CustomMetricOptions & AssertionOptions,
  ) => Promise<StabilityResult>;
}

/**
 * Расширенный Playwright Test с fixture `visualStability`.
 */
export const test = base.extend<{ visualStability: VisualStabilityHelper }>({
  visualStability: async ({}, use) => {
    const helper: VisualStabilityHelper = {
      measure: async (page, scenarioFn, options = {}) => {
        return measureVisualStability(page, scenarioFn, options);
      },

      measureAndAssert: async (page, scenarioFn, options = {}) => {
        const result = await measureVisualStability(page, scenarioFn, options);
        assertVisualStability(result, options);
        return result;
      },
    };

    await use(helper);
  },
});

export { expect } from '@playwright/test';
