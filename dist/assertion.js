"use strict";
// ============================================================
// assertion.ts — Проверка порогов визуальной стабильности
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertVisualStability = assertVisualStability;
const types_1 = require("./types");
const DEFAULT_CLS_THRESHOLD = 0.1; // Google «good» threshold
/**
 * Проверяет результаты измерений по пороговым значениям.
 * Бросает VisualStabilityError если порог превышен.
 */
function assertVisualStability(result, options = {}) {
    const clsThreshold = options.clsThreshold ?? DEFAULT_CLS_THRESHOLD;
    const customThreshold = options.customScoreThreshold;
    const violations = [];
    if (result.cls > clsThreshold) {
        violations.push(`CLS ${result.cls.toFixed(4)} exceeds threshold ${clsThreshold}`);
    }
    if (customThreshold !== undefined && result.customScore > customThreshold) {
        violations.push(`Custom score ${result.customScore.toFixed(4)} exceeds threshold ${customThreshold}`);
    }
    if (violations.length > 0) {
        const message = [
            'Visual stability check failed:',
            ...violations.map((v) => `  - ${v}`),
            `Total layout shifts: ${result.filteredShifts}`,
            `Session windows: ${result.sessionWindows.length}`,
            `Scenario duration: ${result.scenarioDuration.toFixed(0)}ms`,
        ].join('\n');
        throw new types_1.VisualStabilityError(message, result, options);
    }
}
//# sourceMappingURL=assertion.js.map