# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stability.spec.ts >> Images Without Dimensions >> CLS превышает порог Google "good" (0.1) — assertVisualStability падает
- Location: tests\stability.spec.ts:128:3

# Error details

```
VisualStabilityError: Visual stability check failed:
  - CLS 0.1095 exceeds threshold 0.1
Total layout shifts: 3
Session windows: 1
Scenario duration: 7770ms
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - 'heading "Сценарий: Изображения без размеров" [level=2] [ref=e5]'
    - paragraph [ref=e6]: Три изображения загружаются последовательно (300ms, 700ms, 1100ms). Поскольку размеры не зарезервированы, каждая загрузка вызывает layout shift.
    - generic [ref=e7]:
      - generic [ref=e9]: Hero Banner (200px)
      - generic [ref=e11]: Product Image (150px)
      - generic [ref=e13]: Promo Image (120px)
      - generic [ref=e14]:
        - heading "Текст под картинками" [level=3] [ref=e15]
        - paragraph [ref=e16]: Этот текст будет сдвигаться вниз с каждой загруженной картинкой. В итоге — три последовательных layout shift-а.
        - paragraph [ref=e17]:
          - text: "Для предотвращения: используйте CSS"
          - code [ref=e18]: aspect-ratio
          - text: или задайте
          - code [ref=e19]: width
          - text: /
          - code [ref=e20]: height
          - text: на элементах
          - code [ref=e21]: <img>
          - text: .
  - link "← Вернуться к списку сценариев" [ref=e23] [cursor=pointer]:
    - /url: "#/"
```

# Test source

```ts
  1  | "use strict";
  2  | // ============================================================
  3  | // assertion.ts — Проверка порогов визуальной стабильности
  4  | // ============================================================
  5  | Object.defineProperty(exports, "__esModule", { value: true });
  6  | exports.assertVisualStability = assertVisualStability;
  7  | const types_1 = require("./types");
  8  | const DEFAULT_CLS_THRESHOLD = 0.1; // Google «good» threshold
  9  | /**
  10 |  * Проверяет результаты измерений по пороговым значениям.
  11 |  * Бросает VisualStabilityError если порог превышен.
  12 |  */
  13 | function assertVisualStability(result, options = {}) {
  14 |     const clsThreshold = options.clsThreshold ?? DEFAULT_CLS_THRESHOLD;
  15 |     const customThreshold = options.customScoreThreshold;
  16 |     const violations = [];
  17 |     if (result.cls > clsThreshold) {
  18 |         violations.push(`CLS ${result.cls.toFixed(4)} exceeds threshold ${clsThreshold}`);
  19 |     }
  20 |     if (customThreshold !== undefined && result.customScore > customThreshold) {
  21 |         violations.push(`Custom score ${result.customScore.toFixed(4)} exceeds threshold ${customThreshold}`);
  22 |     }
  23 |     if (violations.length > 0) {
  24 |         const message = [
  25 |             'Visual stability check failed:',
  26 |             ...violations.map((v) => `  - ${v}`),
  27 |             `Total layout shifts: ${result.filteredShifts}`,
> 28 |             `Session windows: ${result.sessionWindows.length}`,
     |           ^ VisualStabilityError: Visual stability check failed:
  29 |             `Scenario duration: ${result.scenarioDuration.toFixed(0)}ms`,
  30 |         ].join('\n');
  31 |         throw new types_1.VisualStabilityError(message, result, options);
  32 |     }
  33 | }
  34 | //# sourceMappingURL=assertion.js.map
```