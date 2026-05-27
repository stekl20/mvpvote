import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Overview from './pages/Overview';
import Distribution from './pages/Distribution';
import Explorer from './pages/Explorer';
import Outlets from './pages/Outlets';
import Stats from './pages/Stats';
import Teams from './pages/Teams';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Nav />
      <main style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/distribution" element={<Distribution />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/outlets" element={<Outlets />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/teams" element={<Teams />} />
        </Routes>
      </main>
    </div>
  );
}
