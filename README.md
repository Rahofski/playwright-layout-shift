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

## Примеры

- [Базовое использование](./examples/basic-usage.spec.ts) — без fixture, ручной assert
- [Fixture](./examples/fixture-usage.spec.ts) — через `visualStability` fixture

## Ограничения

### Почему только Chromium?

1. **Layout Instability API** — это экспериментальный API, реализованный только в Chromium ≥ 77.
2. Firefox и WebKit **не поддерживают** `PerformanceObserver` с типом `layout-shift`.
3. Поля `sources[].previousRect` и `sources[].currentRect` доступны только в Chromium ≥ 92.
4. Альтернатив на уровне CDP для Firefox/WebKit не существует.

### Другие ограничения

- **`sources` содержит до 5 элементов** — это ограничение спецификации Layout Instability API.
- **CSS-селектор** (`source.selector`) строится best-effort и может быть неточным для сложных DOM-деревьев.
- **`hadRecentInput`** помечает shift-ы в 500ms после user input — это эвристика браузера, не гарантия.
- **`value`** — безразмерная дробь (impact fraction × distance fraction), **не пиксели**.
- **data: URL** в тестах могут вести себя иначе, чем реальные HTTP-страницы (нет `navigation` entry).
- **SPA-навигации** не сбрасывают observer (это фича, не баг).

## Структура пакета

```
src/
├── types.ts        — Все интерфейсы и типы
├── injection.ts    — JS-код для инжекта в браузер
├── collector.ts    — Сбор entries через page.evaluate
├── metrics.ts      — calculateCLS + calculateCustomMetric
├── assertion.ts    — assertVisualStability
├── measure.ts      — measureVisualStability (главный API)
├── fixture.ts      — Playwright Test fixture
├── reporter.ts     — JSON-отчёт
└── index.ts        — Реэкспорт публичного API
```

## Тестирование

```bash
# Unit-тесты (Vitest)
npm run test:unit

# Интеграционные тесты (Playwright + Chromium)
npm run test:integration

# Все тесты
npm test
```

## MVP vs. запланировано на будущее

### MVP (реализовано)

- Инжект PerformanceObserver через `addInitScript` + `page.evaluate`
- Сбор layout-shift entries с фильтрацией `hadRecentInput`
- CLS (session window) — точная реализация по Google
- Кастомная метрика с учётом amplitude
- `measureVisualStability()` — главный API
- `assertVisualStability()` — проверка порогов
- Playwright Test fixture
- JSON-отчёт
- Unit + integration тесты

### Планы на будущее

- [ ] CDP-fallback для сбора layout-shift (более точные таймстемпы через `Performance.enable`)
- [ ] Per-element breakdown (детальный отчёт по каждому сместившемуся элементу)
- [ ] Визуальные скриншоты до/после shift-а
- [ ] HTML-отчёт с тепловой картой shift-ов
- [ ] Поддержка нескольких page (multi-tab scenarios)
- [ ] CI-интеграция (GitHub Actions reporter)
- [ ] Сравнение метрик между запусками (trend analysis)
- [ ] Конфигурация через `playwright.config.ts`

## Лицензия

MIT
#   p l a y w r i g h t - l a y o u t - s h i f t  
 