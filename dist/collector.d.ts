import type { Page } from 'playwright';
import type { LayoutShiftEntry, MeasureOptions } from './types';
/**
 * Инициализирует PerformanceObserver на странице.
 * Должна вызываться ДО начала сценария (до навигаций / действий).
 *
 * Рекомендуется использовать addInitScript для перехвата shift-ов,
 * которые могут произойти во время загрузки страницы.
 */
export declare function injectObserver(page: Page, options: MeasureOptions): Promise<void>;
/**
 * Собирает все layout-shift entries со страницы.
 * Фильтрует hadRecentInput по опциям.
 */
export declare function collectEntries(page: Page, options: MeasureOptions): Promise<{
    entries: LayoutShiftEntry[];
    rawCount: number;
}>;
/**
 * Отключает observer и очищает данные на странице.
 */
export declare function cleanupObserver(page: Page): Promise<void>;
//# sourceMappingURL=collector.d.ts.map