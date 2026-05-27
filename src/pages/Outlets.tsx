import { useState, useMemo } from 'react';
import voters from '../data/voters.json';
import mvpBallots from '../data/mvp_ballots.json';
import coyBallots from '../data/coy_ballots.json';
import dpoyBallots from '../data/dpoy_ballots.json';
import allnbaBallots from '../data/allnba_ballots.json';
import alldefBallots from '../data/alldef_ballots.json';
import { getConsensusRanking, getCoyConsensus, getDpoyConsensus, type MvpBallot, type CoyBallot, type DpoyBallot } from '../utils/voteCalc';

const CAT_COLORS: Record<string, string> = {
  national: 'var(--accent)',
  local: 'var(--highlight)',
  international: '#a78bfa',
  'podcast/independent': '#34d399',
};
const CAT_ORDER = ['national', 'local', 'international', 'podcast/independent'];
const CAT_LABELS: Record<string, string> = {
  national: 'National',
  local: 'Local / Regional',
  international: 'International',
  'podcast/independent': 'Podcast / Independent',
};

// ── Consensus winners for comparison
const mvpConsensus = getConsensusRanking(mvpBallots as MvpBallot[]);
const coyConsensus = getCoyConsensus(coyBallots as CoyBallot[]);
const dpoyConsensus = getDpoyConsensus(dpoyBallots as DpoyBallot[]);
const MVP_WINNER = mvpConsensus[0]?.player;
const COY_WINNER = coyConsensus[0]?.player;
const DPOY_WINNER = dpoyConsensus[0]?.player;

function getVoterBallot(voterId: string) {
  const mvp = (mvpBallots as any[]).find(b => b.voter_id === voterId);
  const coy = (coyBallots as any[]).find(b => b.voter_id === voterId);
  const dpoy = (dpoyBallots as any[]).find(b => b.voter_id === voterId);
  const allnba = (allnbaBallots as any[]).find(b => b.voter_id === voterId);
  const alldef = (alldefBallots as any[]).find(b => b.voter_id === voterId);
  return { mvp, coy, dpoy, allnba, alldef };
}

