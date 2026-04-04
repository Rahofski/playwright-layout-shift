"use strict";
// ============================================================
// collector.ts — Сбор layout-shift entries через page.evaluate
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectObserver = injectObserver;
exports.collectEntries = collectEntries;
exports.cleanupObserver = cleanupObserver;
const injection_1 = require("./injection");
/**
 * Инициализирует PerformanceObserver на странице.
 * Должна вызываться ДО начала сценария (до навигаций / действий).
 *
 * Рекомендуется использовать addInitScript для перехвата shift-ов,
 * которые могут произойти во время загрузки страницы.
 */
async function injectObserver(page, options) {
    const script = (0, injection_1.getInjectionScript)({
        captureSources: options.captureSources ?? true,
    });
    // addInitScript выполняется при каждой навигации,
    // поэтому observer будет работать даже при page.goto() внутри сценария.
    await page.addInitScript(script);
    // Также выполняем сразу на текущей странице (если уже загружена).
    await page.evaluate(script);
}
/**
 * Собирает все layout-shift entries со страницы.
 * Фильтрует hadRecentInput по опциям.
 */
async function collectEntries(page, options) {
    const collectScript = (0, injection_1.getCollectScript)();
    const raw = await page.evaluate(collectScript);
    const includeInputDriven = options.includeInputDriven ?? false;
    const filtered = raw.entries.filter((entry) => {
        if (!includeInputDriven && entry.hadRecentInput) {
            return false;
        }
        return true;
    });
    return {
        entries: filtered,
        rawCount: raw.rawCount,
    };
}
/**
 * Отключает observer и очищает данные на странице.
 */
async function cleanupObserver(page) {
    const cleanupScript = (0, injection_1.getCleanupScript)();
    await page.evaluate(cleanupScript).catch(() => {
        // Страница могла быть закрыта — игнорируем
    });
}
//# sourceMappingURL=collector.js.map