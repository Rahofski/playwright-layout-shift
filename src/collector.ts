import type { Page } from 'playwright';
import type { LayoutShiftEntry, MeasureOptions } from './types';
import { getInjectionScript, getCollectScript, getCleanupScript } from './injection';

interface CollectResult {
  entries: LayoutShiftEntry[];
  rawCount: number;
}

/**
 * Инициализирует PerformanceObserver на странице.
 * Должна вызываться ДО начала сценария (до навигаций / действий).
 *
 * Рекомендуется использовать addInitScript для перехвата shift-ов,
 * которые могут произойти во время загрузки страницы.
 */
export async function injectObserver(page: Page, options: MeasureOptions): Promise<void> {
  const script = getInjectionScript({
    captureSources: options.captureSources ?? true,
  });

  await page.addInitScript(script);

  await page.evaluate(script);
}

/**
 * Собирает все layout-shift entries со страницы.
 * Фильтрует hadRecentInput по опциям.
 */
export async function collectEntries(
  page: Page,
  options: MeasureOptions
): Promise<{ entries: LayoutShiftEntry[]; rawCount: number }> {
  const collectScript = getCollectScript();
  const raw: CollectResult = await page.evaluate(collectScript);

  const includeInputDriven = options.includeInputDriven ?? false;

  const filtered = raw.entries.filter((entry: LayoutShiftEntry) => {
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
export async function cleanupObserver(page: Page): Promise<void> {
  const cleanupScript = getCleanupScript();
  await page.evaluate(cleanupScript).catch(() => {
    // Страница могла быть закрыта — игнорируем
  });
}
