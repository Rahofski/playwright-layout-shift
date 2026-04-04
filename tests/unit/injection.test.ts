// ============================================================
// tests/unit/injection.test.ts — Unit-тесты генерации скриптов
// ============================================================

import { describe, it, expect } from 'vitest';
import { getInjectionScript, getCollectScript, getCleanupScript } from '../../src/injection';

describe('getInjectionScript', () => {
  it('returns a string containing PerformanceObserver', () => {
    const script = getInjectionScript({ captureSources: true });
    expect(script).toContain('PerformanceObserver');
    expect(script).toContain('layout-shift');
    expect(script).toContain('__pls_entries');
  });

  it('includes source capture code when captureSources=true', () => {
    const script = getInjectionScript({ captureSources: true });
    expect(script).toContain('previousRect');
    expect(script).toContain('bestEffortSelector');
  });

  it('excludes source capture code when captureSources=false', () => {
    const script = getInjectionScript({ captureSources: false });
    // Основной код PerformanceObserver должен быть
    expect(script).toContain('PerformanceObserver');
    // Код сбора sources не инлайнится
    expect(script).not.toContain('bestEffortSelector');
  });

  it('is a valid IIFE (starts and ends correctly)', () => {
    const script = getInjectionScript({ captureSources: true }).trim();
    expect(script.startsWith('(function()')).toBe(true);
    expect(script.endsWith('();')).toBe(true);
  });

  it('guards against double initialization', () => {
    const script = getInjectionScript({ captureSources: true });
    expect(script).toContain('if (window.__pls_entries) return');
  });
});

describe('getCollectScript', () => {
  it('returns script accessing __pls_entries', () => {
    const script = getCollectScript();
    expect(script).toContain('__pls_entries');
    expect(script).toContain('__pls_raw_count');
  });
});

describe('getCleanupScript', () => {
  it('disconnects observer and clears data', () => {
    const script = getCleanupScript();
    expect(script).toContain('disconnect');
    expect(script).toContain('delete');
  });
});
