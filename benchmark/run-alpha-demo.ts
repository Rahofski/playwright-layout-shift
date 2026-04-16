// Простой эксперимент: чувствительность customScore к α
// на примере image-no-dimensions (30 повторов, 11 значений α)

import { chromium } from 'playwright';
import { measureVisualStability, calculateCustomMetric, entryAmplitude } from '../src/index';
import { computeStats } from './stats';

const BASE_URL = 'http://localhost:3000';
const ITERATIONS = 30;
const ALPHA_VALUES = Array.from({ length: 11 }, (_, i) => +(i * 0.1).toFixed(1));

interface Row {
  alpha: number;
  clsMean: number;
  clsCI: number;
  csMean: number;
  csCI: number;
  ratioMean: number;
  ratioCI: number;
  logCLS: number;
  logCS: number;
  deltaLog: number;
}

async function main() {
  console.log('Sensitivity demo: image-no-dimensions, α = 0.0 … 1.0, n = 30\n');

  const browser = await chromium.launch({ headless: true });
  const rows: Row[] = [];

  for (const alpha of ALPHA_VALUES) {
    process.stdout.write(`α=${alpha.toFixed(1)} `);
    const clsArr: number[] = [];
    const csArr: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await ctx.newPage();
      try {
        await page.goto(BASE_URL, { waitUntil: 'load' });
        await page.waitForTimeout(200);
        const result = await measureVisualStability(page, async (p) => {
          await p.goto(`${BASE_URL}/#/image-no-dimensions`);
          await p.waitForTimeout(1500);
        }, { settleTimeout: 500, captureSources: true, amplitudeWeight: alpha });

        const cs = calculateCustomMetric(result.entries, { amplitudeWeight: alpha });
        clsArr.push(result.cls);
        csArr.push(cs);
        process.stdout.write('.');
      } catch {
        process.stdout.write('✗');
      } finally {
        await page.close();
        await ctx.close();
      }
    }

    const clsStat = computeStats(clsArr);
    const csStat = computeStats(csArr);
    const ratioArr = clsArr.map((c, i) => c > 0 ? csArr[i] / c : 1);
    const ratioStat = computeStats(ratioArr);

    const logCLS = clsStat.mean > 0 ? Math.log10(clsStat.mean) : -6;
    const logCS = csStat.mean > 0 ? Math.log10(csStat.mean) : -6;

    rows.push({
      alpha,
      clsMean: clsStat.mean,
      clsCI: clsStat.mean - clsStat.ci95[0],
      csMean: csStat.mean,
      csCI: csStat.mean - csStat.ci95[0],
      ratioMean: ratioStat.mean,
      ratioCI: ratioStat.mean - ratioStat.ci95[0],
      logCLS,
      logCS,
      deltaLog: logCS - logCLS,
    });

    console.log(` done  CLS=${clsStat.mean.toFixed(4)}  CS=${csStat.mean.toFixed(4)}  ratio=${ratioStat.mean.toFixed(3)}`);
  }

  await browser.close();

  // Вывести markdown-таблицу
  console.log('\n## Markdown table:\n');
  console.log('| α | CLS (95% CI) | customScore (95% CI) | customScore / CLS | log₁₀(CLS) | log₁₀(customScore) | Δlog₁₀ |');
  console.log('|---|-------------|---------------------|-------------------|------------|---------------------|--------|');
  for (const r of rows) {
    console.log(
      `| ${r.alpha.toFixed(1)} ` +
      `| ${r.clsMean.toFixed(4)} ± ${r.clsCI.toFixed(4)} ` +
      `| ${r.csMean.toFixed(4)} ± ${r.csCI.toFixed(4)} ` +
      `| ${r.ratioMean.toFixed(3)} ± ${r.ratioCI.toFixed(3)} ` +
      `| ${r.logCLS.toFixed(3)} ` +
      `| ${r.logCS.toFixed(3)} ` +
      `| ${r.deltaLog.toFixed(3)} |`
    );
  }

  // Сохранить JSON
  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'results', 'sensitivity-alpha-demo.json');
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf-8');
  console.log(`\n✓ JSON saved: ${outPath}`);
}

main().catch(console.error);
