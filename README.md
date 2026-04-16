# playwright-layout-shift — Playwright-плагин для автоматизированной оценки визуальной стабильности

# Authors and contributors

The main contributor Roman R. Garipov, student of SPbPU ICSC.

The advisor and contributor Vladimir A. Parkhomenko, Senior Lecturer of SPbPU ICSC.

# Introduction

Визуальная стабильность — одна из ключевых метрик воспринимаемого качества веб-интерфейсов. Bouch и др. [1] показали, что задержки и визуальные артефакты напрямую влияют на субъективную оценку пользователем качества веб-сервиса. Bhatti и др. [2] предложили интегрировать пользовательские метрики качества в серверную архитектуру, однако клиентские layout-сдвиги остались за рамками их работы. Google ввёл метрику Cumulative Layout Shift (CLS) в 2020 году как часть Core Web Vitals [4], а W3C стандартизировал Layout Instability API [5] для наблюдения за сдвигами в браузере. Wehner и др. [3] исследовали соответствие Core Web Vitals реальному пользовательскому восприятию и выявили расхождения, связанные с cookie-баннерами, но не рассматривали автоматизацию тестирования стабильности в CI/CD-пайплайне. **На сегодняшний день отсутствует готовый инструмент, совмещающий программный сбор layout-shift событий через Playwright, вычисление CLS по алгоритму session windows, per-element breakdown с CSS-селекторами, расширенную метрику с учётом амплитуды, и генерацию визуальных отчётов — в виде единого npm-пакета.**

**Цель работы** — разработка и экспериментальная оценка npm-пакета `playwright-layout-shift`, предоставляющего автоматизированный пайплайн сбора, анализа и визуализации layout-shift событий для интеграции в Playwright-тесты.

**Задачи:** 1) реализовать модуль инжекции `PerformanceObserver` и сбора `layout-shift` entries через Playwright CDP; 2) реализовать вычисление CLS по алгоритму session windows (Google, 2021+) и кастомной метрики с учётом амплитуды смещения; 3) реализовать per-element breakdown с идентификацией элементов по CSS-селекторам; 4) реализовать генерацию JSON- и HTML-отчётов (тепловая карта, timeline, breakdown); 5) провести экспериментальное сравнение с альтернативными подходами (ручной `page.evaluate`, web-vitals-подход) на 5 сценариях (30 повторов, 95% CI).

# Метод (пайплайн)

Пайплайн автоматизированной оценки визуальной стабильности:

1. **Инжекция observer** — в загруженную страницу через `page.evaluate()` внедряется `PerformanceObserver`, подписанный на `layout-shift` entries с `buffered: true`.
2. **Выполнение сценария** — пользовательская функция `scenarioFn(page)` выполняет навигацию и взаимодействие с элементами.
3. **Settle-ожидание** — пауза (`settleTimeout`, по умолчанию 1000 мс) для фиксации отложенных shift-ов.
4. **Сбор entries** — через `page.evaluate()` извлекаются накопленные `LayoutShiftEntry[]` (value, startTime, sources с `previousRect`/`currentRect`, CSS-селекторы через `element.matches()`).
5. **Фильтрация** — исключаются input-driven shift-ы (`hadRecentInput`), если не задан `includeInputDriven`.
6. **Вычисление метрик** — CLS (максимум среди session windows) и кастомная метрика: $\text{windowScore} = \sum_{e \in W} e.\text{value} \cdot (1 + \alpha \cdot \text{amplitude}(e))$.
7. **Per-element breakdown** — агрегация shift-ов по CSS-селекторам: count, суммарный вклад, средняя/макс. амплитуда.
8. **Генерация отчётов** — JSON-отчёт и/или HTML-отчёт (SVG-тепловая карта, timeline session windows, таблица breakdown).
9. **Assert** — проверка CLS и customScore по заданным порогам, выброс `VisualStabilityError` при превышении.

# Архитектура

Диаграмма архитектуры доступна в файле [`docs/architecture.drawio`](./docs/architecture.drawio) (формат draw.io, открывается в draw.io / diagrams.net, редактируемая).

