# Результаты бенчмарка: playwright-layout-shift

Дата: 2026-04-10
Повторов: 30
Доверительный интервал: 95% (t-распределение Стьюдента)

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
| font-swap | simple | 33 ± 794 | 150 ± 465 | -293 ± 486 |
| stable-control | simple | -82 ± 722 | -166 ± 519 | -50 ± 186 |
| async-content | e2e | -359 ± 1074 | 3 ± 1523 | 591 ± 2568 |
| image-no-dimensions | e2e | -34 ± 1605 | 227 ± 144 | 148 ± 146 |
| dynamic-ad | e2e | -47 ± 185 | 101 ± 94 | -185 ± 470 |

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

## Таблица 6. Качественное сравнение возможностей

| Критерий | playwright-layout-shift | manual-playwright | web-vitals-approach |
|----------|------------------------|-------------------|---------------------|
| Session windows (CLS 2021+) | ✅ Да | ❌ Нет (простая сумма) | ✅ Да |
| Per-element breakdown | ✅ Да | ❌ Нет | ❌ Нет |
| CSS-селекторы элементов | ✅ Да | ❌ Нет | ❌ Нет |
| Source rects (prev/curr) | ✅ Да | ❌ Нет | ✅ Да (без селекторов) |
| Кастомная метрика (амплитуда) | ✅ Да | ❌ Нет | ❌ Нет |
| HTML-отчёт с тепловой картой | ✅ Да | ❌ Нет | ❌ Нет |
| JSON-отчёт | ✅ Да | ❌ Нет | ❌ Нет |
| Playwright Test fixture | ✅ Да | ❌ Нет | ❌ Нет |
| assert по порогам | ✅ Да | ❌ Ручная проверка | ❌ Ручная проверка |
| Объём кода интеграции | ~3 строки | ~40 строк | ~60 строк |

## Таблица 7. Сводка по типам тестов (средние)

| Тип | Метод | Время (мс) | Память (КБ) | CPU user (мс) | CLS |
|-----|-------|------------|-------------|---------------|-----|
| simple | playwright-layout-shift | 1735.14 | -25 | 18.3 | 0.0027 |
| simple | manual-playwright | 1733.38 | -8 | 14.5 | 0.0027 |
| simple | web-vitals-approach | 1733.84 | -172 | 14.1 | 0.0027 |
| e2e | playwright-layout-shift | 2188.46 | -147 | 28.7 | 0.0189 |
| e2e | manual-playwright | 2185.73 | 110 | 25.1 | 0.0189 |
| e2e | web-vitals-approach | 2187.98 | 185 | 23.8 | 0.0189 |

## Методология

- **Платформа**: Chromium (headless), Playwright
- **Viewport**: 1920 × 1080
- **Повторов**: 30 на каждую комбинацию (сценарий × метод)
- **Изоляция**: каждый прогон — новый BrowserContext (чистые куки, кеш)
- **Доверительные интервалы**: 95%, t-распределение Стьюдента (df = n − 1)
- **Settle timeout**: 500 мс (одинаков для всех методов)
- **Метрики памяти**: `process.memoryUsage().heapUsed` (heap Node.js процесса)
- **CPU**: `process.cpuUsage()` (user + system, μs → ms)

### Методы сравнения

1. **playwright-layout-shift** — полный API пакета: `measureVisualStability()` + `buildElementBreakdown()`
2. **manual-playwright** — ручной `page.evaluate()` с inline PerformanceObserver, без session windows, без sources
3. **web-vitals-approach** — inline-реализация алгоритма web-vitals (session windowing), с sources но без CSS-селекторов