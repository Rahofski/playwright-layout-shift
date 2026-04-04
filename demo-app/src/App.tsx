import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import AsyncContentShift from './scenarios/AsyncContentShift';
import ImageWithoutDimensions from './scenarios/ImageWithoutDimensions';
import DynamicAdInjection from './scenarios/DynamicAdInjection';
import FontSwapShift from './scenarios/FontSwapShift';
import StableLayout from './scenarios/StableLayout';

const scenarios = [
  { path: '/async-content', label: '1. Async Content Injection', component: AsyncContentShift },
  { path: '/image-no-dimensions', label: '2. Images Without Dimensions', component: ImageWithoutDimensions },
  { path: '/dynamic-ad', label: '3. Dynamic Ad Banner', component: DynamicAdInjection },
  { path: '/font-swap', label: '4. Font Swap (FOUT)', component: FontSwapShift },
  { path: '/stable', label: '5. Stable Layout (Control)', component: StableLayout },
];

function Home() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1>Layout Shift Demo</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Демонстрационное приложение для пакета <strong>playwright-layout-shift</strong>.
        Каждый сценарий моделирует реальную причину layout shift.
      </p>
      <nav>
        {scenarios.map(s => (
          <Link
            key={s.path}
            to={s.path}
            style={{
              display: 'block',
              padding: '14px 20px',
              marginBottom: 8,
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: 8,
              textDecoration: 'none',
              color: '#212529',
              fontSize: 16,
            }}
          >
            {s.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div style={{ padding: 24 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          {scenarios.map(s => (
            <Route key={s.path} path={s.path} element={<s.component />} />
          ))}
        </Routes>
        <div style={{ marginTop: 24 }}>
          <Link to="/" style={{ color: '#4361ee', fontSize: 14 }}>← Вернуться к списку сценариев</Link>
        </div>
      </div>
    </HashRouter>
  );
}
