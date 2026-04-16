// ============================================================
// benchmark/run-sensitivity.ts — Исследование чувствительности
// кастомной метрики к параметру α (amplitudeWeight)
//
// Запуск: npx tsx benchmark/run-sensitivity.ts
// Требования: demo-app должен быть запущен на localhost:3000
// ============================================================

import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  measureVisualStability,
  calculateCustomMetric,
  buildElementBreakdown,
  entryAmplitude,
} from '../src/index';
import { computeStats } from './stats';
import type { StatSummary } from './types';

// ————————————————————————————————————————————
// Конфигурация
// ————————————————————————————————————————————

const BASE_URL = 'http://localhost:3000';
const ITERATIONS = 30;

/** Шаг α: 0.0, 0.1, 0.2, ..., 1.0 */
const ALPHA_VALUES = Array.from({ length: 11 }, (_, i) => +(i * 0.1).toFixed(1));

/** Размеры экранов для исследования зависимости от viewport */
const VIEWPORTS = [
  { width: 375, height: 667, label: 'Mobile (375×667)' },
  { width: 1366, height: 768, label: 'Laptop (1366×768)' },
  { width: 1920, height: 1080, label: 'FullHD (1920×1080)' },
  { width: 2560, height: 1440, label: '2K (2560×1440)' },
];

interface ScenarioConfig {
  name: string;
  path: string;
  waitFor: number;
  waitSelector?: string;
}

const SCENARIOS: ScenarioConfig[] = [
  { name: 'font-swap', path: `${BASE_URL}/#/font-swap`, waitFor: 1200 },
  { name: 'stable-control', path: `${BASE_URL}/#/stable`, waitFor: 1200 },
  { name: 'async-content', path: `${BASE_URL}/#/async-content`, waitFor: 1000, waitSelector: '.injected-banner' },
  { name: 'image-no-dimensions', path: `${BASE_URL}/#/image-no-dimensions`, waitFor: 1500 },
  { name: 'dynamic-ad', path: `${BASE_URL}/#/dynamic-ad`, waitFor: 1600 },
];

// ————————————————————————————————————————————
// Типы
// ————————————————————————————————————————————

interface AlphaSample {
  scenario: string;
  alpha: number;
  iteration: number;
  cls: number;
  customScore: number;
  avgAmplitude: number;
  shiftsDetected: number;
}

interface ViewportSample {
  scenario: string;
  viewport: string;
  viewportWidth: number;
  viewportHeight: number;
  iteration: number;
  cls: number;
  customScore05: number; // α = 0.5
  avgAmplitude: number;
}

interface AlphaAggregated {
  scenario: string;
  alpha: number;
  n: number;
  cls: StatSummary;
  customScore: StatSummary;
  avgAmplitude: StatSummary;
  /** Отношение customScore / CLS — показатель «штрафа» */
  penaltyRatio: StatSummary;
  /** log10(customScore) — логарифмическое шкалирование */
  logCustomScore: StatSummary;
  /** log10(CLS) */
  logCLS: StatSummary;
}

interface ViewportAggregated {
  scenario: string;
  viewport: string;
  viewportWidth: number;
  viewportHeight: number;
  n: number;
  cls: StatSummary;
  customScore05: StatSummary;
  avgAmplitude: StatSummary;
  penaltyRatio: StatSummary;
}

// ————————————————————————————————————————————
// Runner
// ————————————————————————————————————————————

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULTS_DIR = path.join(__dirname, 'results');

