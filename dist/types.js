"use strict";
// ============================================================
// types.ts — Все интерфейсы и типы пакета
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualStabilityError = void 0;
/**
 * Ошибка визуальной нестабильности (бросается assertVisualStability).
 */
class VisualStabilityError extends Error {
    constructor(message, result, thresholds) {
        super(message);
        this.name = 'VisualStabilityError';
        this.result = result;
        this.thresholds = thresholds;
    }
}
exports.VisualStabilityError = VisualStabilityError;
//# sourceMappingURL=types.js.map