import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import voters from '../data/voters.json';
import mvpBallots from '../data/mvp_ballots.json';
import dpoyBallots from '../data/dpoy_ballots.json';
import coyBallots from '../data/coy_ballots.json';
import allnbaBallots from '../data/allnba_ballots.json';
import alldefBallots from '../data/alldef_ballots.json';

type Voter = typeof voters[0];

const OUTLET_CATS = ['national', 'local', 'international', 'podcast/independent'];


function getBallot(voterId: string) {
  const mvp = mvpBallots.find(b => b.voter_id === voterId);
  const dpoy = dpoyBallots.find(b => b.voter_id === voterId);
  const coy = coyBallots.find(b => b.voter_id === voterId);
  const allnba = allnbaBallots.find(b => b.voter_id === voterId);
  const alldef = alldefBallots.find(b => b.voter_id === voterId);
  return { mvp, dpoy, coy, allnba, alldef };
}

function downloadCsv(rows: Voter[]) {
  const headers = ['Name', 'Outlet', 'Type', 'City', 'State', 'Country', 'NBA Market', 'MVP #1', 'MVP #2', 'MVP #3', 'MVP #4', 'MVP #5', 'DPOY #1', 'DPOY #2', 'DPOY #3', 'COY #1', 'COY #2', 'COY #3'];
  const lines = rows.map(v => {
    const { mvp, dpoy, coy } = getBallot(v.id);
    return [
      v.name, v.outlet, v.outlet_category, v.location_city ?? '', v.location_state ?? '', v.location_country ?? '', v.nba_team_affiliation ?? '',
      mvp?.first ?? '', mvp?.second ?? '', mvp?.third ?? '', mvp?.fourth ?? '', mvp?.fifth ?? '',
      dpoy?.first ?? '', dpoy?.second ?? '', dpoy?.third ?? '',
      coy?.first ?? '', coy?.second ?? '', coy?.third ?? '',
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'nba_awards_voters.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function VoterTable() {
  const [search, setSearch] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'outlet'>('name');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const markets = useMemo(() => {
    const m = [...new Set(voters.map(v => v.nba_team_affiliation).filter(Boolean))].sort();
    return m as string[];
  }, []);

  const filtered = useMemo(() => {
    return voters
      .filter((v: Voter) => {
        if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.outlet.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedCats.length > 0 && !selectedCats.includes(v.outlet_category)) return false;
        if (selectedMarket && v.nba_team_affiliation !== selectedMarket) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return a.outlet.localeCompare(b.outlet);
      });
  }, [search, selectedCats, selectedMarket, sortBy]);

  function toggleCat(cat: string) {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }

  const catColors: Record<string, string> = {
    national: 'var(--accent)',
    local: 'var(--highlight)',
    international: '#a78bfa',
    'podcast/independent': '#34d399',
  };

  return (
    <div className="voter-layout flex gap-6">
      {/* Sidebar */}
      <aside className="voter-sidebar" style={{ width: 220, flexShrink: 0 }}>
        <button
          className="voter-filter-toggle"
          onClick={() => setFiltersOpen(o => !o)}
          style={{ display: 'none', width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', fontWeight: 600, marginBottom: 8, textAlign: 'left' }}
        >
          Filters {filtersOpen ? '▲' : '▼'}
        </button>
        {filtersOpen && <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <p className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Filters
          </p>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or outlet…"
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13, marginBottom: 16,
              outline: 'none',
            }}
          />

          <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 8 }}>Outlet type</p>
          {OUTLET_CATS.map(cat => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedCats.includes(cat)}
                onChange={() => toggleCat(cat)}
                style={{ accentColor: catColors[cat] }}
              />
              <span style={{ fontSize: 13, color: selectedCats.includes(cat) ? catColors[cat] : 'var(--text-primary)', textTransform: 'capitalize' }}>
                {cat}
              </span>
            </label>
          ))}

          <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 8, marginTop: 16 }}>NBA market (voter's beat)</p>
          <select
            value={selectedMarket}
            onChange={e => setSelectedMarket(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
            }}
          >
            <option value="">All markets</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 8, marginTop: 16 }}>Sort by</p>
          {(['name', 'outlet'] as const).map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
              <input type="radio" checked={sortBy === s} onChange={() => setSortBy(s)} />
              <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{s}</span>
            </label>
          ))}

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12 }}>
            N = {filtered.length} voters
          </div>
        </div>}
      </aside>

      {/* Table */}
      <div className="voter-table-container flex-1 overflow-x-auto">
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{filtered.length} voters</span>
          <button
            onClick={() => downloadCsv(filtered)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
              padding: '5px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ↓ Download CSV
          </button>
        </div>
        <table className="voter-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[
                { label: 'Name' },
                { label: 'Outlet', cls: 'hide-col-mobile' },
                { label: 'Type', width: 95 },
                { label: 'Location', cls: 'hide-col-mobile' },
                { label: 'MVP #1', width: 110 },
                { label: 'MVP #2', cls: 'hide-col-mobile' },
                { label: 'MVP #3', cls: 'hide-col-mobile' },
                { label: '', width: 30 },
              ].map(({ label, cls, width }) => (
                <th key={label} className={cls} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', ...(width ? { width } : {}) }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((voter: Voter) => {
              const mvp = mvpBallots.find(b => b.voter_id === voter.id);
              const isExpanded = expanded === voter.id;
              return (
                <>
                  <tr
                    key={voter.id}
                    onClick={() => setExpanded(isExpanded ? null : voter.id)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--surface-2)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="voter-cell-name" style={{ padding: '10px 12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{voter.name}</td>
                    <td className="hide-col-mobile" style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{voter.outlet}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: catColors[voter.outlet_category] + '22',
                        color: catColors[voter.outlet_category],
                        borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {voter.outlet_category}
                      </span>
                    </td>
                    <td className="hide-col-mobile" style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
                      {voter.location_city}{voter.location_state ? `, ${voter.location_state}` : ''}{voter.location_country !== 'USA' ? ` (${voter.location_country})` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--rank-1)', fontWeight: 600 }}>{mvp?.first ?? '—'}</td>
                    <td className="hide-col-mobile" style={{ padding: '10px 12px', color: 'var(--rank-2)' }}>{mvp?.second ?? '—'}</td>
                    <td className="hide-col-mobile" style={{ padding: '10px 12px', color: 'var(--rank-3)' }}>{mvp?.third ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12, textAlign: 'right' }}>
                      {isExpanded ? '▲' : '▼'}
                    </td>
                  </tr>
                  <AnimatePresence>
                    {isExpanded && (
                      <tr key={`${voter.id}-expanded`}>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <ExpandedBallot voter={voter} />
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No voters match these filters.</div>
        )}
      </div>
    </div>
  );
}

const RANK_COLORS = ['var(--rank-1)', 'var(--rank-2)', 'var(--rank-3)', 'var(--rank-4)', 'var(--rank-5)'];

function BallotColumn({ label, picks }: { label: string; picks: string[] | null }) {
  return (
    <div className="ballot-col" style={{ minWidth: 110 }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label}
      </p>
      {picks ? picks.map((pick, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ color: RANK_COLORS[i], fontFamily: 'monospace', fontSize: 10, width: 16, flexShrink: 0 }}>{i + 1}.</span>
          <span style={{ fontSize: 12 }}>{pick}</span>
        </div>
      )) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
    </div>
  );
}

function TeamColumn({ label, color, picks }: { label: string; color: string; picks: string[] | null }) {
  return (
    <div className="team-col" style={{ minWidth: 130 }}>
      <p style={{ color, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label}
      </p>
      {picks ? picks.map((pick, i) => (
        <div key={i} style={{ fontSize: 12, marginBottom: 3, color: 'var(--text-primary)' }}>{pick}</div>
      )) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
    </div>
  );
}

function ExpandedBallot({ voter }: { voter: typeof voters[0] }) {
  const { mvp, dpoy, coy, allnba, alldef } = getBallot(voter.id);

  return (
    <div className="expanded-ballot" style={{ background: 'var(--surface-2)', padding: '16px 24px 20px', borderBottom: '1px solid var(--border)' }}>
      {/* Individual awards row */}
      <div className="expanded-ballot-row" style={{ display: 'flex', gap: 36, flexWrap: 'wrap', marginBottom: 16 }}>
        <BallotColumn label="MVP Ballot" picks={mvp ? [mvp.first, mvp.second, mvp.third, mvp.fourth, mvp.fifth] : null} />
        <BallotColumn label="DPOY Ballot" picks={dpoy ? [dpoy.first, dpoy.second, dpoy.third] : null} />
        <BallotColumn label="COY Ballot" picks={coy ? [coy.first, coy.second, coy.third] : null} />
        <div className="voter-info-col" style={{ marginLeft: 'auto', textAlign: 'right' }}>
          {(voter as any).twitter && (
            <a href={`https://twitter.com/${(voter as any).twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent)', fontSize: 12, textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              {(voter as any).twitter}
            </a>
          )}
          {voter.nba_team_affiliation && (
            <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
              Market: <span style={{ color: 'var(--highlight)' }}>{voter.nba_team_affiliation}</span>
            </div>
          )}
        </div>
      </div>

      {/* Team awards row */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
          Team Selections
        </p>
        <div className="expanded-teams-row" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <TeamColumn label="All-NBA 1st" color="var(--rank-1)" picks={allnba?.first ?? null} />
          <TeamColumn label="All-NBA 2nd" color="var(--rank-2)" picks={allnba?.second ?? null} />
          <TeamColumn label="All-NBA 3rd" color="var(--rank-3)" picks={allnba?.third ?? null} />
          <div className="expanded-divider" style={{ width: 1, background: 'var(--border)' }} />
          <TeamColumn label="All-Defense 1st" color="var(--rank-1)" picks={alldef?.first ?? null} />
          <TeamColumn label="All-Defense 2nd" color="var(--rank-2)" picks={alldef?.second ?? null} />
        </div>
      </div>
    </div>
  );
}
