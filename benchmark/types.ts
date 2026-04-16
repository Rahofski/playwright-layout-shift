// ============================================================
// benchmark/types.ts — Типы для бенчмарка
// ============================================================

/** Конфигурация одного сценария */
export interface ScenarioConfig {
  name: string;
  /** Тип теста: simple (один паттерн) или e2e (сложный) */
  type: 'simple' | 'e2e';
  /** URL-путь относительно baseURL */
  path: string;
  /** Время ожидания эффекта (ms) */
  waitFor: number;
  /** Селектор для ожидания (опционально) */
  waitSelector?: string;
}

/** Одно измерение (один прогон) */
export interface Sample {
  method: string;
  scenario: string;
  scenarioType: 'simple' | 'e2e';
  iteration: number;
  /** Время выполнения (ms) */
  executionTime: number;
  /** Изменение heap памяти (bytes) */
  memoryDelta: number;
  /** Пиковое потребление heap (bytes) */
  memoryPeak: number;
  /** CPU user time (μs) */
  cpuUser: number;
  /** CPU system time (μs) */
  cpuSystem: number;
  /** CLS значение */
  cls: number;
  /** Количество обнаруженных shift-ов */
  shiftsDetected: number;
  /** Доступна ли per-element детализация */
  hasBreakdown: boolean;
  /** Доступны ли source rects */
  hasSources: boolean;
}

/** Агрегированная статистика */
export interface AggregatedStats {
  method: string;
  scenario: string;
  scenarioType: 'simple' | 'e2e';
  n: number;
  executionTime: StatSummary;
  memoryDelta: StatSummary;
  memoryPeak: StatSummary;
  cpuUser: StatSummary;
  cpuSystem: StatSummary;
  cls: StatSummary;
  shiftsDetected: StatSummary;
  hasBreakdown: boolean;
  hasSources: boolean;
}

/** Статистические показатели одной метрики */
export interface StatSummary {
  mean: number;
  std: number;
  /** 95% доверительный интервал: [lower, upper] */
  ci95: [number, number];
  min: number;
  max: number;
  median: number;
}

/** Метод измерения */
export interface MeasureMethod {
  name: string;
  /** Запускает один прогон, возвращает частичный Sample */
  run: (page: import('playwright').Page, scenario: ScenarioConfig) => Promise<Omit<Sample, 'method' | 'scenario' | 'scenarioType' | 'iteration'>>;
}
