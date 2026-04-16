// ============================================================
// benchmark/run-benchmark.ts — Главный runner бенчмарка
//
// Запуск: npx tsx benchmark/run-benchmark.ts
// Требования: demo-app должен быть собран и доступен на localhost:3000
// ============================================================

import { chromium, type Page, type Browser, type BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import type { ScenarioConfig, Sample, AggregatedStats } from './types';
import { computeStats } from './stats';
import { packageMethod } from './methods/package-method';
import { manualMethod } from './methods/manual-method';
import { webVitalsMethod } from './methods/web-vitals-method';

// ————————————————————————————————————————————
// Конфигурация
// ————————————————————————————————————————————

const BASE_URL = 'http://localhost:3000';
const ITERATIONS = 30;

const SCENARIOS: ScenarioConfig[] = [
  // Simple (один паттерн, изолированный)
  {
    name: 'font-swap',
    type: 'simple',
    path: `${BASE_URL}/#/font-swap`,
    waitFor: 1200,
  },
  {
    name: 'stable-control',
    type: 'simple',
    path: `${BASE_URL}/#/stable`,
    waitFor: 1200,
  },
  // E2E (сложные, множественные shift-ы)
  {
    name: 'async-content',
    type: 'e2e',
    path: `${BASE_URL}/#/async-content`,
    waitFor: 1000,
    waitSelector: '.injected-banner',
  },
  {
    name: 'image-no-dimensions',
    type: 'e2e',
    path: `${BASE_URL}/#/image-no-dimensions`,
    waitFor: 1500,
  },
  {
    name: 'dynamic-ad',
    type: 'e2e',
    path: `${BASE_URL}/#/dynamic-ad`,
    waitFor: 1600,
  },
];

const METHODS = [packageMethod, manualMethod, webVitalsMethod];

// ————————————————————————————————————————————
// Runner
// ————————————————————————————————————————————

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_DIR = path.join(__dirname, 'results');

async function ensureResultsDir() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

async function runBenchmark() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Benchmark: playwright-layout-shift             ║');
  console.log('║   Iterations per scenario/method:', ITERATIONS, '            ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();

  await ensureResultsDir();

  const browser = await chromium.launch({ headless: true });
  const allSamples: Sample[] = [];

  for (const scenario of SCENARIOS) {
    for (const method of METHODS) {
      console.log(`▸ ${scenario.name} × ${method.name}`);
      process.stdout.write('  ');

      for (let i = 0; i < ITERATIONS; i++) {
        // Каждый прогон — чистый контекст (новые куки, кеш, etc.)
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });
        const page = await context.newPage();

        try {
          // Прогрев: первая навигация до базовой страницы
          await page.goto(BASE_URL, { waitUntil: 'load' });
          await page.waitForTimeout(200);

          const partial = await method.run(page, scenario);

          const sample: Sample = {
            method: method.name,
            scenario: scenario.name,
            scenarioType: scenario.type,
            iteration: i + 1,
            ...partial,
          };

          allSamples.push(sample);
          process.stdout.write('.');
        } catch (err) {
          console.error(`\n  ✗ Error at iteration ${i + 1}:`, (err as Error).message);
          process.stdout.write('✗');
        } finally {
          await page.close();
          await context.close();
        }
      }

      console.log(' done');
    }
  }

  await browser.close();

  // ————————————————————————————————————————————
  // Сохранение сырых данных
  // ————————————————————————————————————————————

  const rawPath = path.join(RESULTS_DIR, 'raw-samples.json');
  fs.writeFileSync(rawPath, JSON.stringify(allSamples, null, 2), 'utf-8');
  console.log(`\n✓ Raw samples saved: ${rawPath}`);

  // ————————————————————————————————————————————
  // Агрегация
  // ————————————————————————————————————————————

  const aggregated = aggregate(allSamples);
  const aggPath = path.join(RESULTS_DIR, 'aggregated.json');
  fs.writeFileSync(aggPath, JSON.stringify(aggregated, null, 2), 'utf-8');
  console.log(`✓ Aggregated stats saved: ${aggPath}`);

  // ————————————————————————————————————————————
  // Markdown-таблицы для отчёта
  // ————————————————————————————————————————————

  const markdown = generateMarkdown(aggregated);
  const mdPath = path.join(RESULTS_DIR, 'benchmark-report.md');
  fs.writeFileSync(mdPath, markdown, 'utf-8');
  console.log(`✓ Markdown report saved: ${mdPath}`);

  // ————————————————————————————————————————————
  // CSV для графиков
  // ————————————————————————————————————————————

  const csv = generateCSV(allSamples);
  const csvPath = path.join(RESULTS_DIR, 'raw-samples.csv');
  fs.writeFileSync(csvPath, csv, 'utf-8');
  console.log(`✓ CSV saved: ${csvPath}`);

  console.log('\n✓ Benchmark complete!');
}

// ————————————————————————————————————————————
// Агрегация данных
// ————————————————————————————————————————————

