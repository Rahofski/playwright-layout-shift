import type { LayoutShiftEntry, SessionWindow, CustomMetricOptions, ShiftRect } from './types';
export declare function buildSessionWindows(entries: LayoutShiftEntry[], sessionGap?: number, sessionMaxDuration?: number): SessionWindow[];
/**
 * Вычисляет CLS — максимальное значение cumulativeScore среди session windows.
 *
 * Это точная реализация метрики CLS по определению Google (2021+).
 */
export declare function calculateCLS(entries: LayoutShiftEntry[], sessionGap?: number, sessionMaxDuration?: number): {
    cls: number;
    sessionWindows: SessionWindow[];
};
/**
 * Вычисляет амплитуду смещения для одного source:
 * Евклидово расстояние между центрами previousRect и currentRect,
 * нормализованное к диагонали viewport (для безразмерности).
 *
 * Если rect-ы не заполнены (нулевые), возвращает 0.
 */
export declare function computeAmplitude(prev: ShiftRect, curr: ShiftRect, viewportWidth?: number, viewportHeight?: number): number;
/**
 * Вычисляет среднюю амплитуду смещения для одного entry.
 */
export declare function entryAmplitude(entry: LayoutShiftEntry): number;
/**
 * Кастомная метрика, учитывающая:
 *  a) величину shift (value) — как в CLS;
 *  b) временну́ю близость shift-событий (session window clustering);
 *  c) амплитуду смещения по previousRect / currentRect.
 *
 * Формула для каждого session window:
 *   windowScore = Σ (entry.value × (1 + amplitudeWeight × entryAmplitude(entry)))
 *
 * Итоговая оценка = максимальный windowScore.
 *
 * Почему так:
 *  — Сдвиги с малой амплитудой (мигание) менее заметны пользователю.
 *  — Сдвиги, сгруппированные по времени, воспринимаются как один «рывок».
 *  — amplitudeWeight позволяет регулировать влияние геометрии.
 */
export declare function calculateCustomMetric(entries: LayoutShiftEntry[], options?: CustomMetricOptions): number;
//# sourceMappingURL=metrics.d.ts.map