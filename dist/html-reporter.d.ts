import type { StabilityReport, HtmlReportOptions } from './types';
/**
 * Генерирует self-contained HTML-строку отчёта из StabilityReport.
 *
 * Отчёт включает:
 *  — Summary-карточки (CLS, customScore, shift count, duration)
 *  — Тепловую карту shift-ов (SVG overlay по viewport)
 *  — Timeline session windows
 *  — Per-element breakdown таблицу
 *  — Таблицу всех layout-shift entries
 *
 * @param report — данные отчёта (из buildReport).
 * @param options — опции отображения.
 * @returns HTML-строка (self-contained, без внешних зависимостей).
 */
export declare function buildHtmlReport(report: StabilityReport, options?: HtmlReportOptions): string;
/**
 * Сохраняет HTML-отчёт в файл.
 *
 * @param html — HTML-строка (из buildHtmlReport).
 * @param filePath — путь к файлу.
 */
export declare function saveHtmlReport(html: string, filePath: string): void;
//# sourceMappingURL=html-reporter.d.ts.map