// ── Outlet detail panel ────────────────────────────────────────────────────
function OutletDetail({ outletName }: { outletName: string }) {
  const outletVoters = useMemo(
    () => voters.filter(v => v.outlet === outletName),
    [outletName]
  );
  const cat = outletVoters[0]?.outlet_category ?? 'national';

  // MVP pick distribution for this outlet
  const mvpPicks = useMemo(() => {
    const counts: Record<string, number> = {};
    outletVoters.forEach(v => {
      const b = (mvpBallots as any[]).find(b => b.voter_id === v.id);
      const pick = b?.first ?? 'Other';
      counts[pick] = (counts[pick] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [outletVoters]);

  // Agreement stat: % who voted for each award winner
  const agreementStats = useMemo(() => {
    const n = outletVoters.length;
    if (!n) return [];
    const mvpAgree = outletVoters.filter(v => {
      const b = (mvpBallots as any[]).find(b => b.voter_id === v.id);
      return b?.first === MVP_WINNER;
    }).length;
    const coyAgree = outletVoters.filter(v => {
      const b = (coyBallots as any[]).find(b => b.voter_id === v.id);
      return b?.first === COY_WINNER;
    }).length;
    const dpoyAgree = outletVoters.filter(v => {
      const b = (dpoyBallots as any[]).find(b => b.voter_id === v.id);
      return b?.first === DPOY_WINNER;
    }).length;
    return [
      { label: `MVP #1 → ${MVP_WINNER}`, agree: mvpAgree, n },
      { label: `COY #1 → ${COY_WINNER}`, agree: coyAgree, n },
      { label: `DPOY #1 → ${DPOY_WINNER}`, agree: dpoyAgree, n },
    ];
  }, [outletVoters]);

  const color = CAT_COLORS[cat] ?? 'var(--accent)';

  const thStyle: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)',
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{outletName}</h2>
          <span style={{
            background: color + '22', color,
            borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
          }}>{CAT_LABELS[cat]}</span>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {outletVoters.length} voter{outletVoters.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* MVP pick breakdown */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            MVP #1 Picks
          </p>
          {mvpPicks.map(([player, count]) => (
            <div key={player} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(count / outletVoters.length) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
              </div>
              <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, minWidth: 80 }}>{player}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 40, textAlign: 'right' }}>
                {count}/{outletVoters.length}
              </span>
            </div>
          ))}
        </div>

        {/* Consensus alignment */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Voted with Consensus
          </p>
          {agreementStats.map(({ label, agree, n }) => {
            const pct = n > 0 ? Math.round((agree / n) * 100) : 0;
            return (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ color: pct === 100 ? '#34d399' : pct >= 70 ? color : 'var(--highlight)', fontWeight: 600 }}>
                    {agree}/{n} ({pct}%)
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Voter roster with full ballots */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Full Ballots
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                {/* Fixed columns */}
                <th style={thStyle}>Voter</th>
                <th style={thStyle}>Location</th>
                {/* MVP group */}
                <th style={{ ...thStyle, color: 'var(--rank-1)', borderLeft: '2px solid var(--border)' }}>MVP 1</th>
                <th style={{ ...thStyle, color: 'var(--rank-2)' }}>MVP 2</th>
                <th style={{ ...thStyle, color: 'var(--rank-3)' }}>MVP 3</th>
                <th style={{ ...thStyle, color: 'var(--rank-4)' }}>MVP 4</th>
                <th style={{ ...thStyle, color: 'var(--rank-5)' }}>MVP 5</th>
                {/* COY group */}
                <th style={{ ...thStyle, color: 'var(--rank-1)', borderLeft: '2px solid var(--border)' }}>COY 1</th>
                <th style={{ ...thStyle, color: 'var(--rank-2)' }}>COY 2</th>
                <th style={{ ...thStyle, color: 'var(--rank-3)' }}>COY 3</th>
                {/* DPOY group */}
                <th style={{ ...thStyle, color: 'var(--rank-1)', borderLeft: '2px solid var(--border)' }}>DPOY 1</th>
                <th style={{ ...thStyle, color: 'var(--rank-2)' }}>DPOY 2</th>
                <th style={{ ...thStyle, color: 'var(--rank-3)' }}>DPOY 3</th>
                {/* All-NBA */}
                <th style={{ ...thStyle, color: 'var(--rank-1)', borderLeft: '2px solid var(--border)' }}>1st Team</th>
                <th style={{ ...thStyle, color: 'var(--rank-2)' }}>2nd Team</th>
                <th style={{ ...thStyle, color: 'var(--rank-3)' }}>3rd Team</th>
                {/* All-Defense */}
                <th style={{ ...thStyle, color: 'var(--rank-1)', borderLeft: '2px solid var(--border)' }}>D-1st</th>
                <th style={{ ...thStyle, color: 'var(--rank-2)' }}>D-2nd</th>
              </tr>
              {/* Award group labels */}
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                <td colSpan={2} />
                <td colSpan={5} style={{ padding: '3px 12px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', borderLeft: '2px solid var(--border)' }}>MVP</td>
                <td colSpan={3} style={{ padding: '3px 12px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', borderLeft: '2px solid var(--border)' }}>Coach of the Year</td>
                <td colSpan={3} style={{ padding: '3px 12px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', borderLeft: '2px solid var(--border)' }}>DPOY</td>
                <td colSpan={3} style={{ padding: '3px 12px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', borderLeft: '2px solid var(--border)' }}>All-NBA</td>
                <td colSpan={2} style={{ padding: '3px 12px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', borderLeft: '2px solid var(--border)' }}>All-Defense</td>
              </tr>
            </thead>
            <tbody>
              {outletVoters.map((voter, ri) => {
                const { mvp, coy, dpoy, allnba, alldef } = getVoterBallot(voter.id);
                const bg = ri % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent';
                const td = (content: string | undefined, rankColor?: string, wrap = false) => (
                  <td style={{ padding: '7px 10px', color: rankColor ?? 'var(--text-secondary)', background: bg, whiteSpace: wrap ? 'normal' : 'nowrap', minWidth: wrap ? 160 : undefined }}>
                    {content ?? '—'}
                  </td>
                );
                const tdBorder = (content: string | undefined, rankColor?: string, wrap = false) => (
                  <td style={{ padding: '7px 10px', color: rankColor ?? 'var(--text-secondary)', background: bg, borderLeft: '2px solid var(--border)', whiteSpace: wrap ? 'normal' : 'nowrap', minWidth: wrap ? 160 : undefined }}>
                    {content ?? '—'}
                  </td>
                );
                const teamCell = (picks: string[] | undefined) =>
                  picks ? picks.join(', ') : undefined;

                return (
                  <tr key={voter.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600, background: bg, whiteSpace: 'nowrap' }}>{voter.name}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--text-secondary)', background: bg, whiteSpace: 'nowrap', fontSize: 11 }}>
                      {voter.location_city}{voter.location_state ? `, ${voter.location_state}` : ''}
                      {voter.location_country !== 'USA' ? ` (${voter.location_country})` : ''}
                    </td>
                    {tdBorder(mvp?.first, 'var(--rank-1)')}
                    {td(mvp?.second, 'var(--rank-2)')}
                    {td(mvp?.third, 'var(--rank-3)')}
                    {td(mvp?.fourth, 'var(--rank-4)')}
                    {td(mvp?.fifth, 'var(--rank-5)')}
                    {tdBorder(coy?.first, 'var(--rank-1)')}
                    {td(coy?.second, 'var(--rank-2)')}
                    {td(coy?.third, 'var(--rank-3)')}
                    {tdBorder(dpoy?.first, 'var(--rank-1)')}
                    {td(dpoy?.second, 'var(--rank-2)')}
                    {td(dpoy?.third, 'var(--rank-3)')}
                    {tdBorder(teamCell(allnba?.first as string[]), undefined, true)}
                    {td(teamCell(allnba?.second as string[]), undefined, true)}
                    {td(teamCell(allnba?.third as string[]), undefined, true)}
                    {tdBorder(teamCell(alldef?.first as string[]), undefined, true)}
                    {td(teamCell(alldef?.second as string[]), undefined, true)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Outlets() {
  const [selectedOutlet, setSelectedOutlet] = useState<string>('The Athletic');
  const [search, setSearch] = useState('');

  // Group outlets by category, sorted by voter count
  const outletGroups = useMemo(() => {
    const map: Record<string, { name: string; count: number; cat: string }[]> = {};
    const outletData: Record<string, { count: number; cat: string }> = {};
    voters.forEach(v => {
      if (!outletData[v.outlet]) outletData[v.outlet] = { count: 0, cat: v.outlet_category };
      outletData[v.outlet].count++;
    });
    Object.entries(outletData).forEach(([name, { count, cat }]) => {
      if (!map[cat]) map[cat] = [];
      map[cat].push({ name, count, cat });
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => b.count - a.count));
    return map;
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search) return outletGroups;
    const q = search.toLowerCase();
    const result: typeof outletGroups = {};
    Object.entries(outletGroups).forEach(([cat, outlets]) => {
      const filtered = outlets.filter(o => o.name.toLowerCase().includes(q));
      if (filtered.length) result[cat] = filtered;
    });
    return result;
  }, [outletGroups, search]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Outlet Analysis</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Select an outlet to see how their voters voted across every award.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Outlet sidebar */}
        <aside style={{ width: 220, flexShrink: 0, position: 'sticky', top: 72 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search outlets…"
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13,
              outline: 'none', marginBottom: 12,
            }}
          />
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {CAT_ORDER.filter(c => filteredGroups[c]).map(cat => (
              <div key={cat} style={{ marginBottom: 16 }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7,
                  color: CAT_COLORS[cat], marginBottom: 6, paddingLeft: 8,
                }}>
                  {CAT_LABELS[cat]}
                </p>
                {filteredGroups[cat].map(({ name, count }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedOutlet(name)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '6px 10px', borderRadius: 6, border: 'none',
                      background: selectedOutlet === name ? CAT_COLORS[cat] + '22' : 'transparent',
                      color: selectedOutlet === name ? CAT_COLORS[cat] : 'var(--text-primary)',
                      cursor: 'pointer', fontSize: 13, textAlign: 'left', fontWeight: selectedOutlet === name ? 600 : 400,
                      transition: 'background 0.12s',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: 6, flexShrink: 0 }}>{count}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Detail panel */}
        <OutletDetail key={selectedOutlet} outletName={selectedOutlet} />
      </div>
    </div>
  );
}