function aggregate(samples: Sample[]): AggregatedStats[] {
  const groups = new Map<string, Sample[]>();

  for (const s of samples) {
    const key = `${s.method}||${s.scenario}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const result: AggregatedStats[] = [];

  for (const [, group] of groups) {
    const first = group[0];
    result.push({
      method: first.method,
      scenario: first.scenario,
      scenarioType: first.scenarioType,
      n: group.length,
      executionTime: computeStats(group.map(s => s.executionTime)),
      memoryDelta: computeStats(group.map(s => s.memoryDelta)),
      memoryPeak: computeStats(group.map(s => s.memoryPeak)),
      cpuUser: computeStats(group.map(s => s.cpuUser)),
      cpuSystem: computeStats(group.map(s => s.cpuSystem)),
      cls: computeStats(group.map(s => s.cls)),
      shiftsDetected: computeStats(group.map(s => s.shiftsDetected)),
      hasBreakdown: first.hasBreakdown,
      hasSources: first.hasSources,
    });
  }

  return result;
}

// ————————————————————————————————————————————
// Генерация Markdown-отчёта
// ————————————————————————————————————————————

function fmt(n: number, dec: number = 2): string {
  return n.toFixed(dec);
}

function fmtCI(stat: { mean: number; ci95: [number, number] }, dec: number = 2): string {
  const margin = stat.mean - stat.ci95[0];
  return `${fmt(stat.mean, dec)} ± ${fmt(margin, dec)}`;
}

function generateMarkdown(stats: AggregatedStats[]): string {
  const lines: string[] = [];

  lines.push('# Результаты бенчмарка: playwright-layout-shift');
  lines.push('');
  lines.push(`Дата: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Повторов: ${ITERATIONS}`);
  lines.push(`Доверительный интервал: 95% (t-распределение Стьюдента)`);
  lines.push('');

  // ——— Таблица 1: Производительность (все сценарии) ———
  lines.push('## Таблица 1. Время выполнения (мс) — 95% CI');
  lines.push('');
  lines.push('| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |');
  lines.push('|----------|-----|------------------------|-------------------|---------------------|');

  for (const scenario of SCENARIOS) {
    const row = [scenario.name, scenario.type];
    for (const method of METHODS) {
      const s = stats.find(x => x.method === method.name && x.scenario === scenario.name);
      row.push(s ? fmtCI(s.executionTime) : '—');
    }
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push('');

  // ——— Таблица 2: Память ———
  lines.push('## Таблица 2. Изменение heap-памяти (КБ) — 95% CI');
  lines.push('');
  lines.push('| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |');
  lines.push('|----------|-----|------------------------|-------------------|---------------------|');

  for (const scenario of SCENARIOS) {
    const row = [scenario.name, scenario.type];
    for (const method of METHODS) {
      const s = stats.find(x => x.method === method.name && x.scenario === scenario.name);
      if (s) {
        const kbStats = {
          mean: s.memoryDelta.mean / 1024,
          ci95: [s.memoryDelta.ci95[0] / 1024, s.memoryDelta.ci95[1] / 1024] as [number, number],
        };
        row.push(fmtCI(kbStats, 0));
      } else {
        row.push('—');
      }
    }
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push('');

  // ——— Таблица 3: CPU ———
  lines.push('## Таблица 3. CPU user time (мс) — 95% CI');
  lines.push('');
  lines.push('| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |');
  lines.push('|----------|-----|------------------------|-------------------|---------------------|');

  for (const scenario of SCENARIOS) {
    const row = [scenario.name, scenario.type];
    for (const method of METHODS) {
      const s = stats.find(x => x.method === method.name && x.scenario === scenario.name);
      if (s) {
        const msStats = {
          mean: s.cpuUser.mean / 1000,
          ci95: [s.cpuUser.ci95[0] / 1000, s.cpuUser.ci95[1] / 1000] as [number, number],
        };
        row.push(fmtCI(msStats, 1));
      } else {
        row.push('—');
      }
    }
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push('');

  // ——— Таблица 4: Точность CLS ———
  lines.push('## Таблица 4. CLS — 95% CI');
  lines.push('');
  lines.push('| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |');
  lines.push('|----------|-----|------------------------|-------------------|---------------------|');

  for (const scenario of SCENARIOS) {
    const row = [scenario.name, scenario.type];
    for (const method of METHODS) {
      const s = stats.find(x => x.method === method.name && x.scenario === scenario.name);
      row.push(s ? fmtCI(s.cls, 4) : '—');
    }
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push('');

  // ——— Таблица 5: Обнаруженные shift-ы ———
  lines.push('## Таблица 5. Обнаруженные layout shift-ы — 95% CI');
  lines.push('');
  lines.push('| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |');
  lines.push('|----------|-----|------------------------|-------------------|---------------------|');

  for (const scenario of SCENARIOS) {
    const row = [scenario.name, scenario.type];
    for (const method of METHODS) {
      const s = stats.find(x => x.method === method.name && x.scenario === scenario.name);
      row.push(s ? fmtCI(s.shiftsDetected, 1) : '—');
    }
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push('');

  // ——— Таблица 6: Качественные характеристики ———
  lines.push('## Таблица 6. Качественное сравнение возможностей');
  lines.push('');
  lines.push('| Критерий | playwright-layout-shift | manual-playwright | web-vitals-approach |');
  lines.push('|----------|------------------------|-------------------|---------------------|');
  lines.push('| Session windows (CLS 2021+) | ✅ Да | ❌ Нет (простая сумма) | ✅ Да |');
  lines.push('| Per-element breakdown | ✅ Да | ❌ Нет | ❌ Нет |');
  lines.push('| CSS-селекторы элементов | ✅ Да | ❌ Нет | ❌ Нет |');
  lines.push('| Source rects (prev/curr) | ✅ Да | ❌ Нет | ✅ Да (без селекторов) |');
  lines.push('| Кастомная метрика (амплитуда) | ✅ Да | ❌ Нет | ❌ Нет |');
  lines.push('| HTML-отчёт с тепловой картой | ✅ Да | ❌ Нет | ❌ Нет |');
  lines.push('| JSON-отчёт | ✅ Да | ❌ Нет | ❌ Нет |');
  lines.push('| Playwright Test fixture | ✅ Да | ❌ Нет | ❌ Нет |');
  lines.push('| assert по порогам | ✅ Да | ❌ Ручная проверка | ❌ Ручная проверка |');
  lines.push('| Объём кода интеграции | ~3 строки | ~40 строк | ~60 строк |');
  lines.push('');

  // ——— Сводка по типам тестов ———
  lines.push('## Таблица 7. Сводка по типам тестов (средние)');
  lines.push('');
  lines.push('| Тип | Метод | Время (мс) | Память (КБ) | CPU user (мс) | CLS |');
  lines.push('|-----|-------|------------|-------------|---------------|-----|');

  for (const type of ['simple', 'e2e'] as const) {
    for (const method of METHODS) {
      const typeStats = stats.filter(s => s.scenarioType === type && s.method === method.name);
      if (typeStats.length === 0) continue;

      const avgTime = typeStats.reduce((a, s) => a + s.executionTime.mean, 0) / typeStats.length;
      const avgMem = typeStats.reduce((a, s) => a + s.memoryDelta.mean, 0) / typeStats.length / 1024;
      const avgCpu = typeStats.reduce((a, s) => a + s.cpuUser.mean, 0) / typeStats.length / 1000;
      const avgCls = typeStats.reduce((a, s) => a + s.cls.mean, 0) / typeStats.length;

      lines.push(`| ${type} | ${method.name} | ${fmt(avgTime)} | ${fmt(avgMem, 0)} | ${fmt(avgCpu, 1)} | ${fmt(avgCls, 4)} |`);
    }
  }
  lines.push('');

  lines.push('## Методология');
  lines.push('');
  lines.push('- **Платформа**: Chromium (headless), Playwright');
  lines.push('- **Viewport**: 1920 × 1080');
  lines.push(`- **Повторов**: ${ITERATIONS} на каждую комбинацию (сценарий × метод)`);
  lines.push('- **Изоляция**: каждый прогон — новый BrowserContext (чистые куки, кеш)');
  lines.push('- **Доверительные интервалы**: 95%, t-распределение Стьюдента (df = n − 1)');
  lines.push('- **Settle timeout**: 500 мс (одинаков для всех методов)');
  lines.push('- **Метрики памяти**: `process.memoryUsage().heapUsed` (heap Node.js процесса)');
  lines.push('- **CPU**: `process.cpuUsage()` (user + system, μs → ms)');
  lines.push('');
  lines.push('### Методы сравнения');
  lines.push('');
  lines.push('1. **playwright-layout-shift** — полный API пакета: `measureVisualStability()` + `buildElementBreakdown()`');
  lines.push('2. **manual-playwright** — ручной `page.evaluate()` с inline PerformanceObserver, без session windows, без sources');
  lines.push('3. **web-vitals-approach** — inline-реализация алгоритма web-vitals (session windowing), с sources но без CSS-селекторов');

  return lines.join('\n');
}

// ————————————————————————————————————————————
// CSV
// ————————————————————————————————————————————

function generateCSV(samples: Sample[]): string {
  const headers = [
    'method', 'scenario', 'scenarioType', 'iteration',
    'executionTime', 'memoryDelta', 'memoryPeak',
    'cpuUser', 'cpuSystem',
    'cls', 'shiftsDetected', 'hasBreakdown', 'hasSources',
  ];

  const rows = samples.map(s => [
    s.method, s.scenario, s.scenarioType, s.iteration,
    s.executionTime.toFixed(2), s.memoryDelta, s.memoryPeak,
    s.cpuUser, s.cpuSystem,
    s.cls.toFixed(6), s.shiftsDetected, s.hasBreakdown ? 1 : 0, s.hasSources ? 1 : 0,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// ————————————————————————————————————————————
// Entry point
// ————————————————————————————————————————————

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