async function runSensitivityAnalysis() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Sensitivity analysis: α (amplitudeWeight) × viewport ║');
  console.log('║  Iterations:', ITERATIONS, '                                    ║');
  console.log('║  α values:', ALPHA_VALUES.join(', '), '              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log();

  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // ——————————————————————————————————————
  // Часть 1: Sweep по α (default viewport 1920×1080)
  // ——————————————————————————————————————
  console.log('═══ Часть 1: Sweep по α (viewport 1920×1080) ═══\n');
  const alphaSamples: AlphaSample[] = [];

  for (const scenario of SCENARIOS) {
    for (const alpha of ALPHA_VALUES) {
      process.stdout.write(`▸ ${scenario.name}, α=${alpha.toFixed(1)} `);

      for (let i = 0; i < ITERATIONS; i++) {
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });
        const page = await context.newPage();

        try {
          await page.goto(BASE_URL, { waitUntil: 'load' });
          await page.waitForTimeout(200);

          const result = await measureVisualStability(page, async (p) => {
            await p.goto(scenario.path);
            if (scenario.waitSelector) {
              await p.waitForSelector(scenario.waitSelector, { timeout: 5000 });
            }
            await p.waitForTimeout(scenario.waitFor);
          }, { settleTimeout: 500, captureSources: true, amplitudeWeight: alpha });

          // Пересчитаем customScore с конкретным α
          const customScore = calculateCustomMetric(result.entries, { amplitudeWeight: alpha });

          // Средняя амплитуда по всем entries
          let totalAmp = 0;
          let ampCount = 0;
          for (const entry of result.entries) {
            if (!entry.hadRecentInput) {
              const amp = entryAmplitude(entry);
              totalAmp += amp;
              ampCount++;
            }
          }
          const avgAmp = ampCount > 0 ? totalAmp / ampCount : 0;

          alphaSamples.push({
            scenario: scenario.name,
            alpha,
            iteration: i + 1,
            cls: result.cls,
            customScore,
            avgAmplitude: avgAmp,
            shiftsDetected: result.filteredShifts,
          });

          process.stdout.write('.');
        } catch (err) {
          console.error(`\n  ✗ Error:`, (err as Error).message);
          process.stdout.write('✗');
        } finally {
          await page.close();
          await context.close();
        }
      }
      console.log(' done');
    }
  }

  // ——————————————————————————————————————
  // Часть 2: Sweep по viewport (α = 0.5)
  // ——————————————————————————————————————
  console.log('\n═══ Часть 2: Sweep по viewport (α = 0.5) ═══\n');
  const viewportSamples: ViewportSample[] = [];

  for (const scenario of SCENARIOS) {
    for (const vp of VIEWPORTS) {
      process.stdout.write(`▸ ${scenario.name}, ${vp.label} `);

      for (let i = 0; i < ITERATIONS; i++) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();

        try {
          await page.goto(BASE_URL, { waitUntil: 'load' });
          await page.waitForTimeout(200);

          const result = await measureVisualStability(page, async (p) => {
            await p.goto(scenario.path);
            if (scenario.waitSelector) {
              await p.waitForSelector(scenario.waitSelector, { timeout: 5000 });
            }
            await p.waitForTimeout(scenario.waitFor);
          }, { settleTimeout: 500, captureSources: true, amplitudeWeight: 0.5 });

          const customScore = calculateCustomMetric(result.entries, { amplitudeWeight: 0.5 });

          let totalAmp = 0;
          let ampCount = 0;
          for (const entry of result.entries) {
            if (!entry.hadRecentInput) {
              const amp = entryAmplitude(entry);
              totalAmp += amp;
              ampCount++;
            }
          }

          viewportSamples.push({
            scenario: scenario.name,
            viewport: vp.label,
            viewportWidth: vp.width,
            viewportHeight: vp.height,
            iteration: i + 1,
            cls: result.cls,
            customScore05: customScore,
            avgAmplitude: ampCount > 0 ? totalAmp / ampCount : 0,
          });

          process.stdout.write('.');
        } catch (err) {
          console.error(`\n  ✗ Error:`, (err as Error).message);
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

  // ——————————————————————————————————————
  // Агрегация
  // ——————————————————————————————————————

  const alphaAggregated = aggregateAlpha(alphaSamples);
  const viewportAggregated = aggregateViewport(viewportSamples);

  // Сохранение
  const rawAlphaPath = path.join(RESULTS_DIR, 'sensitivity-alpha-raw.json');
  fs.writeFileSync(rawAlphaPath, JSON.stringify(alphaSamples, null, 2), 'utf-8');
  console.log(`\n✓ Raw alpha samples: ${rawAlphaPath}`);

  const rawVpPath = path.join(RESULTS_DIR, 'sensitivity-viewport-raw.json');
  fs.writeFileSync(rawVpPath, JSON.stringify(viewportSamples, null, 2), 'utf-8');
  console.log(`✓ Raw viewport samples: ${rawVpPath}`);

  const aggAlphaPath = path.join(RESULTS_DIR, 'sensitivity-alpha-aggregated.json');
  fs.writeFileSync(aggAlphaPath, JSON.stringify(alphaAggregated, null, 2), 'utf-8');
  console.log(`✓ Aggregated alpha stats: ${aggAlphaPath}`);

  const aggVpPath = path.join(RESULTS_DIR, 'sensitivity-viewport-aggregated.json');
  fs.writeFileSync(aggVpPath, JSON.stringify(viewportAggregated, null, 2), 'utf-8');
  console.log(`✓ Aggregated viewport stats: ${aggVpPath}`);

  // Markdown-отчёт
  const markdown = generateSensitivityMarkdown(alphaAggregated, viewportAggregated);
  const mdPath = path.join(RESULTS_DIR, 'sensitivity-report.md');
  fs.writeFileSync(mdPath, markdown, 'utf-8');
  console.log(`✓ Sensitivity report: ${mdPath}`);

  console.log('\n✓ Sensitivity analysis complete!');
}

// ————————————————————————————————————————————
// Агрегация
// ————————————————————————————————————————————

function aggregateAlpha(samples: AlphaSample[]): AlphaAggregated[] {
  const groups = new Map<string, AlphaSample[]>();
  for (const s of samples) {
    const key = `${s.scenario}||${s.alpha}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const result: AlphaAggregated[] = [];
  for (const [, group] of groups) {
    const first = group[0];
    const clsValues = group.map(s => s.cls);
    const csValues = group.map(s => s.customScore);
    const ampValues = group.map(s => s.avgAmplitude);
    const ratioValues = group.map(s => s.cls > 0 ? s.customScore / s.cls : 1);
    const logCS = csValues.map(v => v > 0 ? Math.log10(v) : -6);
    const logCLS = clsValues.map(v => v > 0 ? Math.log10(v) : -6);

    result.push({
      scenario: first.scenario,
      alpha: first.alpha,
      n: group.length,
      cls: computeStats(clsValues),
      customScore: computeStats(csValues),
      avgAmplitude: computeStats(ampValues),
      penaltyRatio: computeStats(ratioValues),
      logCustomScore: computeStats(logCS),
      logCLS: computeStats(logCLS),
    });
  }

  return result;
}

function aggregateViewport(samples: ViewportSample[]): ViewportAggregated[] {
  const groups = new Map<string, ViewportSample[]>();
  for (const s of samples) {
    const key = `${s.scenario}||${s.viewport}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const result: ViewportAggregated[] = [];
  for (const [, group] of groups) {
    const first = group[0];
    const ratioValues = group.map(s => s.cls > 0 ? s.customScore05 / s.cls : 1);

    result.push({
      scenario: first.scenario,
      viewport: first.viewport,
      viewportWidth: first.viewportWidth,
      viewportHeight: first.viewportHeight,
      n: group.length,
      cls: computeStats(group.map(s => s.cls)),
      customScore05: computeStats(group.map(s => s.customScore05)),
      avgAmplitude: computeStats(group.map(s => s.avgAmplitude)),
      penaltyRatio: computeStats(ratioValues),
    });
  }

  return result;
}

// ————————————————————————————————————————————
// Markdown
// ————————————————————————————————————————————

function fmt(n: number, dec: number = 4): string {
  return n.toFixed(dec);
}

function fmtCI(stat: StatSummary, dec: number = 4): string {
  const margin = stat.mean - stat.ci95[0];
  return `${fmt(stat.mean, dec)} ± ${fmt(margin, dec)}`;
}

function generateSensitivityMarkdown(
  alpha: AlphaAggregated[],
  viewport: ViewportAggregated[],
): string {
  const lines: string[] = [];

  lines.push('# Исследование чувствительности кастомной метрики');
  lines.push('');
  lines.push(`Дата: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Повторов: ${ITERATIONS}`);
  lines.push(`Доверительный интервал: 95% (t-распределение Стьюдента)`);
  lines.push('');

  // ══════════════════════════════════════
  // Таблица 1: CLS vs customScore при разных α
  // ══════════════════════════════════════
  lines.push('## Таблица S1. CLS и customScore при разных α (viewport 1920×1080)');
  lines.push('');

  const scenarios = [...new Set(alpha.map(a => a.scenario))];

  for (const sc of scenarios) {
    lines.push(`### ${sc}`);
    lines.push('');
    lines.push('| α | CLS | customScore | Ratio (cs/cls) | log₁₀(CLS) | log₁₀(customScore) | Δlog₁₀ |');
    lines.push('|---|-----|-------------|----------------|------------|---------------------|--------|');

    const scData = alpha.filter(a => a.scenario === sc).sort((a, b) => a.alpha - b.alpha);
    for (const row of scData) {
      const deltaLog = row.logCustomScore.mean - row.logCLS.mean;
      lines.push(
        `| ${row.alpha.toFixed(1)} | ${fmtCI(row.cls)} | ${fmtCI(row.customScore)} | ${fmtCI(row.penaltyRatio, 4)} | ${fmt(row.logCLS.mean, 4)} | ${fmt(row.logCustomScore.mean, 4)} | ${fmt(deltaLog, 4)} |`
      );
    }
    lines.push('');
  }

  // ══════════════════════════════════════
  // Таблица 2: Средняя амплитуда
  // ══════════════════════════════════════
  lines.push('## Таблица S2. Средняя амплитуда shift-ов по сценариям');
  lines.push('');
  lines.push('| Сценарий | Средняя амплитуда (norm. к диагонали) |');
  lines.push('|----------|---------------------------------------|');

  for (const sc of scenarios) {
    // Берём α=0 — амплитуда не зависит от α
    const row = alpha.find(a => a.scenario === sc && a.alpha === 0);
    if (row) {
      lines.push(`| ${sc} | ${fmtCI(row.avgAmplitude, 6)} |`);
    }
  }
  lines.push('');

  // ══════════════════════════════════════
  // Таблица 3: Зависимость от viewport
  // ══════════════════════════════════════
  lines.push('## Таблица S3. Зависимость от размера viewport (α = 0.5)');
  lines.push('');

  for (const sc of scenarios) {
    lines.push(`### ${sc}`);
    lines.push('');
    lines.push('| Viewport | CLS | customScore | Ratio | Ср. амплитуда |');
    lines.push('|----------|-----|-------------|-------|---------------|');

    const scData = viewport.filter(v => v.scenario === sc);
    for (const row of scData) {
      lines.push(
        `| ${row.viewport} | ${fmtCI(row.cls)} | ${fmtCI(row.customScore05)} | ${fmtCI(row.penaltyRatio, 4)} | ${fmtCI(row.avgAmplitude, 6)} |`
      );
    }
    lines.push('');
  }

  // ══════════════════════════════════════
  // Сводка: обоснование amplitudeWeight
  // ══════════════════════════════════════
  lines.push('## Сводный анализ');
  lines.push('');
  lines.push('### Выбор α = 0.5');
  lines.push('');
  lines.push('Значение α = 0.5 выбрано как компромисс:');
  lines.push('- При α = 0.0 кастомная метрика ≡ CLS (штраф за амплитуду не работает).');
  lines.push('- При α = 1.0 штраф максимален — метрика может преувеличивать незначительные сдвиги.');
  lines.push('- При α = 0.5 соотношение customScore/CLS отражает реальную «визуальную тяжесть» сдвига.');
  lines.push('');

  return lines.join('\n');
}

// ————————————————————————————————————————————
// Запуск
// ————————————————————————————————————————————

runSensitivityAnalysis().catch(console.error);
