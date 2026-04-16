"use strict";
// ============================================================
// index.ts — Публичный API пакета
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupObserver = exports.collectEntries = exports.injectObserver = exports.buildElementBreakdown = exports.saveHtmlReport = exports.buildHtmlReport = exports.saveReport = exports.buildReport = exports.assertVisualStability = exports.entryAmplitude = exports.computeAmplitude = exports.buildSessionWindows = exports.calculateCustomMetric = exports.calculateCLS = exports.measureVisualStability = exports.VisualStabilityError = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "VisualStabilityError", { enumerable: true, get: function () { return types_1.VisualStabilityError; } });
// Главный API
var measure_1 = require("./measure");
Object.defineProperty(exports, "measureVisualStability", { enumerable: true, get: function () { return measure_1.measureVisualStability; } });
var metrics_1 = require("./metrics");
Object.defineProperty(exports, "calculateCLS", { enumerable: true, get: function () { return metrics_1.calculateCLS; } });
Object.defineProperty(exports, "calculateCustomMetric", { enumerable: true, get: function () { return metrics_1.calculateCustomMetric; } });
Object.defineProperty(exports, "buildSessionWindows", { enumerable: true, get: function () { return metrics_1.buildSessionWindows; } });
Object.defineProperty(exports, "computeAmplitude", { enumerable: true, get: function () { return metrics_1.computeAmplitude; } });
Object.defineProperty(exports, "entryAmplitude", { enumerable: true, get: function () { return metrics_1.entryAmplitude; } });
var assertion_1 = require("./assertion");
Object.defineProperty(exports, "assertVisualStability", { enumerable: true, get: function () { return assertion_1.assertVisualStability; } });
var reporter_1 = require("./reporter");
Object.defineProperty(exports, "buildReport", { enumerable: true, get: function () { return reporter_1.buildReport; } });
Object.defineProperty(exports, "saveReport", { enumerable: true, get: function () { return reporter_1.saveReport; } });
var html_reporter_1 = require("./html-reporter");
Object.defineProperty(exports, "buildHtmlReport", { enumerable: true, get: function () { return html_reporter_1.buildHtmlReport; } });
Object.defineProperty(exports, "saveHtmlReport", { enumerable: true, get: function () { return html_reporter_1.saveHtmlReport; } });
var breakdown_1 = require("./breakdown");
Object.defineProperty(exports, "buildElementBreakdown", { enumerable: true, get: function () { return breakdown_1.buildElementBreakdown; } });
var collector_1 = require("./collector");
Object.defineProperty(exports, "injectObserver", { enumerable: true, get: function () { return collector_1.injectObserver; } });
Object.defineProperty(exports, "collectEntries", { enumerable: true, get: function () { return collector_1.collectEntries; } });
Object.defineProperty(exports, "cleanupObserver", { enumerable: true, get: function () { return collector_1.cleanupObserver; } });
//# sourceMappingURL=index.js.map