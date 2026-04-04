/**
 * Сценарий 5: Стабильная страница (контрольный пример).
 *
 * Всё сделано правильно:
 *  — Для изображений зарезервировано место (aspect-ratio / фиксированная высота)
 *  — Контент не вставляется динамически перед существующим
 *  — Skeleton/placeholder для асинхронных данных
 *
 * Ожидаемый CLS: 0 или близко к 0.
 */
import { useState, useEffect } from 'react';

export default function StableLayout() {
  const [data, setData] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setData('Данные загружены успешно!'), 500);
    const timer2 = setTimeout(() => setImageLoaded(true), 700);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="scenario">
      <h2>Сценарий: Стабильная страница (эталон)</h2>
      <p className="description">
        Правильно построенная страница: место зарезервировано для всех элементов.
        CLS должен быть 0 или близко к 0.
      </p>

      <div style={{ maxWidth: 800 }}>
        {/* Изображение с зарезервированным местом */}
        <div style={{
          width: '100%',
          height: 200,
          borderRadius: 8,
          marginBottom: 16,
          overflow: 'hidden',
          background: imageLoaded ? '#4361ee' : '#e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: imageLoaded ? '#fff' : '#adb5bd',
          fontSize: 18,
          fontWeight: 600,
        }}>
          {imageLoaded ? 'Hero Image Loaded' : 'Loading image...'}
        </div>

        {/* Контент с placeholder (skeleton) — ВЫСОТА ЗАРЕЗЕРВИРОВАНА */}
        <div style={{
          background: '#f8f9fa',
          padding: 20,
          borderRadius: 8,
          marginBottom: 16,
          minHeight: 80,
        }}>
          {data ? (
            <>
              <h3>Результат загрузки</h3>
              <p>{data}</p>
            </>
          ) : (
            <>
              <div style={{ height: 20, width: '60%', background: '#dee2e6', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 14, width: '80%', background: '#e9ecef', borderRadius: 4 }} />
            </>
          )}
        </div>

        {/* Статичный контент — не двигается */}
        <div style={{
          background: '#e9ecef',
          padding: 20,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <h3>Статичный контент</h3>
          <p>Этот блок не смещается, потому что все элементы выше
          имеют зарезервированное пространство (фиксированная высота / min-height).</p>
        </div>

        <div style={{
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          padding: 20,
          borderRadius: 8,
        }}>
          <h3>✅ Лучшие практики</h3>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Задавайте <code>width</code> и <code>height</code> для <code>&lt;img&gt;</code></li>
            <li>Резервируйте место под динамический контент (<code>min-height</code>, skeleton)</li>
            <li>Не вставляйте контент выше существующего без резервирования</li>
            <li>Используйте <code>transform</code>-анимации вместо изменения размеров</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
