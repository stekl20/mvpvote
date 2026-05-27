import { useMemo } from 'react';
import voters from '../data/voters.json';
import mvpBallots from '../data/mvp_ballots.json';
import { getConsensusRanking, getAverageRankByGroup, type MvpBallot } from '../utils/voteCalc';

const ROW_GROUPS = [
  { key: 'national', label: 'National Media' },
  { key: 'local', label: 'Local / Regional' },
  { key: 'international', label: 'International' },
  { key: 'podcast/independent', label: 'Podcast / Independent' },
];

function rankToColor(rank: number): string {
  // 1 = dark blue, 6 = dark red
  const t = (rank - 1) / 5;
  const r = Math.round(30 + t * 180);
  const g = Math.round(100 - t * 70);
  const b = Math.round(220 - t * 190);
  return `rgb(${r},${g},${b})`;
}

export default function OutletHeatmap() {
  const consensus = useMemo(() => getConsensusRanking(mvpBallots as MvpBallot[]).slice(0, 6), []);
  const players = consensus.map(c => c.player);

  const rows = useMemo(() => {
    return ROW_GROUPS.map(group => {
      const groupVoters = voters.filter(v => v.outlet_category === group.key);
      const avgRanks = getAverageRankByGroup(groupVoters.map(v => v.id), mvpBallots as MvpBallot[], players);
      return { ...group, avgRanks, n: groupVoters.length };
    });
  }, [players]);

  return (
    <div>
      <div className="mb-6">
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Outlet Type vs. MVP Rankings</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Average rank given to each player by outlet type. Darker blue = ranked higher (1st). Darker red = ranked lower or not voted.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 3, minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ width: 180, padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} />
              {players.map(p => (
                <th key={p} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {p}
                </th>
              ))}
              <th style={{ width: 40, color: 'var(--text-secondary)', fontSize: 11 }}>N</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>{row.label}</td>
                {players.map(p => {
                  const avg = row.avgRanks[p] ?? 6;
                  const bg = rankToColor(avg);
                  return (
                    <td key={p} style={{ padding: 0 }}>
                      <div
                        style={{
                          width: 90, height: 52,
                          background: bg,
                          borderRadius: 4,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'default',
                        }}
                        title={`${row.label} voters ranked ${p} avg ${avg.toFixed(1)} (N=${row.n})`}
                      >
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                          {avg.toFixed(1)}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>avg rank</span>
                      </div>
                    </td>
                  );
                })}
                <td style={{ padding: '8px 8px', color: 'var(--text-secondary)', fontSize: 12, textAlign: 'center' }}>{row.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-6" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        <div style={{ width: 80, height: 10, background: 'linear-gradient(to right, rgb(30,100,220), rgb(210,30,30))', borderRadius: 2 }} />
        <span>Ranked 1st (best) → Ranked 6th / not voted</span>
      </div>
    </div>
  );
}
