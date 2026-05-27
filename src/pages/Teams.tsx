import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import allnbaResults from '../data/allnba_results.json';
import alldefResults from '../data/alldef_results.json';
import allnbaBallots from '../data/allnba_ballots.json';
import alldefBallots from '../data/alldef_ballots.json';
import voters from '../data/voters.json';

type Mode = 'allnba' | 'alldef';

const TOTAL_VOTERS = { allnba: 100, alldef: 100 };

const TEAM_COLORS = {
  first: 'var(--rank-1)',
  second: 'var(--rank-2)',
  third: 'var(--rank-3)',
};

const CAT_COLORS: Record<string, string> = {
  national: 'var(--accent)',
  local: 'var(--highlight)',
  international: '#a78bfa',
  'podcast/independent': '#34d399',
};

const CONSOLIDATE_AT = 15;

// ── Voter detail panel ─────────────────────────────────────────────────────
type VoterDetail = {
  name: string; outlet: string; outletCat: string;
  city: string; state: string; country: string;
  isLocal: boolean; isIntl: boolean;
};

function RankSection({ label, color, voterList }: { label: string; color: string; voterList: VoterDetail[] }) {
  const total = voterList.length;
  const consolidated = total > CONSOLIDATE_AT;

  const summary = useMemo(() => {
    const national = voterList.filter(v => !v.isLocal && !v.isIntl).length;
    const local = voterList.filter(v => v.isLocal).length;
    const intl = voterList.filter(v => v.isIntl).length;
    const outletMap: Record<string, number> = {};
    voterList.forEach(v => { outletMap[v.outlet] = (outletMap[v.outlet] ?? 0) + 1; });
    const topOutlets = Object.entries(outletMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { national, local, intl, topOutlets };
  }, [voterList]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${color}33` }}>
        <span style={{ color, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        <span style={{ background: color + '22', color, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{total}</span>
      </div>

      {/* Summary stats — always show when consolidated */}
      {consolidated && (
        <div style={{ marginBottom: 10 }}>
          {[
            { lbl: 'National', n: summary.national, c: 'var(--accent)' },
            { lbl: 'Local', n: summary.local, c: 'var(--highlight)' },
            { lbl: 'Intl', n: summary.intl, c: '#a78bfa' },
          ].filter(x => x.n > 0).map(({ lbl, n, c }) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: Math.round((n / total) * 100) + '%', maxWidth: 90, height: 5, background: c, borderRadius: 3, minWidth: 3 }} />
              <span style={{ color: c, fontSize: 11, fontWeight: 600, minWidth: 18 }}>{n}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{lbl}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, marginBottom: 10 }}>
            {summary.topOutlets.map(([outlet, n]) => (
              <div key={outlet} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{outlet}</span>
                <span style={{ color, fontFamily: 'monospace', fontWeight: 600 }}>{n}</span>
              </div>
            ))}
          </div>
          {/* Compact name grid */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              All voters
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
              {voterList.map(v => (
                <div key={v.name} style={{ fontSize: 11, color: 'var(--text-primary)', padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={`${v.name} · ${v.outlet}`}>
                  {v.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed view for small groups */}
      {!consolidated && (
        <div>
          {voterList.map(v => (
            <div key={v.name} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 500, fontSize: 12 }}>{v.name}</span>
                <span style={{
                  background: (CAT_COLORS[v.outletCat] ?? 'var(--accent)') + '22',
                  color: CAT_COLORS[v.outletCat] ?? 'var(--accent)',
                  borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                }}>{v.outletCat}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                <span>{v.outlet}</span>
                {(v.city || v.state) && <span>·</span>}
                <span>
                  {v.city}{v.state ? `, ${v.state}` : ''}
                  {v.country !== 'USA' && v.country !== 'Canada' && v.country ? ` (${v.country})` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamVoterPanel({ player, mode }: { player: string; mode: Mode }) {
  const rankSections = useMemo(() => {
    const ballots = (mode === 'allnba' ? allnbaBallots : alldefBallots) as { voter_id: string; first: string[]; second: string[]; third?: string[] }[];
    const keys = mode === 'allnba' ? ['first', 'second', 'third'] as const : ['first', 'second'] as const;
    const labels = mode === 'allnba' ? ['1st Team', '2nd Team', '3rd Team'] : ['1st Team', '2nd Team'];
    const colors = [TEAM_COLORS.first, TEAM_COLORS.second, TEAM_COLORS.third];

    return keys.map((key, i) => {
      const matching = ballots.filter(b => (b[key] as string[] | undefined)?.includes(player));
      const voterDetails: VoterDetail[] = matching.map(b => {
        const voter = voters.find(v => v.id === b.voter_id);
        if (!voter) return null;
        return {
          name: voter.name,
          outlet: voter.outlet,
          outletCat: voter.outlet_category,
          city: voter.location_city ?? '',
          state: voter.location_state ?? '',
          country: voter.location_country ?? '',
          isLocal: !!voter.nba_team_affiliation,
          isIntl: voter.location_country !== 'USA' && voter.location_country !== 'Canada',
        };
      }).filter(Boolean) as VoterDetail[];

      return { label: labels[i], color: colors[i], voters: voterDetails };
    }).filter(s => s.voters.length > 0);
  }, [player, mode]);

  if (!rankSections.length) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '2px solid var(--border)',
        padding: '16px 28px 20px 68px',
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(rankSections.length, 3)}, minmax(160px, 1fr))`,
        gap: 28,
        maxHeight: 360,
        overflowY: 'auto',
      }}>
        {rankSections.map(({ label, color, voters: voterList }) => (
          <RankSection key={label} label={label} color={color} voterList={voterList} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Row components ─────────────────────────────────────────────────────────
function AllNbaRow({ row, maxPts, rank, isSelected, onNameClick }: {
  row: typeof allnbaResults[0]; maxPts: number; rank: number;
  isSelected: boolean; onNameClick: () => void;
}) {
  const barPct = maxPts > 0 ? (row.points / maxPts) * 100 : 0;
  const total = row.first + row.second + row.third;

  const segments = [
    { key: 'first', label: '1st', count: row.first, color: TEAM_COLORS.first },
    { key: 'second', label: '2nd', count: row.second, color: TEAM_COLORS.second },
    { key: 'third', label: '3rd', count: row.third, color: TEAM_COLORS.third },
  ].filter(s => s.count > 0);

  return (
    <div style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border)', padding: '14px 0' }}>
      <div className="flex items-center gap-4">
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, width: 24, textAlign: 'right' }}>#{rank}</span>
        <span
          onClick={onNameClick}
          style={{
            fontWeight: 600, fontSize: 14, width: 180, cursor: 'pointer',
            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
            borderBottom: `1px dashed ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'color 0.15s',
          }}
        >
          {row.player} <span style={{ fontSize: 10, opacity: 0.6 }}>{isSelected ? '▲' : '▼'}</span>
        </span>
        <span style={{ color: 'var(--highlight)', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, width: 56 }}>
          {row.points} pts
        </span>
        <div className="flex-1 relative h-6 rounded overflow-hidden" style={{ background: 'var(--border)' }}>
          {segments.map((seg, i) => {
            const left = segments.slice(0, i).reduce((acc, s) => acc + (s.count / total) * barPct, 0);
            const width = (seg.count / total) * barPct;
            return (
              <motion.div key={seg.key}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
                style={{
                  position: 'absolute', left: `${left}%`, width: `${width}%`,
                  height: '100%', background: seg.color, transformOrigin: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#0a0a0f',
                }}
                title={`${seg.label} Team: ${seg.count} votes`}
              >
                {seg.count > 3 ? seg.count : ''}
              </motion.div>
            );
          })}
        </div>
        <div className="flex gap-4 ml-2">
          {(['first', 'second', 'third'] as const).map((k, i) => (
            <div key={k} className="text-center" style={{ width: 32 }}>
              <div style={{ color: TEAM_COLORS[k], fontWeight: 700, fontSize: 13 }}>{(row as any)[k] || 0}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{['1st', '2nd', '3rd'][i]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AllDefRow({ row, maxPts, rank, isSelected, onNameClick }: {
  row: typeof alldefResults[0]; maxPts: number; rank: number;
  isSelected: boolean; onNameClick: () => void;
}) {
  const barPct = maxPts > 0 ? (row.points / maxPts) * 100 : 0;
  const total = row.first + row.second;

  const segments = [
    { key: 'first', label: '1st', count: row.first, color: TEAM_COLORS.first },
    { key: 'second', label: '2nd', count: row.second, color: TEAM_COLORS.second },
  ].filter(s => s.count > 0);

  return (
    <div style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border)', padding: '14px 0' }}>
      <div className="flex items-center gap-4">
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, width: 24, textAlign: 'right' }}>#{rank}</span>
        <span
          onClick={onNameClick}
          style={{
            fontWeight: 600, fontSize: 14, width: 180, cursor: 'pointer',
            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
            borderBottom: `1px dashed ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'color 0.15s',
          }}
        >
          {row.player} <span style={{ fontSize: 10, opacity: 0.6 }}>{isSelected ? '▲' : '▼'}</span>
        </span>
        <span style={{ color: 'var(--highlight)', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, width: 56 }}>
          {row.points} pts
        </span>
        <div className="flex-1 relative h-6 rounded overflow-hidden" style={{ background: 'var(--border)' }}>
          {segments.map((seg, i) => {
            const left = segments.slice(0, i).reduce((acc, s) => acc + (s.count / total) * barPct, 0);
            const width = (seg.count / total) * barPct;
            return (
              <motion.div key={seg.key}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
                style={{
                  position: 'absolute', left: `${left}%`, width: `${width}%`,
                  height: '100%', background: seg.color, transformOrigin: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#0a0a0f',
                }}
                title={`${seg.label} Team: ${seg.count} votes`}
              >
                {seg.count > 3 ? seg.count : ''}
              </motion.div>
            );
          })}
        </div>
        <div className="flex gap-4 ml-2">
          {(['first', 'second'] as const).map((k, i) => (
            <div key={k} className="text-center" style={{ width: 32 }}>
              <div style={{ color: TEAM_COLORS[k], fontWeight: 700, fontSize: 13 }}>{(row as any)[k] || 0}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{['1st', '2nd'][i]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Teams() {
  const [mode, setMode] = useState<Mode>('allnba');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => { setSelectedPlayer(null); }, [mode]);

  const allnbaTop = allnbaResults.filter(r => r.points > 0);
  const alldefTop = alldefResults.filter(r => r.points > 0);
  const allnbaMax = allnbaTop[0]?.points ?? 1;
  const alldefMax = alldefTop[0]?.points ?? 1;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Team Awards</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            How many voters placed each player on each All-NBA or All-Defensive team.
            Scoring: All-NBA 5/3/1 pts · All-Defense 2/1 pts.
          </p>
        </div>
        <div className="flex gap-2 ml-auto">
          {([['allnba', 'All-NBA'], ['alldef', 'All-Defense']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)} style={{
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: mode === key ? 'var(--accent)' : 'var(--surface)',
              color: mode === key ? '#fff' : 'var(--text-secondary)',
              fontSize: 13, cursor: 'pointer', fontWeight: mode === key ? 600 : 400,
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '28px 32px 20px' }}>
          <div className="flex gap-6 mb-2">
            {(['first', 'second', ...(mode === 'allnba' ? ['third'] : [])] as const).map((k, i) => (
              <div key={k} className="flex items-center gap-2" style={{ fontSize: 13 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: TEAM_COLORS[k as keyof typeof TEAM_COLORS] }} />
                <span>{['1st Team', '2nd Team', '3rd Team'][i]}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 12 }}>
              N = {TOTAL_VOTERS[mode]} voters · Click a name to see who voted
            </span>
          </div>
        </div>

        <div style={{ padding: '0 32px' }}>
          {mode === 'allnba'
            ? allnbaTop.map((row, i) => (
                <div key={row.player}>
                  <AllNbaRow
                    row={row} maxPts={allnbaMax} rank={i + 1}
                    isSelected={selectedPlayer === row.player}
                    onNameClick={() => setSelectedPlayer(selectedPlayer === row.player ? null : row.player)}
                  />
                  <AnimatePresence>
                    {selectedPlayer === row.player && (
                      <TeamVoterPanel key={`panel-${row.player}`} player={row.player} mode={mode} />
                    )}
                  </AnimatePresence>
                </div>
              ))
            : alldefTop.map((row, i) => (
                <div key={row.player}>
                  <AllDefRow
                    row={row} maxPts={alldefMax} rank={i + 1}
                    isSelected={selectedPlayer === row.player}
                    onNameClick={() => setSelectedPlayer(selectedPlayer === row.player ? null : row.player)}
                  />
                  <AnimatePresence>
                    {selectedPlayer === row.player && (
                      <TeamVoterPanel key={`panel-${row.player}`} player={row.player} mode={mode} />
                    )}
                  </AnimatePresence>
                </div>
              ))
          }
        </div>
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
