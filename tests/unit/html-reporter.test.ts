// ============================================================
// tests/unit/html-reporter.test.ts — Unit-тесты HTML-репортера
// ============================================================

import { describe, it, expect } from 'vitest';
import { buildHtmlReport } from '../../src/html-reporter';
import type { StabilityReport } from '../../src/types';

function makeSampleReport(overrides: Partial<StabilityReport> = {}): StabilityReport {
  return {
    timestamp: '2026-04-01T12:00:00.000Z',
    url: 'https://example.com',
    scenarioDuration: 1500,
    cls: 0.15,
    customScore: 0.2,
    totalRawShifts: 5,
    filteredShifts: 3,
    sessionWindows: [
      {
        startTime: 100,
        endTime: 500,
        cumulativeScore: 0.05,
        entries: [
          {
            startTime: 100,
            value: 0.02,
            hadRecentInput: false,
            sources: [
              {
                selector: '#header',
                previousRect: { x: 0, y: 0, width: 800, height: 60 },
                currentRect: { x: 0, y: 100, width: 800, height: 60 },
              },
            ],
          },
          {
            startTime: 500,
            value: 0.03,
            hadRecentInput: false,
            sources: [
              {
                selector: 'body > div:nth-of-type(1)',
                previousRect: { x: 0, y: 60, width: 800, height: 200 },
                currentRect: { x: 0, y: 160, width: 800, height: 200 },
              },
            ],
          },
        ],
      },
      {
        startTime: 3000,
        endTime: 3000,
        cumulativeScore: 0.15,
        entries: [
          {
            startTime: 3000,
            value: 0.15,
            hadRecentInput: false,
            sources: [
              {
                selector: '#content',
                previousRect: { x: 0, y: 0, width: 1200, height: 600 },
                currentRect: { x: 0, y: 300, width: 1200, height: 600 },
              },
            ],
          },
        ],
      },
    ],
    entries: [
      {
        startTime: 100,
        value: 0.02,
        hadRecentInput: false,
        sources: [
          {
            selector: '#header',
            previousRect: { x: 0, y: 0, width: 800, height: 60 },
            currentRect: { x: 0, y: 100, width: 800, height: 60 },
          },
        ],
      },
      {
        startTime: 500,
        value: 0.03,
        hadRecentInput: false,
        sources: [
          {
            selector: 'body > div:nth-of-type(1)',
            previousRect: { x: 0, y: 60, width: 800, height: 200 },
            currentRect: { x: 0, y: 160, width: 800, height: 200 },
          },
        ],
      },
      {
        startTime: 3000,
        value: 0.15,
        hadRecentInput: false,
        sources: [
          {
            selector: '#content',
            previousRect: { x: 0, y: 0, width: 1200, height: 600 },
            currentRect: { x: 0, y: 300, width: 1200, height: 600 },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('buildHtmlReport', () => {
  it('generates valid HTML document', () => {
    const html = buildHtmlReport(makeSampleReport());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<title>Visual Stability Report</title>');
  });

  it('includes CLS value and rating', () => {
    const html = buildHtmlReport(makeSampleReport({ cls: 0.15 }));
    expect(html).toContain('0.1500');
    expect(html).toContain('Needs Improvement');
  });

  it('shows Good rating for low CLS', () => {
    const html = buildHtmlReport(makeSampleReport({ cls: 0.05 }));
    expect(html).toContain('0.0500');
    expect(html).toContain('Good');
  });

  it('shows Poor rating for high CLS', () => {
    const html = buildHtmlReport(makeSampleReport({ cls: 0.3 }));
    expect(html).toContain('Poor');
  });

  it('includes URL in subtitle', () => {
    const html = buildHtmlReport(makeSampleReport({ url: 'https://test.dev' }));
    expect(html).toContain('https://test.dev');
  });

  it('includes custom title', () => {
    const html = buildHtmlReport(makeSampleReport(), { title: 'My Report' });
    expect(html).toContain('<title>My Report</title>');
    expect(html).toContain('My Report');
  });

  it('includes heatmap SVG', () => {
    const html = buildHtmlReport(makeSampleReport());
    expect(html).toContain('class="heatmap-svg"');
    expect(html).toContain('viewBox="0 0 1920 1080"');
  });

  it('includes timeline SVG', () => {
    const html = buildHtmlReport(makeSampleReport());
    expect(html).toContain('class="timeline-svg"');
  });

  it('includes per-element breakdown table', () => {
    const html = buildHtmlReport(makeSampleReport());
    expect(html).toContain('Per-Element Breakdown');
    expect(html).toContain('#header');
    expect(html).toContain('#content');
  });

  it('includes entries table', () => {
    const html = buildHtmlReport(makeSampleReport());
    expect(html).toContain('All Entries');
    expect(html).toContain('100.0ms');
    expect(html).toContain('0.0200');
  });

  it('can disable heatmap', () => {
    const html = buildHtmlReport(makeSampleReport(), { showHeatmap: false });
    expect(html).not.toContain('class="heatmap-svg"');
  });

  it('can disable timeline', () => {
    const html = buildHtmlReport(makeSampleReport(), { showTimeline: false });
    expect(html).not.toContain('class="timeline-svg"');
  });

  it('can disable breakdown', () => {
    const html = buildHtmlReport(makeSampleReport(), { showBreakdown: false });
    expect(html).not.toContain('Per-Element Breakdown');
  });

  it('handles empty entries', () => {
    const html = buildHtmlReport(makeSampleReport({
      entries: [],
      sessionWindows: [],
      filteredShifts: 0,
    }));
    expect(html).toContain('No layout shift entries');
    expect(html).toContain('No shifted elements detected');
  });

  it('escapes HTML in URL', () => {
    const html = buildHtmlReport(makeSampleReport({ url: 'https://example.com/<script>' }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('uses custom viewport dimensions for heatmap', () => {
    const html = buildHtmlReport(makeSampleReport(), {
      viewportWidth: 1280,
      viewportHeight: 720,
    });
    expect(html).toContain('viewBox="0 0 1280 720"');
  });

  it('is self-contained (no external references)', () => {
    const html = buildHtmlReport(makeSampleReport());
    expect(html).not.toMatch(/href="https?:\/\//);
    expect(html).not.toMatch(/src="https?:\/\//);
    expect(html).toContain('<style>');
  });
});
