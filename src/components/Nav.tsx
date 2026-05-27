import { NavLink } from 'react-router-dom';

const links = [
  { to: '/explorer', label: 'Voter Explorer' },
  { to: '/', label: 'Vote Breakdown' },
  { to: '/teams', label: 'Team Awards' },
  { to: '/stats', label: 'Stats vs Votes' },
];

export default function Nav() {
  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto" style={{ height: 56 }}>
        <span style={{ color: 'var(--highlight)', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, marginRight: 24, whiteSpace: 'nowrap' }}>
          NBA AWARDS 2025–26
        </span>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--surface-2)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