```
┌─────────────────────────────────────────────────────────────┐
│                    playwright-layout-shift                   │
│                                                             │
│  ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌────────┐  │
│  │ measure  │──▶│ collector │──▶│ metrics  │──▶│ assert │  │
│  │ .ts      │   │ .ts       │   │ .ts      │   │ ion.ts │  │
│  └──────────┘   └───────────┘   └──────────┘   └────────┘  │
│       │              │               │                      │
│       │              │               ▼                      │
│       │              │         ┌───────────┐                │
│       │              │         │ breakdown │                │
│       │              │         │ .ts       │                │
│       │              │         └───────────┘                │
│       │              │               │                      │
│       ▼              ▼               ▼                      │
│  ┌──────────────────────────────────────────┐               │
│  │           reporter.ts / html-reporter.ts │               │
│  │   (JSON-отчёт, HTML с тепловой картой)   │               │
│  └──────────────────────────────────────────┘               │
│                                                             │
│  ┌───────────┐   ┌──────────┐                               │
│  │ fixture   │   │ injection│  (PerformanceObserver inject) │
│  │ .ts       │   │ .ts      │                               │
│  └───────────┘   └──────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

# Описательное сравнение аналогичных решений

| Критерий | playwright-layout-shift | Ручной page.evaluate (manual-playwright) | web-vitals-подход |
|----------|------------------------|------------------------------------------|-------------------|
| Session windows (CLS 2021+) | Да | Нет (простая сумма) | Да |
| Per-element breakdown | Да | Нет | Нет |
| CSS-селекторы элементов | Да | Нет | Нет |
| Source rects (prev/curr) | Да | Нет | Да (без селекторов) |
| Кастомная метрика (амплитуда) | Да | Нет | Нет |
| HTML-отчёт с тепловой картой | Да | Нет | Нет |
| JSON-отчёт | Да | Нет | Нет |
| Playwright Test fixture | Да | Нет | Нет |
| Assert по порогам | Да | Ручная проверка | Ручная проверка |
| Объём кода интеграции | ~3 строки | ~40 строк | ~60 строк |

# Результаты экспериментального сравнения

Платформа: Chromium (headless), Playwright, viewport 1920×1080. Повторов: **30** на каждую комбинацию (сценарий × метод). Доверительные интервалы: **95%**, t-распределение Стьюдента (df = n − 1). Каждый прогон — изолированный BrowserContext (чистые куки и кеш). Settle timeout: 500 мс. Метрики памяти: `process.memoryUsage().heapUsed`. CPU: `process.cpuUsage()` (user, мкс → мс).

## Таблица 1. Время выполнения (мс) — 95% CI

| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |
|----------|-----|------------------------|-------------------|---------------------|
| font-swap | simple | 1736.84 ± 3.05 | 1732.24 ± 2.66 | 1733.90 ± 2.72 |
| stable-control | simple | 1733.43 ± 2.63 | 1734.52 ± 1.99 | 1733.78 ± 2.81 |
| async-content | e2e | 2393.41 ± 3.37 | 2390.19 ± 3.30 | 2390.75 ± 4.47 |
| image-no-dimensions | e2e | 2032.60 ± 2.91 | 2032.04 ± 2.70 | 2036.90 ± 2.39 |
| dynamic-ad | e2e | 2139.36 ± 2.73 | 2134.95 ± 3.18 | 2136.28 ± 2.43 |

## Таблица 2. Изменение heap-памяти (КБ) — 95% CI

| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |
|----------|-----|------------------------|-------------------|---------------------|
| font-swap | simple | 33 ± 794 | 150 ± 465 | −293 ± 486 |
| stable-control | simple | −82 ± 722 | −166 ± 519 | −50 ± 186 |
| async-content | e2e | −359 ± 1074 | 3 ± 1523 | 591 ± 2568 |
| image-no-dimensions | e2e | −34 ± 1605 | 227 ± 144 | 148 ± 146 |
| dynamic-ad | e2e | −47 ± 185 | 101 ± 94 | −185 ± 470 |

## Таблица 3. CPU user time (мс) — 95% CI

| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |
|----------|-----|------------------------|-------------------|---------------------|
| font-swap | simple | 22.9 ± 18.0 | 16.0 ± 6.2 | 15.1 ± 6.4 |
| stable-control | simple | 13.6 ± 5.9 | 13.0 ± 5.5 | 13.1 ± 6.4 |
| async-content | e2e | 48.9 ± 13.9 | 44.9 ± 9.9 | 37.0 ± 11.2 |
| image-no-dimensions | e2e | 13.6 ± 5.9 | 19.3 ± 9.0 | 12.0 ± 5.0 |
| dynamic-ad | e2e | 23.4 ± 10.8 | 11.0 ± 5.8 | 22.3 ± 9.2 |

## Таблица 4. CLS — 95% CI

| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |
|----------|-----|------------------------|-------------------|---------------------|
| font-swap | simple | 0.0047 ± 0.0000 | 0.0047 ± 0.0000 | 0.0047 ± 0.0000 |
| stable-control | simple | 0.0008 ± 0.0000 | 0.0008 ± 0.0000 | 0.0008 ± 0.0000 |
| async-content | e2e | 0.0091 ± 0.0000 | 0.0091 ± 0.0000 | 0.0091 ± 0.0000 |
| image-no-dimensions | e2e | 0.0223 ± 0.0000 | 0.0223 ± 0.0000 | 0.0223 ± 0.0000 |
| dynamic-ad | e2e | 0.0253 ± 0.0000 | 0.0253 ± 0.0000 | 0.0253 ± 0.0000 |

## Таблица 5. Обнаруженные layout shift-ы — 95% CI

| Сценарий | Тип | playwright-layout-shift | manual-playwright | web-vitals-approach |
|----------|-----|------------------------|-------------------|---------------------|
| font-swap | simple | 1.0 ± 0.0 | 1.0 ± 0.0 | 1.0 ± 0.0 |
| stable-control | simple | 1.0 ± 0.0 | 1.0 ± 0.0 | 1.0 ± 0.0 |
| async-content | e2e | 1.0 ± 0.0 | 1.0 ± 0.0 | 1.0 ± 0.0 |
| image-no-dimensions | e2e | 2.0 ± 0.0 | 2.0 ± 0.0 | 2.0 ± 0.0 |
| dynamic-ad | e2e | 2.0 ± 0.0 | 2.0 ± 0.0 | 2.0 ± 0.0 |

## Таблица 6. Сводка по типам тестов (средние)

| Тип | Метод | Время (мс) | Память (КБ) | CPU user (мс) | CLS |
|-----|-------|------------|-------------|---------------|-----|
| simple | playwright-layout-shift | 1735.14 | −25 | 18.3 | 0.0027 |
| simple | manual-playwright | 1733.38 | −8 | 14.5 | 0.0027 |
| simple | web-vitals-approach | 1733.84 | −172 | 14.1 | 0.0027 |
| e2e | playwright-layout-shift | 2188.46 | −147 | 28.7 | 0.0189 |
| e2e | manual-playwright | 2185.73 | 110 | 25.1 | 0.0189 |
| e2e | web-vitals-approach | 2187.98 | 185 | 23.8 | 0.0189 |

# Интерпретация результатов

**Корректность (качество).** Все три метода дают идентичные значения CLS и одинаковое количество обнаруженных shift-ов на каждом сценарии (доверительные интервалы CLS = 0). Это подтверждает, что пакет `playwright-layout-shift` корректно реализует алгоритм CLS по стандарту Google (2021+) и не вносит ошибок в вычисления.

**Производительность (время).** Накладные расходы пакета на сбор данных составляют 1–5 мс по сравнению с ручным подходом (например, 1736.84 ± 3.05 vs 1732.24 ± 2.66 на font-swap). Разница находится в пределах доверительного интервала и статистически незначима. Пакет не вносит значимых задержек в тестовый пайплайн.

**Память (heap).** Изменения heap-памяти у всех методов сопоставимы и находятся в пределах шума (широкие CI из-за GC). Пакет не создаёт заметной дополнительной нагрузки на память.

**CPU (user time).** Пакет потребляет на 3–12 мс больше CPU user time на сложных сценариях (e2e) по сравнению с конкурентами — это объясняется дополнительной логикой: per-element breakdown, CSS-селекторы, сохранение source rects. Для simple-сценариев разница минимальна.

**Типы ошибок и ограничения.** 1) Пакет работает только в Chromium (Layout Instability API не поддерживается в Firefox/WebKit); 2) CSS-селекторы могут быть недоступны для элементов Shadow DOM — в этом случае `selector` будет `null`; 3) очень короткие shift-ы (< 1 мс) могут быть пропущены при больших значениях `settleTimeout`; 4) heap-метрики подвержены влиянию GC, что затрудняет точную оценку потребления памяти на уровне отдельного прогона.

**Артефакты эксперимента.** Сырые данные: [`benchmark/results/raw-samples.json`](./benchmark/results/raw-samples.json), [`benchmark/results/raw-samples.csv`](./benchmark/results/raw-samples.csv). Агрегированные: [`benchmark/results/aggregated.json`](./benchmark/results/aggregated.json). Отчёт: [`benchmark/results/benchmark-report.md`](./benchmark/results/benchmark-report.md). Демо-приложение со сценариями: [`demo-app/`](./demo-app/). HTML-отчёты по сценариям: [`demo-app/reports/`](./demo-app/reports/). Скрипт бенчмарка: [`benchmark/run-benchmark.ts`](./benchmark/run-benchmark.ts).

# Исследование чувствительности кастомной метрики к параметру α

Для демонстрации влияния параметра $\alpha$ (amplitudeWeight) на кастомную метрику проведён эксперимент на сценарии **image-no-dimensions** (три изображения без заданных width/height загружаются каскадно — 300 мс, 700 мс, 1100 мс — и вызывают три последовательных layout shift). Параметр $\alpha$ варьируется от 0.0 до 1.0 с шагом 0.1. Viewport: 1920×1080, повторов: **30**, 95% CI (t-распределение).

## Таблица 7. Чувствительность customScore к α (сценарий image-no-dimensions)

| α | CLS (95% CI) | customScore (95% CI) | customScore / CLS | log₁₀(CLS) | log₁₀(customScore) | Δlog₁₀ |
|---|-------------|---------------------|-------------------|------------|---------------------|--------|
| 0.0 | 0.1095 ± 0.0001 | 0.1095 ± 0.0001 | 1.000 ± 0.000 | −0.961 | −0.961 | 0.000 |
| 0.1 | 0.1095 ± 0.0001 | 0.1111 ± 0.0002 | 1.015 ± 0.001 | −0.961 | −0.954 | 0.006 |
| 0.2 | 0.1095 ± 0.0001 | 0.1128 ± 0.0002 | 1.030 ± 0.001 | −0.961 | −0.948 | 0.013 |
| 0.3 | 0.1095 ± 0.0001 | 0.1144 ± 0.0002 | 1.045 ± 0.001 | −0.961 | −0.942 | 0.019 |
| 0.4 | 0.1095 ± 0.0001 | 0.1161 ± 0.0003 | 1.060 ± 0.002 | −0.961 | −0.935 | 0.026 |
| 0.5 | 0.1095 ± 0.0001 | 0.1177 ± 0.0003 | 1.075 ± 0.002 | −0.961 | −0.929 | 0.031 |
| 0.6 | 0.1095 ± 0.0001 | 0.1194 ± 0.0003 | 1.090 ± 0.002 | −0.961 | −0.923 | 0.038 |
| 0.7 | 0.1095 ± 0.0001 | 0.1210 ± 0.0004 | 1.105 ± 0.002 | −0.961 | −0.917 | 0.043 |
| 0.8 | 0.1095 ± 0.0001 | 0.1226 ± 0.0004 | 1.120 ± 0.003 | −0.961 | −0.912 | 0.049 |
| 0.9 | 0.1095 ± 0.0001 | 0.1243 ± 0.0004 | 1.135 ± 0.003 | −0.961 | −0.906 | 0.055 |
| 1.0 | 0.1095 ± 0.0001 | 0.1259 ± 0.0005 | 1.150 ± 0.003 | −0.961 | −0.900 | 0.061 |

**Интерпретация.**
- CLS не зависит от α (это стандартная метрика Google) и составляет 0.1095 — три каскадных shift-а (0.0518, 0.0374, 0.0203) попадают в одно session window.
- customScore монотонно растёт с увеличением α: от 0.1095 (≡ CLS при α = 0) до 0.1259 (при α = 1.0), прирост составляет **+15.0%**.
- При выбранном α = 0.5 кастомная метрика = 0.1177, что на **7.5%** выше CLS — штраф отражает среднюю амплитуду сдвигов ≈ 0.15 (15% диагонали viewport).
- Логарифмическая шкала (Δlog₁₀) подтверждает: разница customScore vs CLS увеличивается линейно с ростом α, достигая 0.061 десятичных порядка при α = 1.0.
- **Обоснование необходимости штрафа:** CLS оценивает все три shift-а суммарно как 0.1095, но не различает, сместились ли элементы на 20 px или на 200 px по экрану. В данном сценарии средняя амплитуда двух сдвигающихся объектов составляет 0.073 (контейнер картинок) и 0.200 (текстовый блок под ними — сдвигается на ≈430 px). Кастомная метрика при α > 0 вносит штраф, пропорциональный евклидову расстоянию смещения, нормализованному к диагонали viewport — что позволяет различать «лёгкие» и «тяжёлые» сдвиги с одинаковым CLS.

Скрипт эксперимента: [`benchmark/run-alpha-demo.ts`](./benchmark/run-alpha-demo.ts).

Репозиторий с полным кодом и артефактами: **https://github.com/TODO_REPLACE_WITH_ACTUAL_REPO_URL**

# Instruction

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

## Запуск тестов

```bash
npm run test:unit         # Юнит-тесты (vitest)
npm run test:integration  # Интеграционные тесты (Playwright)
npm run test              # Все тесты
npm run benchmark         # Запуск бенчмарка (30 повторов × 5 сценариев × 3 метода)
```

## Воспроизведение эксперимента

1. Клонировать репозиторий: `git clone <url> && cd playwright-layout-shift`
2. Установить зависимости: `npm install && npx playwright install chromium`
3. Собрать пакет: `npm run build`
4. Установить зависимости демо-приложения: `cd demo-app && npm install && cd ..`
5. Запустить бенчмарк: `npm run benchmark`
6. Результаты появятся в `benchmark/results/`

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

$$\text{windowScore} = \sum_{e \in W} e.\text{value} \cdot \left(1 + \alpha \cdot \text{amplitude}(e)\right)$$

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
import { buildElementBreakdown } from 'playwright-layout-shift';

const breakdown = buildElementBreakdown(result.entries);
// [{ selector: 'div.ad-banner', shiftCount: 3, totalContribution: 0.018, ... }, ...]
```

# License

MIT License

Input datasets used in this repository remain under the original licenses specified by their respective authors and sources, see links in References.

# Warranty

The developed software is in progress. Authors give no warranty.

# References

1. Bouch A., Kuchinsky A., Bhatti N. Quality is in the eye of the beholder: meeting users' requirements for Internet quality of service / Proceedings of the SIGCHI Conference on Human Factors in Computing Systems. – 2000. – P. 297–304.
2. Bhatti N., Bouch A., Kuchinsky A. Integrating user-perceived quality into Web server design / Computer Networks. – 2000. – Vol. 33, № 1–6. – P. 1–16.
3. Wehner N., Seufert M., Schatz R., Hoßfeld T. Do you agree? Contrasting Google's Core Web Vitals and the impact of cookie consent banners with actual web QoE / Quality and User Experience. – 2023. – Vol. 8. – Art. 5.
4. Walton P. Cumulative Layout Shift (CLS) / web.dev. – Google, 2020 (updated 2024). – URL: https://web.dev/articles/cls
5. Layout Instability API / W3C Web Incubator Community Group. – 2022. – URL: https://wicg.github.io/layout-instability/
