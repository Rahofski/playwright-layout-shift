/**
 * Возвращает строку JS-кода для инжекта через page.evaluate / addInitScript.
 *
 * Код регистрирует PerformanceObserver на тип 'layout-shift' и складывает
 * сериализованные записи в window.__pls_entries.
 *
 * Техническое ограничение:
 *  — Layout Instability API доступен только в Chromium-based браузерах.
 *  — PerformanceObserver.supportedEntryTypes может не содержать 'layout-shift'
 *    в Firefox / WebKit → код просто не будет собирать ничего.
 *  — sources[].node не сериализуется (DOM-ссылка), вместо этого пытаемся
 *    получить CSS-селектор через best-effort функцию.
 */
export interface InjectionOptions {
    captureSources: boolean;
}
/**
 * Генерирует JS-строку для инжекта.
 * Использует IIFE чтобы не загрязнять глобальную область.
 */
export declare function getInjectionScript(options: InjectionOptions): string;
/**
 * JS-код для сбора результатов из страницы.
 * Возвращает объект { entries, rawCount }.
 */
export declare function getCollectScript(): string;
/**
 * JS-код для очистки собранных данных.
 */
export declare function getCleanupScript(): string;
//# sourceMappingURL=injection.d.ts.map