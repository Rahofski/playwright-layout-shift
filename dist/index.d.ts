export type { ShiftRect, LayoutShiftSource, LayoutShiftEntry, MeasureOptions, CustomMetricOptions, SessionWindow, StabilityResult, AssertionOptions, ScenarioFn, StabilityReport, HtmlReportOptions, } from './types';
export { VisualStabilityError } from './types';
export { measureVisualStability } from './measure';
export { calculateCLS, calculateCustomMetric, buildSessionWindows, computeAmplitude, entryAmplitude, } from './metrics';
export { assertVisualStability } from './assertion';
export { buildReport, saveReport } from './reporter';
export { buildHtmlReport, saveHtmlReport } from './html-reporter';
export { buildElementBreakdown } from './breakdown';
export type { ElementBreakdown } from './breakdown';
export { injectObserver, collectEntries, cleanupObserver } from './collector';
//# sourceMappingURL=index.d.ts.map