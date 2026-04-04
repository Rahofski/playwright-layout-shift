"use strict";
// ============================================================
// metrics.ts — Вычисление CLS и кастомной метрики
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSessionWindows = buildSessionWindows;
exports.calculateCLS = calculateCLS;
exports.computeAmplitude = computeAmplitude;
exports.entryAmplitude = entryAmplitude;
exports.calculateCustomMetric = calculateCustomMetric;
// ————————————————————————————————————————————
// CLS (Cumulative Layout Shift) — реализация Google
// https://web.dev/cls/#what-is-cls
// ————————————————————————————————————————————
const DEFAULT_SESSION_GAP = 1000; // ms
const DEFAULT_SESSION_MAX = 5000; // ms
/**
 * Группирует layout-shift entries в session windows.
 *
 * Алгоритм:
 *  1) Записи сортируются по startTime.
 *  2) Новое окно начинается, если промежуток > sessionGap
 *     или длительность текущего окна > sessionMaxDuration.
 */
function buildSessionWindows(entries, sessionGap = DEFAULT_SESSION_GAP, sessionMaxDuration = DEFAULT_SESSION_MAX) {
    if (entries.length === 0)
        return [];
    const sorted = [...entries].sort((a, b) => a.startTime - b.startTime);
    const windows = [];
    let current = {
        startTime: sorted[0].startTime,
        endTime: sorted[0].startTime,
        entries: [sorted[0]],
        cumulativeScore: sorted[0].value,
    };
    for (let i = 1; i < sorted.length; i++) {
        const entry = sorted[i];
        const gap = entry.startTime - current.endTime;
        const windowDuration = entry.startTime - current.startTime;
        if (gap > sessionGap || windowDuration > sessionMaxDuration) {
            // Закрываем текущее окно, начинаем новое
            windows.push(current);
            current = {
                startTime: entry.startTime,
                endTime: entry.startTime,
                entries: [entry],
                cumulativeScore: entry.value,
            };
        }
        else {
            current.entries.push(entry);
            current.endTime = entry.startTime;
            current.cumulativeScore += entry.value;
        }
    }
    windows.push(current);
    return windows;
}
/**
 * Вычисляет CLS — максимальное значение cumulativeScore среди session windows.
 *
 * Это точная реализация метрики CLS по определению Google (2021+).
 */
function calculateCLS(entries, sessionGap = DEFAULT_SESSION_GAP, sessionMaxDuration = DEFAULT_SESSION_MAX) {
    const windows = buildSessionWindows(entries, sessionGap, sessionMaxDuration);
    if (windows.length === 0) {
        return { cls: 0, sessionWindows: [] };
    }
    let maxScore = 0;
    for (const w of windows) {
        if (w.cumulativeScore > maxScore) {
            maxScore = w.cumulativeScore;
        }
    }
    return { cls: maxScore, sessionWindows: windows };
}
// ————————————————————————————————————————————
// Кастомная метрика
// ————————————————————————————————————————————
/**
 * Вычисляет амплитуду смещения для одного source:
 * Евклидово расстояние между центрами previousRect и currentRect,
 * нормализованное к диагонали viewport (для безразмерности).
 *
 * Если rect-ы не заполнены (нулевые), возвращает 0.
 */
function computeAmplitude(prev, curr, viewportWidth = 1920, viewportHeight = 1080) {
    if (prev.width === 0 && prev.height === 0 && curr.width === 0 && curr.height === 0) {
        return 0;
    }
    const prevCx = prev.x + prev.width / 2;
    const prevCy = prev.y + prev.height / 2;
    const currCx = curr.x + curr.width / 2;
    const currCy = curr.y + curr.height / 2;
    const dx = currCx - prevCx;
    const dy = currCy - prevCy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const diagonal = Math.sqrt(viewportWidth * viewportWidth + viewportHeight * viewportHeight);
    return diagonal > 0 ? distance / diagonal : 0;
}
/**
 * Вычисляет среднюю амплитуду смещения для одного entry.
 */
function entryAmplitude(entry) {
    if (!entry.sources || entry.sources.length === 0)
        return 0;
    let totalAmp = 0;
    for (const src of entry.sources) {
        totalAmp += computeAmplitude(src.previousRect, src.currentRect);
    }
    return totalAmp / entry.sources.length;
}
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
function calculateCustomMetric(entries, options = {}) {
    const sessionGap = options.sessionGap ?? DEFAULT_SESSION_GAP;
    const sessionMaxDuration = options.sessionMaxDuration ?? DEFAULT_SESSION_MAX;
    const amplitudeWeight = options.amplitudeWeight ?? 0.5;
    const windows = buildSessionWindows(entries, sessionGap, sessionMaxDuration);
    if (windows.length === 0)
        return 0;
    let maxScore = 0;
    for (const w of windows) {
        let windowScore = 0;
        for (const entry of w.entries) {
            const amp = entryAmplitude(entry);
            windowScore += entry.value * (1 + amplitudeWeight * amp);
        }
        if (windowScore > maxScore) {
            maxScore = windowScore;
        }
    }
    return maxScore;
}
//# sourceMappingURL=metrics.js.map