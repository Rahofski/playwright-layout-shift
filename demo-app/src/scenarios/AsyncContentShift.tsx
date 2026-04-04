/**
 * Сценарий 1: Асинхронная вставка контента.
 *
 * Имитирует типичную проблему — контент загружается по API
 * через 500ms и вставляется ПЕРЕД уже видимым текстом,
 * сдвигая его вниз.
 *
 * Ожидаемый CLS: значительный (> 0.1), т.к. баннер занимает
 * большую долю viewport и двигает весь контент.
 */
import { useState, useEffect } from 'react';

export default function AsyncContentShift() {
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBanner('⚠️ Важное объявление! Сайт будет недоступен завтра с 03:00 до 05:00 по МСК для технического обслуживания.');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="scenario">
      <h2>Сценарий: Асинхронная вставка контента</h2>
      <p className="description">
        Баннер появляется через 500ms и сдвигает весь контент вниз.
        Это типичная проблема SPA — данные приходят по API и изменяют layout.
      </p>

      {/* Баннер вставляется ПЕРЕД основным контентом */}
      {banner && (
        <div className="injected-banner" style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 16,
          fontSize: 16,
          lineHeight: 1.5,
        }}>
          {banner}
        </div>
      )}

      <div className="content-block" style={{
        background: '#f8f9fa',
        padding: 20,
        borderRadius: 8,
        marginBottom: 12,
      }}>
        <h3>Основной контент страницы</h3>
        <p>Этот блок был виден сразу при загрузке. Когда баннер появится выше,
        этот текст сместится вниз — это и есть layout shift.</p>
      </div>

      <div className="content-block" style={{
        background: '#e9ecef',
        padding: 20,
        borderRadius: 8,
        marginBottom: 12,
      }}>
        <p>Ещё один блок контента, который тоже сместится вниз.</p>
      </div>

      <div className="content-block" style={{
        background: '#dee2e6',
        padding: 20,
        borderRadius: 8,
        height: 200,
      }}>
        <p>Нижний блок. Все три блока смещаются при появлении баннера.</p>
      </div>
    </div>
  );
}
