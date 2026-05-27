import { useMemo } from 'react';
import { motion } from 'framer-motion';
import voters from '../data/voters.json';
import mvpBallots from '../data/mvp_ballots.json';
import coyBallots from '../data/coy_ballots.json';
import dpoyBallots from '../data/dpoy_ballots.json';

type Award = 'mvp' | 'coy' | 'dpoy';

const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th'];
const RANK_COLORS = ['var(--rank-1)', 'var(--rank-2)', 'var(--rank-3)', 'var(--rank-4)', 'var(--rank-5)'];
const CAT_COLORS: Record<string, string> = {
  national: 'var(--accent)',
  local: 'var(--highlight)',
  international: '#a78bfa',
  'podcast/independent': '#34d399',
};

type VoterDetail = {
  name: string;
  outlet: string;
  outletCat: string;
  city: string;
  state: string;
  country: string;
  isLocal: boolean;
  isIntl: boolean;
};

// > 15 voters → show summary stats instead of individual names
const CONSOLIDATE_AT = 15;

function RankSection({ label, color, voterList }: { label: string; color: string; voterList: VoterDetail[] }) {
  const total = voterList.length;
  const consolidated = total > CONSOLIDATE_AT;

  const summary = useMemo(() => {
    if (!consolidated) return null;
    const national = voterList.filter(v => !v.isLocal && !v.isIntl).length;
    const local = voterList.filter(v => v.isLocal).length;
    const intl = voterList.filter(v => v.isIntl).length;
    const outletMap: Record<string, number> = {};
    voterList.forEach(v => { outletMap[v.outlet] = (outletMap[v.outlet] ?? 0) + 1; });
    const topOutlets = Object.entries(outletMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { national, local, intl, topOutlets };
  }, [consolidated, voterList]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${color}33` }}>
        <span style={{ color, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label} place
        </span>
        <span style={{ background: color + '22', color, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
          {total}
        </span>
      </div>

      {consolidated && summary ? (
        <div>
          {[
            { label: 'National', n: summary.national, c: 'var(--accent)' },
            { label: 'Local', n: summary.local, c: 'var(--highlight)' },
            { label: 'Intl', n: summary.intl, c: '#a78bfa' },
          ].filter(x => x.n > 0).map(({ label: lbl, n, c }) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: Math.round((n / total) * 100) + '%', maxWidth: 90, height: 5, background: c, borderRadius: 3, minWidth: 3 }} />
              <span style={{ color: c, fontSize: 11, fontWeight: 600, minWidth: 18 }}>{n}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{lbl}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
            {summary.topOutlets.map(([outlet, n]) => (
              <div key={outlet} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{outlet}</span>
                <span style={{ color, fontFamily: 'monospace', fontWeight: 600 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {voterList.map(v => (
            <div key={v.name} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 500, fontSize: 12 }}>{v.name}</span>
                <span style={{
                  background: (CAT_COLORS[v.outletCat] ?? 'var(--accent)') + '22',
                  color: CAT_COLORS[v.outletCat] ?? 'var(--accent)',
                  borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 600, textTransform: 'capitalize',
                }}>
                  {v.outletCat}
                </span>
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

export default function PlayerVoterPanel({ player, award }: { player: string; award: Award }) {
  const rankSections = useMemo(() => {
    const keys = award === 'mvp'
      ? ['first', 'second', 'third', 'fourth', 'fifth']
      : ['first', 'second', 'third'];
    const ballots = (award === 'mvp' ? mvpBallots : award === 'coy' ? coyBallots : dpoyBallots) as Record<string, string>[];

    return keys.map((key, i) => {
      const voterDetails: VoterDetail[] = ballots
        .filter(b => b[key] === player)
        .map(b => {
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
        })
        .filter(Boolean) as VoterDetail[];

      return { label: RANK_LABELS[i], color: RANK_COLORS[i], voters: voterDetails };
    }).filter(s => s.voters.length > 0);
  }, [player, award]);

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
        padding: '16px 28px 20px 60px',
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(rankSections.length, 4)}, minmax(160px, 1fr))`,
        gap: 28,
        maxHeight: 380,
        overflowY: 'auto',
      }}>
        {rankSections.map(({ label, color, voters: voterList }) => (
          <RankSection key={label} label={label} color={color} voterList={voterList} />
        ))}
      </div>
    </motion.div>
  );
}
