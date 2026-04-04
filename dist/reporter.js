"use strict";
// ============================================================
// reporter.ts — Генерация JSON-отчёта
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReport = buildReport;
exports.saveReport = saveReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Формирует объект отчёта из результатов измерения.
 */
function buildReport(result, url) {
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
function saveReport(report, filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
}
//# sourceMappingURL=reporter.js.map