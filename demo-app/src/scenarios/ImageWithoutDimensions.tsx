/**
 * Сценарий 2: Изображения без заданных размеров.
 *
 * Имитирует загрузку изображений без width/height.
 * Когда картинка «загружается» (через setTimeout), она раздвигает
 * контент вниз. Без резервирования места это вызывает layout shift.
 *
 * В реальности — это одна из самых распространённых причин плохого CLS.
 */
import { useState, useEffect } from 'react';

interface LazyImage {
  loaded: boolean;
  height: number;
  color: string;
  label: string;
}

export default function ImageWithoutDimensions() {
  const [images, setImages] = useState<LazyImage[]>([
    { loaded: false, height: 200, color: '#4361ee', label: 'Hero Banner (200px)' },
    { loaded: false, height: 150, color: '#7209b7', label: 'Product Image (150px)' },
    { loaded: false, height: 120, color: '#f72585', label: 'Promo Image (120px)' },
  ]);

  useEffect(() => {
    // Картинки «загружаются» с разными задержками — каскад shift-ов
    const timers = images.map((_, idx) =>
      setTimeout(() => {
        setImages(prev => prev.map((img, i) =>
          i === idx ? { ...img, loaded: true } : img
        ));
      }, 300 + idx * 400) // 300ms, 700ms, 1100ms
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="scenario">
      <h2>Сценарий: Изображения без размеров</h2>
      <p className="description">
        Три изображения загружаются последовательно (300ms, 700ms, 1100ms).
        Поскольку размеры не зарезервированы, каждая загрузка вызывает layout shift.
      </p>

      <div style={{ maxWidth: 800 }}>
        {images.map((img, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            {/* БЕЗ width/height — это причина shift */}
            {img.loaded ? (
              <div style={{
                width: '100%',
                height: img.height,
                background: img.color,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 18,
                fontWeight: 600,
              }}>
                {img.label}
              </div>
            ) : (
              /* Пустое место — 0 высоты до загрузки */
              <div style={{ width: '100%', height: 0 }} />
            )}
          </div>
        ))}

        <div className="content-block" style={{
          background: '#f8f9fa',
          padding: 20,
          borderRadius: 8,
        }}>
          <h3>Текст под картинками</h3>
          <p>Этот текст будет сдвигаться вниз с каждой загруженной картинкой.
          В итоге — три последовательных layout shift-а.</p>
          <p>Для предотвращения: используйте CSS <code>aspect-ratio</code> или
          задайте <code>width</code>/<code>height</code> на элементах <code>&lt;img&gt;</code>.</p>
        </div>
      </div>
    </div>
  );
}
