import type { Page } from 'playwright';
/**
 * Прямоугольник элемента (аналог DOMRectReadOnly из Layout Instability API).
 */
export interface ShiftRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Источник layout-shift — один сместившийся DOM-узел.
 * previousRect / currentRect доступны только в Chromium ≥ 92.
 */
export interface LayoutShiftSource {
    /** CSS-селектор узла (best-effort, может быть пустым) */
    selector: string;
    previousRect: ShiftRect;
    currentRect: ShiftRect;
}
/**
 * Одна запись layout-shift, сериализованная из PerformanceObserver entry.
 */
export interface LayoutShiftEntry {
    /** Метка времени в миллисекундах от начала навигации (performance.timeOrigin) */
    startTime: number;
    /** Безразмерная оценка сдвига (impact fraction × distance fraction) */
    value: number;
    /** true если сдвиг случился в пределах 500ms после user input */
    hadRecentInput: boolean;
    /** Сместившиеся узлы (до 5 штук, Chromium-only) */
    sources: LayoutShiftSource[];
}
/**
 * Опции для measureVisualStability.
 */
export interface MeasureOptions {
    /** Таймаут ожидания финализации после сценария (ms). По умолчанию 1000. */
    settleTimeout?: number;
    /** Включать ли сдвиги с hadRecentInput = true. По умолчанию false. */
    includeInputDriven?: boolean;
    /** Записывать ли sources (previousRect/currentRect). По умолчанию true. */
    captureSources?: boolean;
}
/**
 * Опции кастомной метрики.
 */
export interface CustomMetricOptions {
    /**
     * Максимальный промежуток между shift-ами (ms), при котором они считаются
     * одним «кластером». По умолчанию 1000 (аналогично CLS session window).
     */
    sessionGap?: number;
    /**
     * Максимальная длительность одного session window (ms).
     * По умолчанию 5000.
     */
    sessionMaxDuration?: number;
    /**
     * Весовой коэффициент для амплитуды смещения (0..1). По умолчанию 0.5.
     * При 0 амплитуда не учитывается, при 1 — влияет наравне с value.
     */
    amplitudeWeight?: number;
}
/**
 * Результат session-window группировки.
 */
export interface SessionWindow {
    startTime: number;
    endTime: number;
    entries: LayoutShiftEntry[];
    /** Сумма value всех entries в окне */
    cumulativeScore: number;
}
/**
 * Результаты измерений (возвращается measureVisualStability).
 */
export interface StabilityResult {
    /** Все собранные layout-shift entries (после фильтрации) */
    entries: LayoutShiftEntry[];
    /** CLS по определению Google (наибольшее session window) */
    cls: number;
    /** Кастомная метрика (weighted + amplitude) */
    customScore: number;
    /** Session windows, найденные при расчёте CLS */
    sessionWindows: SessionWindow[];
    /** Общее число shift-событий (до фильтрации) */
    totalRawShifts: number;
    /** Число shift-событий после фильтрации hadRecentInput */
    filteredShifts: number;
    /** Длительность сценария (ms) */
    scenarioDuration: number;
}
/**
 * Опции для assertVisualStability.
 */
export interface AssertionOptions {
    /** Порог для CLS. По умолчанию 0.1 (Google «good»). */
    clsThreshold?: number;
    /** Порог для кастомной метрики. По умолчанию undefined — не проверяется. */
    customScoreThreshold?: number;
}
/**
 * Ошибка визуальной нестабильности (бросается assertVisualStability).
 */
export declare class VisualStabilityError extends Error {
    readonly result: StabilityResult;
    readonly thresholds: AssertionOptions;
    constructor(message: string, result: StabilityResult, thresholds: AssertionOptions);
}
/**
 * Тип сценарной функции — то, что пользователь выполняет на странице.
 */
export type ScenarioFn = (page: Page) => Promise<void>;
/**
 * Структура JSON-отчёта.
 */
export interface StabilityReport {
    timestamp: string;
    url: string;
    scenarioDuration: number;
    cls: number;
    customScore: number;
    totalRawShifts: number;
    filteredShifts: number;
    sessionWindows: SessionWindow[];
    entries: LayoutShiftEntry[];
}
/**
 * Опции генерации HTML-отчёта.
 */
export interface HtmlReportOptions {
    /** Заголовок страницы. По умолчанию «Visual Stability Report». */
    title?: string;
    /** Ширина viewport для тепловой карты (px). По умолчанию 1920. */
    viewportWidth?: number;
    /** Высота viewport для тепловой карты (px). По умолчанию 1080. */
    viewportHeight?: number;
    /** Показывать per-element breakdown таблицу. По умолчанию true. */
    showBreakdown?: boolean;
    /** Показывать timeline session windows. По умолчанию true. */
    showTimeline?: boolean;
    /** Показывать тепловую карту shift-ов. По умолчанию true. */
    showHeatmap?: boolean;
}
//# sourceMappingURL=types.d.ts.map