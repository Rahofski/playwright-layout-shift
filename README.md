# playwright-layout-shift

Playwright-плагин для автоматизированной оценки визуальной стабильности веб-интерфейсов на основе анализа layout-shift событий.

## Установка

```bash
npm install playwright-layout-shift --save-dev
```

### Peer-зависимости

Пакет требует Playwright ≥ 1.30:

```bash
npm install @playwright/test --save-dev
npx playwright install chromium
```

## Быстрый старт

```ts
import { test, expect } from '@playwright/test';
import { measureVisualStability, assertVisualStability } from 'playwright-layout-shift';

test('page is visually stable', async ({ page }) => {
  const result = await measureVisualStability(page, async (p) => {
    await p.goto('https://example.com');
    await p.click('#load-more');
  });

  assertVisualStability(result, { clsThreshold: 0.1 });
});
```

## API

### `measureVisualStability(page, scenarioFn, options?)`

Основная функция. Инжектирует `PerformanceObserver`, выполняет сценарий, собирает layout-shift events и вычисляет метрики.

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `page` | `Page` | Playwright Page (Chromium) |
| `scenarioFn` | `(page: Page) => Promise<void>` | Сценарий действий на странице |
| `options.settleTimeout` | `number` | Ожидание после сценария (ms). По умолчанию `1000` |
| `options.includeInputDriven` | `boolean` | Включать shift-ы от user input. По умолчанию `false` |
| `options.captureSources` | `boolean` | Захватывать previousRect/currentRect. По умолчанию `true` |
| `options.sessionGap` | `number` | Gap между session windows (ms). По умолчанию `1000` |
| `options.sessionMaxDuration` | `number` | Макс. длительность session window (ms). По умолчанию `5000` |
| `options.amplitudeWeight` | `number` | Вес амплитуды в кастомной метрике (0..1). По умолчанию `0.5` |

**Возвращает:** `Promise<StabilityResult>`

```ts
interface StabilityResult {
  entries: LayoutShiftEntry[];
  cls: number;                    // CLS (максимальное session window)
  customScore: number;            // Кастомная взвешенная метрика
  sessionWindows: SessionWindow[];
  totalRawShifts: number;
  filteredShifts: number;
  scenarioDuration: number;       // ms
}
```

### `calculateCLS(entries, sessionGap?, sessionMaxDuration?)`

Вычисляет CLS по определению Google (2021+). Группирует entries в session windows, возвращает максимальный cumulative score.

```ts
import { calculateCLS } from 'playwright-layout-shift';

const { cls, sessionWindows } = calculateCLS(entries);
```

### `calculateCustomMetric(entries, options?)`

Кастомная метрика, учитывающая:
- **Величину shift** (`entry.value`) — как в CLS.
- **Временну́ю близость** — session window clustering.
- **Амплитуду смещения** — евклидово расстояние между центрами `previousRect` и `currentRect`, нормализованное к диагонали viewport.

Формула:

$$\text{windowScore} = \sum_{e \in W} e.\text{value} \times \left(1 + \alpha \cdot \text{amplitude}(e)\right)$$

где $\alpha$ = `amplitudeWeight`.

```ts
import { calculateCustomMetric } from 'playwright-layout-shift';

const score = calculateCustomMetric(entries, { amplitudeWeight: 0.5 });
```

### `assertVisualStability(result, options?)`

Проверяет результаты по порогам. Бросает `VisualStabilityError` при превышении.

| Параметр | Тип | По умолчанию |
|----------|-----|-------------|
| `clsThreshold` | `number` | `0.1` |
| `customScoreThreshold` | `number` | не проверяется |

### Fixture

```ts
import { test, expect } from 'playwright-layout-shift/fixture';

test('stable page', async ({ page, visualStability }) => {
  await visualStability.measureAndAssert(page, async (p) => {
    await p.goto('https://example.com');
  }, { clsThreshold: 0.1 });
});
```

### JSON-отчёт

```ts
import { buildReport, saveReport } from 'playwright-layout-shift';

const report = buildReport(result, 'https://example.com');
saveReport(report, 'reports/stability.json');
```

Пример: [sample-report.json](./sample-report.json)

### HTML-отчёт с тепловой картой

Генерирует self-contained HTML-файл с:
- **Summary-карточки** — CLS (с рейтингом Good/Needs Improvement/Poor), Custom Score, количество shift-ов, session windows, длительность
- **Тепловая карта** — SVG-визуализация всех shift-ов на viewport (previousRect → currentRect со стрелками)
- **Timeline** — горизонтальная шкала session windows с отметками отдельных shift-ов
- **Per-element breakdown** — таблица элементов-«нарушителей», отсортированных по вкладу в CLS
- **Все entries** — детальная таблица всех layout-shift записей

```ts
import { buildReport, buildHtmlReport, saveHtmlReport } from 'playwright-layout-shift';

const report = buildReport(result, 'https://example.com');
const html = buildHtmlReport(report, {
  title: 'My Stability Report',
  viewportWidth: 1920,
  viewportHeight: 1080,
  showHeatmap: true,
  showTimeline: true,
  showBreakdown: true,
});
saveHtmlReport(html, 'reports/stability.html');
```

**Опции `HtmlReportOptions`:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `title` | `string` | `'Visual Stability Report'` | Заголовок страницы |
| `viewportWidth` | `number` | `1920` | Ширина viewport для heatmap |
| `viewportHeight` | `number` | `1080` | Высота viewport для heatmap |
| `showBreakdown` | `boolean` | `true` | Показывать таблицу per-element breakdown |
| `showTimeline` | `boolean` | `true` | Показывать timeline session windows |
| `showHeatmap` | `boolean` | `true` | Показывать тепловую карту |

### `buildElementBreakdown(entries)`

Агрегирует layout-shift entries по CSS-селекторам. Для каждого элемента вычисляет:
- Количество shift-ов
- Суммарный вклад в CLS (value распределяется поровну между sources)
- Среднюю и максимальную амплитуду смещения
- Все пары previousRect/currentRect

```ts
