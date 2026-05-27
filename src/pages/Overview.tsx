import { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import mvpBallots from '../data/mvp_ballots.json';
import coyBallots from '../data/coy_ballots.json';
import dpoyBallots from '../data/dpoy_ballots.json';
import voters from '../data/voters.json';
import { getConsensusRanking, getCoyConsensus, getDpoyConsensus, type MvpBallot, type CoyBallot, type DpoyBallot } from '../utils/voteCalc';

const AWARD_LINKS = [
  { label: 'Vote Breakdown', path: '/distribution', desc: 'How each candidate split the vote by rank' },
  { label: 'Voter Explorer', path: '/explorer', desc: 'Browse all 100 ballots, filter by outlet or market' },
  { label: 'Outlet Analysis', path: '/outlets', desc: 'National vs. local vs. international voting patterns' },
  { label: 'Team Awards', path: '/teams', desc: 'All-NBA and All-Defensive team vote breakdowns' },
  { label: 'Stats vs. Votes', path: '/stats', desc: 'Did the numbers predict the ballots?' },
  { label: 'Geography', path: '/map', desc: 'Where did each MVP pick come from?' },
];

const RANK_KEYS = ['first', 'second', 'third', 'fourth', 'fifth'] as const;
const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th'];
const RANK_COLORS = ['var(--rank-1)', 'var(--rank-2)', 'var(--rank-3)', 'var(--rank-4)', 'var(--rank-5)'];

// ── Popover ───────────────────────────────────────────────────────────────
function Popover({ children, content, width = 320 }: {
  children: React.ReactNode;
  content: React.ReactNode;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        {children}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          width, background: 'var(--surface-2)', border: '1px solid var(--accent)',
          borderRadius: 10, padding: '14px 16px', zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

// ── Stat Box ──────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, popoverContent, width }: {
  label: string; value: string | number; sub?: string;
  popoverContent?: React.ReactNode; width?: number;
}) {
  const box = (
    <div style={{
      background: 'var(--surface-2)', borderRadius: 10, padding: '14px 18px',
      textAlign: 'center', minWidth: 130, cursor: popoverContent ? 'pointer' : 'default',
      border: `1px solid ${popoverContent ? 'var(--border)' : 'transparent'}`,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => { if (popoverContent) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
      onMouseLeave={e => { if (popoverContent) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
    >
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--highlight)', marginTop: 2 }}>{sub}</div>}
      {popoverContent && <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 6, opacity: 0.7 }}>click for details</div>}
    </div>
  );

  if (!popoverContent) return box;
  return <Popover content={popoverContent} width={width}>{box}</Popover>;
}

export default function Overview() {
  const mvpConsensus = useMemo(() => getConsensusRanking(mvpBallots as MvpBallot[]), []);
  const mvpWinner = mvpConsensus[0];
  const coyWinner = useMemo(() => getCoyConsensus(coyBallots as CoyBallot[])[0], []);
  const dpoyWinner = useMemo(() => getDpoyConsensus(dpoyBallots as DpoyBallot[])[0], []);

  // First-place breakdown by player
  const firstPlaceByPlayer = useMemo(() => {
    const map: Record<string, Array<{ name: string; outlet: string; isLocal: boolean; isIntl: boolean }>> = {};
    (mvpBallots as MvpBallot[]).forEach(b => {
      if (!map[b.first]) map[b.first] = [];
      const voter = voters.find(v => v.id === b.voter_id);
      if (voter) {
        map[b.first].push({
          name: voter.name,
          outlet: voter.outlet,
          isLocal: !!voter.nba_team_affiliation,
          isIntl: voter.location_country !== 'USA' && voter.location_country !== 'Canada',
        });
      }
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, []);

  const uniquePicks = firstPlaceByPlayer.length;
  const mvpFirstVotes = firstPlaceByPlayer.find(([p]) => p === mvpWinner.player)?.[1].length ?? 0;

  // Outlet type + top outlets for the MVP winner's first-place voters
  const mvpWinnerVoterStats = useMemo(() => {
    const voterList = firstPlaceByPlayer.find(([p]) => p === mvpWinner.player)?.[1] ?? [];
    const national = voterList.filter(v => !v.isLocal && !v.isIntl).length;
    const local = voterList.filter(v => v.isLocal).length;
    const intl = voterList.filter(v => v.isIntl).length;
    const outletCounts: Record<string, number> = {};
    voterList.forEach(v => { outletCounts[v.outlet] = (outletCounts[v.outlet] ?? 0) + 1; });
    const topOutlets = Object.entries(outletCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { national, local, intl, topOutlets };
  }, [firstPlaceByPlayer, mvpWinner]);

  // SGA rank distribution (how many voters had SGA at each rank)
  const sgaRankDist = useMemo(() => {
    const dist: Record<string, number> = { first: 0, second: 0, third: 0, fourth: 0, fifth: 0 };
    (mvpBallots as MvpBallot[]).forEach(b => {
      RANK_KEYS.forEach(key => { if (b[key] === mvpWinner.player) dist[key]++; });
    });
    return dist;
  }, [mvpWinner]);

  // DPOY stats
  const dpoyFirstByPlayer = useMemo(() => {
    const map: Record<string, Array<{ name: string; outlet: string; isLocal: boolean; isIntl: boolean }>> = {};
    (dpoyBallots as DpoyBallot[]).forEach(b => {
      if (!map[b.first]) map[b.first] = [];
      const voter = voters.find(v => v.id === b.voter_id);
      if (voter) {
        map[b.first].push({
          name: voter.name,
          outlet: voter.outlet,
          isLocal: !!voter.nba_team_affiliation,
          isIntl: voter.location_country !== 'USA' && voter.location_country !== 'Canada',
        });
      }
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, []);
  const dpoyWinnerVotes = dpoyFirstByPlayer.find(([p]) => p === dpoyWinner.player)?.[1].length ?? 0;
  const dpoyWinnerVoterStats = useMemo(() => {
    const voterList = dpoyFirstByPlayer.find(([p]) => p === dpoyWinner.player)?.[1] ?? [];
    const national = voterList.filter(v => !v.isLocal && !v.isIntl).length;
    const local = voterList.filter(v => v.isLocal).length;
    const intl = voterList.filter(v => v.isIntl).length;
    const outletCounts: Record<string, number> = {};
    voterList.forEach(v => { outletCounts[v.outlet] = (outletCounts[v.outlet] ?? 0) + 1; });
    const topOutlets = Object.entries(outletCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { national, local, intl, topOutlets };
  }, [dpoyFirstByPlayer, dpoyWinner]);
  const dpoyRankDist = useMemo(() => {
    const dist: Record<string, number> = { first: 0, second: 0, third: 0 };
    (dpoyBallots as DpoyBallot[]).forEach(b => {
      (['first', 'second', 'third'] as const).forEach(key => {
        if (b[key] === dpoyWinner.player) dist[key]++;
      });
    });
    return dist;
  }, [dpoyWinner]);

  // Popover: unique #1 picks breakdown — names only for minority picks
  const uniquePicksContent = (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>MVP #1 Pick Breakdown</div>
      {firstPlaceByPlayer.map(([player, voterList]) => {
        const pct = Math.round((voterList.length / 100) * 100);
        const showNames = voterList.length <= 12;
        return (
          <div key={player} style={{ marginBottom: 12 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)', minWidth: 100 }}>{player}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 50, textAlign: 'right' }}>
                {voterList.length}/100
              </span>
            </div>
            {showNames && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 4 }}>
                {voterList.map(v => v.name).join(', ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Popover: 1st-place votes — outlet type breakdown + top outlets
  const firstVotesContent = (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
        {mvpWinner.player} — {mvpFirstVotes}/100 First-Place Votes
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Voter type
      </div>
      {[
        { label: 'National media', count: mvpWinnerVoterStats.national, color: 'var(--accent)' },
        { label: 'Local market', count: mvpWinnerVoterStats.local, color: 'var(--highlight)' },
        { label: 'International', count: mvpWinnerVoterStats.intl, color: '#a78bfa' },
      ].map(({ label, count, color }) => (
        <div key={label} className="flex items-center gap-2" style={{ marginBottom: 5 }}>
          <div style={{ width: `${count}%`, height: 6, background: color, borderRadius: 3, minWidth: 4 }} />
          <span style={{ color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{count}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</span>
        </div>
      ))}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Top outlets
      </div>
      {mvpWinnerVoterStats.topOutlets.map(([outlet, count]) => (
        <div key={outlet} className="flex items-center justify-between" style={{ marginBottom: 4, fontSize: 12 }}>
          <span style={{ color: 'var(--text-primary)' }}>{outlet}</span>
          <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 600 }}>{count}</span>
        </div>
      ))}
    </div>
  );

  // Popover: vote points breakdown
  const ptsContent = (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
        {mvpWinner.player} — Vote Points Breakdown
      </div>
      {RANK_KEYS.map((key, i) => {
        const count = sgaRankDist[key] ?? 0;
        const pts = [10, 7, 5, 3, 1][i];
        return (
          <div key={key} className="flex items-center justify-between" style={{ marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: RANK_COLORS[i], fontWeight: 600, width: 36 }}>{RANK_LABELS[i]}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{count} votes × {pts}pts</span>
            <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700 }}>= {count * pts}</span>
          </div>
        );
      })}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>Total</span>
        <span style={{ color: 'var(--highlight)', fontFamily: 'monospace' }}>{mvpWinner.points} pts</span>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, marginBottom: 8 }}>
          2025-26 NBA Awards Voting
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 600 }}>
          A data-first look at how 100 media members voted for this season's major awards.
          Explore the ballots, spot the outliers, and draw your own conclusions.
        </p>
      </div>

      {/* Winner cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 48 }}>
        {[
          { award: 'MVP', winner: mvpWinner.player, pts: mvpWinner.points, accent: 'var(--rank-1)' },
          { award: 'Coach of the Year', winner: coyWinner.player, pts: coyWinner.points, accent: 'var(--accent)' },
          { award: 'Def. Player of the Year', winner: dpoyWinner.player, pts: dpoyWinner.points, accent: '#a78bfa' },
        ].map(({ award, winner, pts, accent }) => (
          <div key={award} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{award}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: accent, marginBottom: 4 }}>{winner}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{pts} vote points</div>
          </div>
        ))}
      </div>

      {/* MVP stats summary */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>MVP at a Glance</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>Click any card to explore further.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatBox label="Total voters" value={100} />
          <StatBox
            label="1st-place votes"
            value={mvpFirstVotes}
            sub={`for ${mvpWinner.player}`}
            popoverContent={firstVotesContent}
            width={360}
          />
          <StatBox
            label="Vote points"
            value={mvpWinner.points}
            sub={mvpWinner.player}
            popoverContent={ptsContent}
            width={280}
          />
          <StatBox
            label="Unique #1 picks"
            value={uniquePicks}
            popoverContent={uniquePicksContent}
            width={380}
          />
        </div>
      </div>

      {/* DPOY stats */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>DPOY at a Glance</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>Click any card to explore further. Note: DPOY uses 5/5/1 scoring (1st and 2nd both worth 5 pts).</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatBox label="Total voters" value={100} />
          <StatBox
            label="1st-place votes"
            value={dpoyWinnerVotes}
            sub={`for ${dpoyWinner.player}`}
            popoverContent={
              <div>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
                  {dpoyWinner.player} — {dpoyWinnerVotes}/100 First-Place Votes
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Voter type
                </div>
                {[
                  { label: 'National media', count: dpoyWinnerVoterStats.national, color: 'var(--accent)' },
                  { label: 'Local market', count: dpoyWinnerVoterStats.local, color: 'var(--highlight)' },
                  { label: 'International', count: dpoyWinnerVoterStats.intl, color: '#a78bfa' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-2" style={{ marginBottom: 5 }}>
                    <div style={{ width: `${count}%`, height: 6, background: color, borderRadius: 3, minWidth: 4 }} />
                    <span style={{ color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{count}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Top outlets
                </div>
                {dpoyWinnerVoterStats.topOutlets.map(([outlet, count]) => (
                  <div key={outlet} className="flex items-center justify-between" style={{ marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-primary)' }}>{outlet}</span>
                    <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontWeight: 600 }}>{count}</span>
                  </div>
                ))}
              </div>
            }
            width={320}
          />
          <StatBox
            label="Vote points"
            value={dpoyWinner.points}
            sub={dpoyWinner.player}
            popoverContent={
              <div>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
                  {dpoyWinner.player} — Vote Points Breakdown
                </div>
                {(['first', 'second', 'third'] as const).map((key, i) => {
                  const count = dpoyRankDist[key] ?? 0;
                  const pts = [5, 5, 1][i];
                  return (
                    <div key={key} className="flex items-center justify-between" style={{ marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: RANK_COLORS[i], fontWeight: 600, width: 36 }}>{RANK_LABELS[i]}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{count} votes × {pts}pts</span>
                      <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700 }}>= {count * pts}</span>
                    </div>
                  );
                })}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--highlight)', fontFamily: 'monospace' }}>{dpoyWinner.points} pts</span>
                </div>
              </div>
            }
            width={280}
          />
          <StatBox
            label="Unique #1 picks"
            value={dpoyFirstByPlayer.length}
            popoverContent={
              <div>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>DPOY #1 Pick Breakdown</div>
                {dpoyFirstByPlayer.map(([player, voterList]) => {
                  const pct = Math.round((voterList.length / 100) * 100);
                  const showNames = voterList.length <= 12;
                  return (
                    <div key={player} style={{ marginBottom: 12 }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#a78bfa', minWidth: 100 }}>{player}</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#a78bfa', borderRadius: 3 }} />
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 50, textAlign: 'right' }}>
                          {voterList.length}/100
                        </span>
                      </div>
                      {showNames && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 4 }}>
                          {voterList.map(v => v.name).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            }
            width={380}
          />
        </div>
      </div>

      {/* Navigation cards */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Explore the Data</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {AWARD_LINKS.map(({ label, path, desc }) => (
            <Link
              key={path}
              to={path}
              style={{
                display: 'block', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '16px 20px', textDecoration: 'none', color: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)' }}>{label} →</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
