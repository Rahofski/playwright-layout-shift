import type { LayoutShiftEntry, ShiftRect } from './types';
/**
 * Статистика одного элемента (CSS-селектор).
 */
export interface ElementBreakdown {
    /** CSS-селектор элемента */
    selector: string;
    /** Сколько раз элемент сместился */
    shiftCount: number;
    /** Суммарный вклад в CLS (сумма entry.value, поделённых по sources) */
    totalValue: number;
    /** Средняя амплитуда смещения (нормализованная к viewport) */
    meanAmplitude: number;
    /** Максимальная амплитуда смещения */
    maxAmplitude: number;
    /** Первый и последний rect элемента (для визуализации) */
    firstRect: ShiftRect;
    lastRect: ShiftRect;
    /** Все прямоугольники (previousRect → currentRect) для тепловой карты */
    rects: Array<{
        previous: ShiftRect;
        current: ShiftRect;
    }>;
}
/**
 * Агрегирует layout-shift entries по CSS-селекторам.
 *
 * Каждый entry может содержать до 5 sources (ограничение спецификации).
 * Вклад entry.value распределяется поровну между его sources.
 *
 * @param entries — отфильтрованные layout-shift записи.
 * @returns Массив ElementBreakdown, отсортированный по totalValue (убывание).
 */
export declare function buildElementBreakdown(entries: LayoutShiftEntry[]): ElementBreakdown[];
//# sourceMappingURL=breakdown.d.ts.map