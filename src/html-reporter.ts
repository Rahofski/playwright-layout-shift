// ============================================================
// html-reporter.ts — Генерация self-contained HTML-отчёта
// с тепловой картой, timeline и per-element breakdown
// ============================================================

import type {
  StabilityReport,
  HtmlReportOptions,
  SessionWindow,
  LayoutShiftEntry,
  ShiftRect,
} from './types';
import type { ElementBreakdown } from './breakdown';
import { buildElementBreakdown } from './breakdown';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_TITLE = 'Visual Stability Report';
const DEFAULT_VP_WIDTH = 1920;
const DEFAULT_VP_HEIGHT = 1080;
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clsRating(cls: number): { label: string; color: string } {
  if (cls <= 0.1) return { label: 'Good', color: '#0cce6b' };
  if (cls <= 0.25) return { label: 'Needs Improvement', color: '#ffa400' };
  return { label: 'Poor', color: '#ff4e42' };
}

function heatColor(intensity: number): string {
  const clamped = Math.min(1, Math.max(0, intensity));
  const r = 255;
  const g = Math.round(60 * (1 - clamped));
  const b = Math.round(60 * (1 - clamped));
  const a = 0.15 + 0.55 * clamped;
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

// ————————————————————————————————————————————
// SVG Heatmap
// ————————————————————————————————————————————

function renderHeatmapSvg(
  entries: LayoutShiftEntry[],
  vpWidth: number,
  vpHeight: number,
): string {
  let maxValue = 0;
  for (const e of entries) {
    if (e.value > maxValue) maxValue = e.value;
  }
  if (maxValue === 0) maxValue = 1;

  const rects: string[] = [];
  for (const entry of entries) {
    const intensity = entry.value / maxValue;
    for (const src of entry.sources) {
      const prev = src.previousRect;
      const curr = src.currentRect;

      // previousRect — серый контур
      rects.push(
        `<rect x="${prev.x}" y="${prev.y}" width="${prev.width}" height="${prev.height}" ` +
        `fill="none" stroke="#999" stroke-width="1" stroke-dasharray="4 2" opacity="0.6"/>`,
      );

      rects.push(
        `<rect x="${curr.x}" y="${curr.y}" width="${curr.width}" height="${curr.height}" ` +
        `fill="${heatColor(intensity)}" stroke="${heatColor(intensity)}" stroke-width="1"/>`,
      );

      const px = prev.x + prev.width / 2;
      const py = prev.y + prev.height / 2;
      const cx = curr.x + curr.width / 2;
      const cy = curr.y + curr.height / 2;
      rects.push(
        `<line x1="${px}" y1="${py}" x2="${cx}" y2="${cy}" ` +
        `stroke="#ff4e42" stroke-width="2" marker-end="url(#arrowhead)" opacity="0.7"/>`,
      );
    }
  }

  return `<svg viewBox="0 0 ${vpWidth} ${vpHeight}" class="heatmap-svg" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#ff4e42" opacity="0.7"/>
    </marker>
  </defs>
  <rect width="${vpWidth}" height="${vpHeight}" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
  ${rects.join('\n  ')}
</svg>`;
}
function renderTimelineSvg(
  sessionWindows: SessionWindow[],
  scenarioDuration: number,
): string {
  const width = 800;
  const height = 120;
  const padding = 40;
  const trackY = 50;
  const trackH = 30;

  if (scenarioDuration === 0) {
    return `<svg viewBox="0 0 ${width} ${height}" class="timeline-svg"><text x="400" y="60" text-anchor="middle" fill="#666">No data</text></svg>`;
  }

  const scale = (t: number) => padding + (t / scenarioDuration) * (width - 2 * padding);
  const elements: string[] = [];

  elements.push(
    `<line x1="${padding}" y1="${trackY + trackH + 10}" x2="${width - padding}" y2="${trackY + trackH + 10}" stroke="#ccc" stroke-width="1"/>`,
    `<text x="${padding}" y="${trackY + trackH + 25}" font-size="11" fill="#888">0ms</text>`,
    `<text x="${width - padding}" y="${trackY + trackH + 25}" font-size="11" fill="#888" text-anchor="end">${scenarioDuration.toFixed(0)}ms</text>`,
  );

  for (let i = 0; i < sessionWindows.length; i++) {
    const w = sessionWindows[i];
    const x1 = scale(w.startTime);
    const x2 = Math.max(scale(w.endTime), x1 + 4); // минимальная ширина 4px
    const winWidth = x2 - x1;
    const rating = clsRating(w.cumulativeScore);

    elements.push(
      `<rect x="${x1}" y="${trackY}" width="${winWidth}" height="${trackH}" fill="${rating.color}" opacity="0.3" rx="3"/>`,
      `<rect x="${x1}" y="${trackY}" width="${winWidth}" height="${trackH}" fill="none" stroke="${rating.color}" stroke-width="1.5" rx="3"/>`,
    );

    for (const entry of w.entries) {
      const ex = scale(entry.startTime);
      const barH = Math.max(4, (entry.value / 0.25) * trackH);
      elements.push(
        `<rect x="${ex - 1.5}" y="${trackY + trackH - barH}" width="3" height="${barH}" fill="${rating.color}" opacity="0.8" rx="1"/>`,
      );
    }

    elements.push(
      `<text x="${(x1 + x2) / 2}" y="${trackY - 6}" font-size="10" text-anchor="middle" fill="#555">W${i + 1}: ${w.cumulativeScore.toFixed(4)}</text>`,
    );
  }

  return `<svg viewBox="0 0 ${width} ${height}" class="timeline-svg" xmlns="http://www.w3.org/2000/svg">
  ${elements.join('\n  ')}
</svg>`;
}

// ————————————————————————————————————————————
// Breakdown table
// ————————————————————————————————————————————

function renderBreakdownTable(breakdowns: ElementBreakdown[]): string {
  if (breakdowns.length === 0) {
    return '<p class="empty">No shifted elements detected.</p>';
  }

  const rows = breakdowns.map((b, i) => {
    const pct = breakdowns[0].totalValue > 0
      ? ((b.totalValue / breakdowns.reduce((s, x) => s + x.totalValue, 0)) * 100).toFixed(1)
      : '0';
    return `<tr>
      <td>${i + 1}</td>
      <td class="selector"><code>${escapeHtml(b.selector)}</code></td>
      <td>${b.shiftCount}</td>
      <td>${b.totalValue.toFixed(4)}</td>
      <td>${pct}%</td>
      <td>${b.meanAmplitude.toFixed(4)}</td>
      <td>${b.maxAmplitude.toFixed(4)}</td>
    </tr>`;
  }).join('\n');

  return `<table class="breakdown-table">
  <thead>
    <tr>
      <th>#</th>
      <th>Selector</th>
      <th>Shifts</th>
      <th>Total Value</th>
      <th>Contribution</th>
      <th>Mean Amplitude</th>
      <th>Max Amplitude</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

// ————————————————————————————————————————————
// Entries detail table
// ————————————————————————————————————————————

function renderEntriesTable(entries: LayoutShiftEntry[]): string {
  if (entries.length === 0) {
    return '<p class="empty">No layout shift entries.</p>';
  }

  const rows = entries.map((e, i) => {
    const selectors = e.sources.map(s => escapeHtml(s.selector || '(unknown)')).join(', ');
    return `<tr>
      <td>${i + 1}</td>
      <td>${e.startTime.toFixed(1)}ms</td>
      <td>${e.value.toFixed(4)}</td>
      <td>${e.hadRecentInput ? 'Yes' : 'No'}</td>
      <td>${e.sources.length}</td>
      <td class="selector"><code>${selectors}</code></td>
    </tr>`;
  }).join('\n');

  return `<table class="entries-table">
  <thead>
    <tr>
      <th>#</th>
      <th>Time</th>
      <th>Value</th>
      <th>Input-driven</th>
      <th>Sources</th>
      <th>Selectors</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

// ————————————————————————————————————————————
// CSS (inline)
// ————————————————————————————————————————————

const REPORT_CSS = `
:root {
  --bg: #ffffff;
  --bg-card: #f8f9fa;
  --border: #dee2e6;
  --text: #212529;
  --text-muted: #6c757d;
  --good: #0cce6b;
  --warn: #ffa400;
  --poor: #ff4e42;
  --accent: #4361ee;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  font-size: 1.8rem;
  margin-bottom: 4px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 24px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.card .label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.card .value {
  font-size: 1.6rem;
  font-weight: 700;
}

.card .badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 4px;
  color: #fff;
}

section {
  margin-bottom: 32px;
}

section h2 {
  font-size: 1.2rem;
  margin-bottom: 12px;
  border-bottom: 2px solid var(--accent);
  padding-bottom: 4px;
  display: inline-block;
}

.heatmap-container {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
}

.heatmap-svg {
  width: 100%;
  height: auto;
}

.timeline-container {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  padding: 8px;
  background: #fff;
}

.timeline-svg {
  width: 100%;
  height: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

thead th {
  background: var(--bg-card);
  border-bottom: 2px solid var(--border);
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}

tbody td {
  border-bottom: 1px solid var(--border);
  padding: 6px 12px;
}

tbody tr:hover {
  background: #f1f3f5;
}

td.selector {
  max-width: 350px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.82em;
  background: #e9ecef;
  padding: 1px 4px;
  border-radius: 3px;
}

.empty {
  color: var(--text-muted);
  font-style: italic;
  padding: 12px;
}

.legend {
  display: flex;
  gap: 16px;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--border);
}

footer {
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
}
`;

// ————————————————————————————————————————————
// Главная функция
// ————————————————————————————————————————————

/**
 * Генерирует self-contained HTML-строку отчёта из StabilityReport.
 *
 * Отчёт включает:
 *  — Summary-карточки (CLS, customScore, shift count, duration)
 *  — Тепловую карту shift-ов (SVG overlay по viewport)
 *  — Timeline session windows
 *  — Per-element breakdown таблицу
 *  — Таблицу всех layout-shift entries
 *
 * @param report — данные отчёта (из buildReport).
 * @param options — опции отображения.
 * @returns HTML-строка (self-contained, без внешних зависимостей).
 */
export function buildHtmlReport(
  report: StabilityReport,
  options: HtmlReportOptions = {},
): string {
  const title = options.title ?? DEFAULT_TITLE;
  const vpWidth = options.viewportWidth ?? DEFAULT_VP_WIDTH;
  const vpHeight = options.viewportHeight ?? DEFAULT_VP_HEIGHT;
  const showBreakdown = options.showBreakdown ?? true;
  const showTimeline = options.showTimeline ?? true;
  const showHeatmap = options.showHeatmap ?? true;

  const rating = clsRating(report.cls);
  const breakdowns = buildElementBreakdown(report.entries);

  // — Sections —

  const summarySection = `
<div class="cards">
  <div class="card">
    <div class="label">CLS</div>
    <div class="value" style="color: ${rating.color}">${report.cls.toFixed(4)}</div>
    <span class="badge" style="background: ${rating.color}">${rating.label}</span>
  </div>
  <div class="card">
    <div class="label">Custom Score</div>
    <div class="value">${report.customScore.toFixed(4)}</div>
  </div>
  <div class="card">
    <div class="label">Layout Shifts</div>
    <div class="value">${report.filteredShifts}</div>
    <div style="font-size:0.75rem;color:var(--text-muted)">${report.totalRawShifts} total (${report.totalRawShifts - report.filteredShifts} filtered)</div>
  </div>
  <div class="card">
    <div class="label">Session Windows</div>
    <div class="value">${report.sessionWindows.length}</div>
  </div>
  <div class="card">
    <div class="label">Duration</div>
    <div class="value">${report.scenarioDuration.toFixed(0)}<span style="font-size:0.8rem;font-weight:400">ms</span></div>
  </div>
</div>`;

  const heatmapSection = showHeatmap ? `
<section>
  <h2>Heatmap</h2>
  <div class="heatmap-container">
    ${renderHeatmapSvg(report.entries, vpWidth, vpHeight)}
  </div>
  <div class="legend">
    <div class="legend-item"><span class="legend-swatch" style="border:1px dashed #999;background:none"></span> Previous position</div>
    <div class="legend-item"><span class="legend-swatch" style="background:rgba(255,60,60,0.4)"></span> Current position (shift)</div>
    <div class="legend-item"><span class="legend-swatch" style="background:#ff4e42"></span> Direction arrow</div>
  </div>
</section>` : '';

  const timelineSection = showTimeline ? `
<section>
  <h2>Timeline</h2>
  <div class="timeline-container">
    ${renderTimelineSvg(report.sessionWindows, report.scenarioDuration)}
  </div>
</section>` : '';

  const breakdownSection = showBreakdown ? `
<section>
  <h2>Per-Element Breakdown</h2>
  ${renderBreakdownTable(breakdowns)}
</section>` : '';

  const entriesSection = `
<section>
  <h2>All Entries</h2>
  ${renderEntriesTable(report.entries)}
</section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${REPORT_CSS}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">
    URL: <strong>${escapeHtml(report.url)}</strong> &middot;
    Generated: ${escapeHtml(report.timestamp)}
  </div>

  ${summarySection}
  ${heatmapSection}
  ${timelineSection}
  ${breakdownSection}
  ${entriesSection}

  <footer>
    Generated by <strong>playwright-layout-shift</strong> &middot;
    Layout Instability API &middot; ${escapeHtml(new Date().toISOString())}
  </footer>
</body>
</html>`;
}

/**
 * Сохраняет HTML-отчёт в файл.
 *
 * @param html — HTML-строка (из buildHtmlReport).
 * @param filePath — путь к файлу.
 */
export function saveHtmlReport(html: string, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, html, 'utf-8');
}
