/**
 * Сценарий 3: Динамическая вставка рекламного баннера.
 *
 * Имитирует реальную ситуацию: рекламный скрипт загружается
 * с задержкой и вставляет баннер фиксированной высоты в середину
 * контента, раздвигая его. Это одна из главных причин плохого CLS
 * на новостных и контентных сайтах.
 */
import { useState, useEffect } from 'react';

export default function DynamicAdInjection() {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adExpanded, setAdExpanded] = useState(false);

  useEffect(() => {
    // Первая фаза: «рекламный скрипт» загрузился, баннер появился маленьким
    const timer1 = setTimeout(() => setAdLoaded(true), 600);
    // Вторая фаза: баннер «расширяется» (динамический creatives)
    const timer2 = setTimeout(() => setAdExpanded(true), 1200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="scenario">
      <h2>Сценарий: Динамический рекламный баннер</h2>
      <p className="description">
        Рекламный баннер появляется через 600ms (высота 90px),
        затем через 1200ms расширяется до 250px. Два layout shift-а.
      </p>

      <div style={{ maxWidth: 800 }}>
        <article style={{
          background: '#f8f9fa',
          padding: 20,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <h3>Заголовок новости</h3>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
        </article>

        {/* Рекламный блок — вставляется МЕЖДУ контентом */}
        {adLoaded && (
          <div style={{
            background: adExpanded ? '#1a1a2e' : '#16213e',
            color: '#fff',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            height: adExpanded ? 250 : 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            transition: 'none', /* без transition — мгновенный shift */
            overflow: 'hidden',
          }}>
            <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>ADVERTISEMENT</div>
            <div style={{ fontSize: adExpanded ? 24 : 16, fontWeight: 700 }}>
              {adExpanded ? '🎉 Мега-распродажа! Скидки до 70%!' : 'Загрузка рекламы...'}
            </div>
            {adExpanded && (
              <div style={{ fontSize: 14, marginTop: 8 }}>
                Только сегодня — бесплатная доставка на все заказы от 2000₽
              </div>
            )}
          </div>
        )}

        <article style={{
          background: '#e9ecef',
          padding: 20,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <h3>Продолжение статьи</h3>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse
          cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
          cupidatat non proident, sunt in culpa qui officia deserunt mollit.</p>
        </article>

        <article style={{
          background: '#dee2e6',
          padding: 20,
          borderRadius: 8,
        }}>
          <h3>Комментарии читателей</h3>
          <p>Этот блок сдвинется дважды: сначала при появлении рекламы (90px),
          затем при расширении (ещё 160px).</p>
        </article>
      </div>
    </div>
  );
}
