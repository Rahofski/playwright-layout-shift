"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildElementBreakdown = buildElementBreakdown;
const metrics_1 = require("./metrics");
/**
 * Агрегирует layout-shift entries по CSS-селекторам.
 */
function buildElementBreakdown(entries) {
    const map = new Map();
    for (const entry of entries) {
        if (!entry.sources || entry.sources.length === 0)
            continue;
        // Распределяем value entry поровну между sources
        const valuePerSource = entry.value / entry.sources.length;
        for (const src of entry.sources) {
            const key = src.selector || '(unknown)';
            let agg = map.get(key);
            if (!agg) {
                agg = { shiftCount: 0, totalValue: 0, amplitudes: [], rects: [] };
                map.set(key, agg);
            }
            agg.shiftCount += 1;
            agg.totalValue += valuePerSource;
            const amp = (0, metrics_1.computeAmplitude)(src.previousRect, src.currentRect);
            agg.amplitudes.push(amp);
            agg.rects.push({ previous: src.previousRect, current: src.currentRect });
        }
    }
    const result = [];
    for (const [selector, agg] of map) {
        const meanAmp = agg.amplitudes.length > 0
            ? agg.amplitudes.reduce((a, b) => a + b, 0) / agg.amplitudes.length
            : 0;
        const maxAmp = agg.amplitudes.length > 0
            ? Math.max(...agg.amplitudes)
            : 0;
        result.push({
            selector,
            shiftCount: agg.shiftCount,
            totalValue: agg.totalValue,
            meanAmplitude: meanAmp,
            maxAmplitude: maxAmp,
            firstRect: agg.rects[0].previous,
            lastRect: agg.rects[agg.rects.length - 1].current,
            rects: agg.rects,
        });
    }
    result.sort((a, b) => b.totalValue - a.totalValue);
    return result;
}
//# sourceMappingURL=breakdown.js.map