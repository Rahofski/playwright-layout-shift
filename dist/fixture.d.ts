import { type Page } from '@playwright/test';
import type { MeasureOptions, StabilityResult, CustomMetricOptions, AssertionOptions, ScenarioFn } from './types';
/**
 * Тип helper-а, доступного в тестах через fixture.
 */
export interface VisualStabilityHelper {
    /**
     * Измеряет визуальную стабильность в ходе сценария.
     */
    measure: (page: Page, scenarioFn: ScenarioFn, options?: MeasureOptions & CustomMetricOptions) => Promise<StabilityResult>;
    /**
     * Измеряет + сразу assert по порогам.
     * Возвращает результат (если проверка пройдена).
     */
    measureAndAssert: (page: Page, scenarioFn: ScenarioFn, options?: MeasureOptions & CustomMetricOptions & AssertionOptions) => Promise<StabilityResult>;
}
/**
 * Расширенный Playwright Test с fixture `visualStability`.
 */
export declare const test: import("@playwright/test").TestType<import("@playwright/test").PlaywrightTestArgs & import("@playwright/test").PlaywrightTestOptions & {
    visualStability: VisualStabilityHelper;
}, import("@playwright/test").PlaywrightWorkerArgs & import("@playwright/test").PlaywrightWorkerOptions>;
export { expect } from '@playwright/test';
//# sourceMappingURL=fixture.d.ts.map