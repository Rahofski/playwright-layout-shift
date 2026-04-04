/**
 * Сценарий 4: Font Swap (FOUT — Flash of Unstyled Text).
 *
 * Имитирует загрузку веб-шрифта, который отличается по метрикам
 * от fallback-шрифта. При переключении шрифта текст меняет размер,
 * что вызывает layout shift.
 *
 * Используется font-display: swap — текст виден сразу в fallback,
 * потом перерисовывается в загруженном шрифте.
 */
import { useState, useEffect } from 'react';

export default function FontSwapShift() {
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    // Имитируем загрузку шрифта через 800ms
    const timer = setTimeout(() => setFontLoaded(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Fallback: широкий шрифт (Courier New — моноширинный, занимает больше места)
  // Loaded: узкий шрифт (Arial — пропорциональный)
  // Разница в метриках вызовет reflow
  const fontFamily = fontLoaded
    ? '"Arial", "Helvetica Neue", sans-serif'
    : '"Courier New", Courier, monospace';

  const fontSize = fontLoaded ? 16 : 16; // тот же размер, но метрики шрифтов разные

  return (
    <div className="scenario">
      <h2>Сценарий: Font Swap (FOUT)</h2>
      <p className="description">
        Текст изначально рендерится моноширинным шрифтом (Courier New),
        через 800ms переключается на Arial. Разница в метриках шрифтов
        вызывает layout shift всего текстового контента.
      </p>

      <div style={{ maxWidth: 800 }}>
        <div style={{
          background: '#f8f9fa',
          padding: 20,
          borderRadius: 8,
          marginBottom: 16,
          fontFamily,
          fontSize,
          lineHeight: 1.6,
        }}>
          <h3 style={{ fontFamily, marginBottom: 12 }}>Заголовок статьи о веб-производительности</h3>
          <p>Cumulative Layout Shift (CLS) — это метрика, которая измеряет
          визуальную стабильность страницы. Она учитывает все неожиданные
          смещения видимых элементов в течение всей жизни страницы.</p>
          <p>Хороший показатель CLS — менее 0.1. Значения от 0.1 до 0.25
          требуют улучшения, а более 0.25 считаются плохими.</p>
          <p>Одна из частых причин плохого CLS — загрузка веб-шрифтов.
          Когда шрифт меняется с fallback на загруженный, строки текста
          могут менять высоту и ширину, вызывая перекомпоновку.</p>
        </div>

        <div style={{
          background: '#e9ecef',
          padding: 20,
          borderRadius: 8,
          fontFamily,
          fontSize,
          lineHeight: 1.6,
        }}>
          <h3 style={{ fontFamily, marginBottom: 12 }}>Как избежать FOUT?</h3>
          <ul style={{ paddingLeft: 20 }}>
            <li>Используйте <code>font-display: optional</code> для некритичных шрифтов</li>
            <li>Подбирайте fallback-шрифт с близкими метриками</li>
            <li>Используйте CSS <code>size-adjust</code> для компенсации</li>
            <li>Предзагружайте шрифты через <code>&lt;link rel="preload"&gt;</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
