// ============================================================
// injection.ts — Код, инжектируемый в браузерную страницу
// ============================================================

/**
 * Возвращает строку JS-кода для инжекта через page.evaluate / addInitScript.
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
 * Сериализуемый прямоугольник (из DOMRectReadOnly).
 */
interface SerializableRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Генерирует JS-строку для инжекта.
 * Использует IIFE чтобы не загрязнять глобальную область.
 */
export function getInjectionScript(options: InjectionOptions): string {
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
export function getCollectScript(): string {
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
export function getCleanupScript(): string {
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
