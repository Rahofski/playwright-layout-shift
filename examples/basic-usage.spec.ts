// ============================================================
// examples/basic-usage.spec.ts
// Пример базового использования без fixture
// ============================================================

import { test, expect } from '@playwright/test';
import {
  measureVisualStability,
  assertVisualStability,
  buildReport,
  saveReport,
} from '../src/index';

test('basic layout shift measurement', async ({ page }) => {
  // 1. Измеряем стабильность во время загрузки страницы
  const result = await measureVisualStability(page, async (p) => {
    await p.goto('https://example.com');
  });

  // 2. Проверяем результат вручную
  console.log(`CLS: ${result.cls}`);
  console.log(`Custom Score: ${result.customScore}`);
  console.log(`Layout shifts: ${result.filteredShifts}`);

  // 3. Assert по порогам
  assertVisualStability(result, {
    clsThreshold: 0.1,      // Google «good»
    customScoreThreshold: 0.15,
  });
});

test('save report to file', async ({ page }) => {
  const result = await measureVisualStability(page, async (p) => {
    await p.goto('https://example.com');
  });

  // Сохраняем отчёт
  const report = buildReport(result, 'https://example.com');
  saveReport(report, 'test-results/stability-report.json');
});

test('test that SHOULD fail on unstable page', async ({ page }) => {
  // Этот тест специально падает, демонстрируя работу assertion
  const shiftPage = `data:text/html,
    <body>
      <div id="c" style="margin-top:0"><p>Content</p></div>
      <script>
        setTimeout(function() {
          var d = document.createElement('div');
          d.style.cssText = 'height:300px;background:red;width:100%';
          document.body.insertBefore(d, document.getElementById('c'));
        }, 100);
      </script>
    </body>`;

  const result = await measureVisualStability(page, async (p) => {
    await p.goto(shiftPage);
    await p.waitForTimeout(500);
  }, {
    settleTimeout: 1000,
  });

  // Очень низкий порог → тест упадёт
  try {
    assertVisualStability(result, { clsThreshold: 0.001 });
  } catch (e) {
    console.log('Expected failure:', (e as Error).message);
    throw e; // re-throw чтобы Playwright пометил тест как failed
  }
});
