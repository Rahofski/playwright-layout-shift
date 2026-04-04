"use strict";
// ============================================================
// injection.ts — Код, инжектируемый в браузерную страницу
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInjectionScript = getInjectionScript;
exports.getCollectScript = getCollectScript;
exports.getCleanupScript = getCleanupScript;
/**
 * Генерирует JS-строку для инжекта.
 * Использует IIFE чтобы не загрязнять глобальную область.
 */
function getInjectionScript(options) {
    const captureSources = options.captureSources;
    const sourceHelpers = `
  function bestEffortSelector(node) {
    if (!node || !node.tagName) return '';
    try {
      if (node.id) return '#' + CSS.escape(node.id);
      var parts = [];
      var current = node;
      while (current && current.tagName) {
        var tag = current.tagName.toLowerCase();
        if (current.id) {
          parts.unshift('#' + CSS.escape(current.id));
          break;
        }
        var parent = current.parentElement;
        if (parent) {
          var siblings = Array.from(parent.children).filter(function(c) {
            return c.tagName === current.tagName;
          });
          if (siblings.length > 1) {
            var idx = siblings.indexOf(current) + 1;
            tag += ':nth-of-type(' + idx + ')';
          }
        }
        parts.unshift(tag);
        current = parent;
      }
      return parts.join(' > ');
    } catch(e) {
      return '';
    }
  }

  function serializeRect(rect) {
    if (!rect) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  }
`;
    const sourceCapture = `
        if (entry.sources) {
          for (var j = 0; j < entry.sources.length; j++) {
            var src = entry.sources[j];
            sources.push({
              selector: bestEffortSelector(src.node),
              previousRect: serializeRect(src.previousRect),
              currentRect: serializeRect(src.currentRect)
            });
          }
        }
`;
    // Весь код оформлен как строка — он будет передан в page.evaluate / addInitScript.
    return `
(function() {
  if (window.__pls_entries) return; // уже инициализировано

  window.__pls_entries = [];
  window.__pls_raw_count = 0;
${captureSources ? sourceHelpers : ''}
  try {
    var observer = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        window.__pls_raw_count++;

        var sources = [];
${captureSources ? sourceCapture : ''}
        window.__pls_entries.push({
          startTime: entry.startTime,
          value: entry.value,
          hadRecentInput: entry.hadRecentInput,
          sources: sources
        });
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });
    window.__pls_observer = observer;
  } catch(e) {
    // Layout Instability API не поддерживается (Firefox / WebKit)
    console.warn('[playwright-layout-shift] Layout Instability API not available:', e.message);
  }
})();
`;
}
/**
 * JS-код для сбора результатов из страницы.
 * Возвращает объект { entries, rawCount }.
 */
function getCollectScript() {
    return `
(function() {
  return {
    entries: window.__pls_entries || [],
    rawCount: window.__pls_raw_count || 0
  };
})();
`;
}
/**
 * JS-код для очистки собранных данных.
 */
function getCleanupScript() {
    return `
(function() {
  if (window.__pls_observer) {
    window.__pls_observer.disconnect();
  }
  window.__pls_entries = [];
  window.__pls_raw_count = 0;
  delete window.__pls_observer;
})();
`;
}
//# sourceMappingURL=injection.js.map