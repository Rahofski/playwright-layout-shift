// ============================================================
// examples/fixture-usage.spec.ts
// Пример использования через Playwright Test fixture
// ============================================================

import { test, expect } from '../src/fixture';

test('page is visually stable (fixture)', async ({ page, visualStability }) => {
  // measureAndAssert = measure + assert в одном вызове
  const result = await visualStability.measureAndAssert(page, async (p) => {
    await p.goto('https://example.com');
  }, {
    clsThreshold: 0.1,
    customScoreThreshold: 0.15,
  });

  console.log(`CLS: ${result.cls}, shifts: ${result.filteredShifts}`);
});

test('measure without assert (fixture)', async ({ page, visualStability }) => {
  const result = await visualStability.measure(page, async (p) => {
    await p.goto('https://example.com');
  });

  // Ручная проверка
  expect(result.cls).toBeLessThan(0.25);
});
