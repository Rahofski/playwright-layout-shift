// ============================================================
// tests/integration/visual-stability.spec.ts
// Интеграционный тест: реальный Chromium + layout-shift
// ============================================================

import { test, expect } from '@playwright/test';
import { measureVisualStability } from '../../src/measure';
import { assertVisualStability } from '../../src/assertion';
import { calculateCLS, calculateCustomMetric } from '../../src/metrics';
import { buildReport } from '../../src/reporter';

/**
 * Тестовая HTML-страница с искусственным layout shift.
 * Через 200ms после загрузки добавляется блок сверху,
 * сдвигая контент вниз.
 */
const SHIFTING_PAGE = `data:text/html,
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Layout Shift Test</title></head>
<body>
  <div id="content" style="margin-top:0;padding:20px;">
    <p>Hello, World!</p>
    <p>This content will be shifted down.</p>
  </div>
  <script>
    setTimeout(function() {
      var banner = document.createElement('div');
      banner.id = 'banner';
      banner.style.cssText = 'height:200px;background:red;width:100%;';
      banner.textContent = 'Late banner';
      document.body.insertBefore(banner, document.getElementById('content'));
    }, 200);
  </script>
</body>
</html>`;

const STABLE_PAGE = `data:text/html,
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Stable Page</title></head>
<body>
  <div style="padding:20px">
    <p>This page has no layout shifts.</p>
  </div>
</body>
</html>`;

test.describe('measureVisualStability — integration', () => {
  test('detects layout shifts on shifting page', async ({ page }) => {
    const result = await measureVisualStability(page, async (p) => {
      await p.goto(SHIFTING_PAGE);
      // Ждём, чтобы shift произошёл
      await p.waitForSelector('#banner');
    }, {
      settleTimeout: 1500,
    });

    // Должен быть хоть один shift
    expect(result.filteredShifts).toBeGreaterThan(0);
    expect(result.cls).toBeGreaterThan(0);
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.scenarioDuration).toBeGreaterThan(0);

    // CLS и customScore должны быть числами
    expect(typeof result.cls).toBe('number');
    expect(typeof result.customScore).toBe('number');

    console.log('Shifting page CLS:', result.cls.toFixed(4));
    console.log('Custom score:', result.customScore.toFixed(4));
    console.log('Entries:', result.filteredShifts);
  });

  test('stable page has zero or near-zero CLS', async ({ page }) => {
    const result = await measureVisualStability(page, async (p) => {
      await p.goto(STABLE_PAGE);
    }, {
      settleTimeout: 500,
    });

    expect(result.cls).toBeLessThan(0.01);
    expect(result.filteredShifts).toBe(0);
  });

  test('assertVisualStability throws on high CLS', async ({ page }) => {
    const result = await measureVisualStability(page, async (p) => {
      await p.goto(SHIFTING_PAGE);
      await p.waitForSelector('#banner');
    }, {
      settleTimeout: 1500,
    });

    // Порог очень низкий — assert должен падать
    expect(() => assertVisualStability(result, { clsThreshold: 0.001 })).toThrow(
      /Visual stability check failed/
    );
  });

  test('assertVisualStability passes on stable page', async ({ page }) => {
    const result = await measureVisualStability(page, async (p) => {
      await p.goto(STABLE_PAGE);
    });

    // Не должно бросать
    assertVisualStability(result, { clsThreshold: 0.1 });
  });

  test('entries have sources with rects on shifting page', async ({ page }) => {
    const result = await measureVisualStability(page, async (p) => {
      await p.goto(SHIFTING_PAGE);
      await p.waitForSelector('#banner');
    }, {
      settleTimeout: 1500,
      captureSources: true,
    });

    // Хоть один entry должен иметь sources
    const withSources = result.entries.filter((e) => e.sources.length > 0);
    expect(withSources.length).toBeGreaterThan(0);

    // Проверяем структуру source
    const firstSource = withSources[0].sources[0];
    expect(firstSource).toHaveProperty('selector');
    expect(firstSource).toHaveProperty('previousRect');
    expect(firstSource).toHaveProperty('currentRect');
    expect(typeof firstSource.previousRect.x).toBe('number');
  });

  test('calculateCLS and calculateCustomMetric work on collected entries', async ({ page }) => {
    const result = await measureVisualStability(page, async (p) => {
      await p.goto(SHIFTING_PAGE);
      await p.waitForSelector('#banner');
    }, {
      settleTimeout: 1500,
    });

    // Можно вызвать функции отдельно
    const { cls, sessionWindows } = calculateCLS(result.entries);
    expect(cls).toBe(result.cls);
    expect(sessionWindows.length).toBe(result.sessionWindows.length);

    const custom = calculateCustomMetric(result.entries, { amplitudeWeight: 0.5 });
    expect(custom).toBe(result.customScore);
  });

  test('buildReport generates valid report object', async ({ page }) => {
    const result = await measureVisualStability(page, async (p) => {
      await p.goto(SHIFTING_PAGE);
      await p.waitForSelector('#banner');
    }, {
      settleTimeout: 1500,
    });

    const report = buildReport(result, SHIFTING_PAGE);
    expect(report.timestamp).toBeTruthy();
    expect(report.cls).toBe(result.cls);
    expect(report.customScore).toBe(result.customScore);
    expect(report.entries).toBe(result.entries);
  });
});
