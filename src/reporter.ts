// ============================================================
// reporter.ts — Генерация JSON-отчёта
// ============================================================

import type { StabilityResult, StabilityReport } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Формирует объект отчёта из результатов измерения.
 */
export function buildReport(result: StabilityResult, url: string): StabilityReport {
  return {
    timestamp: new Date().toISOString(),
    url,
    scenarioDuration: result.scenarioDuration,
    cls: result.cls,
    customScore: result.customScore,
    totalRawShifts: result.totalRawShifts,
    filteredShifts: result.filteredShifts,
    sessionWindows: result.sessionWindows,
    entries: result.entries,
  };
}

/**
 * Сохраняет отчёт в JSON-файл.
 *
 * @param report — объект отчёта.
 * @param filePath — путь к файлу (абсолютный или относительный).
 */
export function saveReport(report: StabilityReport, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
}
