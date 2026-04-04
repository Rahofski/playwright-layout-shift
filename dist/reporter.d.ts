import type { StabilityResult, StabilityReport } from './types';
/**
 * Формирует объект отчёта из результатов измерения.
 */
export declare function buildReport(result: StabilityResult, url: string): StabilityReport;
/**
 * Сохраняет отчёт в JSON-файл.
 *
 * @param report — объект отчёта.
 * @param filePath — путь к файлу (абсолютный или относительный).
 */
export declare function saveReport(report: StabilityReport, filePath: string): void;
//# sourceMappingURL=reporter.d.ts.map