import { useState, useMemo, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Customized } from 'recharts';
import { Label } from 'recharts';
import playerStats from '../data/player_stats.json';
import dpoyStats from '../data/dpoy_stats.json';
import mvpBallots from '../data/mvp_ballots.json';
import dpoyBallots from '../data/dpoy_ballots.json';
import allnbaBallots from '../data/allnba_ballots.json';
import alldefBallots from '../data/alldef_ballots.json';
import { getConsensusRanking, getDpoyConsensus, linearRegression, type MvpBallot, type DpoyBallot } from '../utils/voteCalc';

type Award = 'mvp' | 'allnba' | 'dpoy' | 'alldef';
type OffStatKey = 'pts' | 'win_shares' | 'bpm' | 'vorp' | 'ts_pct';
type DefStatKey = 'blk' | 'stl' | 'def_ws' | 'dbpm' | 'def_on_off';

const OFF_STAT_LABELS: Record<OffStatKey, string> = {
  pts: 'Points Per Game',
  win_shares: 'Win Shares',
  bpm: 'Box Plus/Minus',
  vorp: 'VORP',
  ts_pct: 'True Shooting %',
};

const DEF_STAT_LABELS: Record<DefStatKey, string> = {
  blk: 'Blocks Per Game',
  stl: 'Steals Per Game',
  def_ws: 'Defensive Win Shares',
  dbpm: 'Defensive Box Plus/Minus',
  def_on_off: 'Def On/Off Impact',
};

const OFF_STAT_DESCRIPTIONS: Record<OffStatKey, string> = {
  pts: "Average points scored per game. Simple volume metric — doesn't capture efficiency or two-way play.",
  win_shares: 'Estimates how many wins a player contributed to their team. Combines offensive and defensive impact. Scale: ~1 WS per 400 minutes of average play.',
  bpm: "Box Plus/Minus — estimates a player's points-above-average contribution per 100 possessions vs. a league-average player.",
  vorp: 'Value Over Replacement Player — cumulative version of BPM. Shows total value above a replacement-level player scaled to team wins.',
  ts_pct: 'True Shooting % — shooting efficiency accounting for 2-pointers, 3-pointers, and free throws. League average ~57%.',
};

const DEF_STAT_DESCRIPTIONS: Record<DefStatKey, string> = {
  blk: 'Blocks per game. Direct indicator of shot-alteration ability and rim protection.',
  stl: 'Steals per game. Measures perimeter disruption and active hands in passing lanes.',
  def_ws: 'Defensive Win Shares — estimated wins contributed through defensive play.',
  dbpm: 'Defensive Box Plus/Minus — estimated defensive points prevented per 100 possessions vs. average.',
  def_on_off: "Team defensive improvement (pts/100) when player is on court vs. off. Higher = stronger defensive presence. (Raw value negated so higher is better.)",
};

const AWARD_LABELS: Record<Award, string> = {
  mvp: 'MVP',
  allnba: 'All-NBA',
  dpoy: 'DPOY',
  alldef: 'All-Def',
};

const VOTE_LABELS: Record<Award, string> = {
  mvp: 'MVP Vote Points',
  allnba: 'All-NBA Vote Points',
  dpoy: 'DPOY Vote Points',
  alldef: 'All-Def Vote Points',
};

function computeAllNbaPoints(): Record<string, number> {
  const pts: Record<string, number> = {};
  (allnbaBallots as Array<{ voter_id: string; first: string[]; second: string[]; third: string[] }>)
    .forEach(b => {
      b.first.forEach(p => { pts[p] = (pts[p] || 0) + 5; });
      b.second.forEach(p => { pts[p] = (pts[p] || 0) + 3; });
      b.third.forEach(p => { pts[p] = (pts[p] || 0) + 1; });
    });
  return pts;
}

function computeAllDefPoints(): Record<string, number> {
  const pts: Record<string, number> = {};
  (alldefBallots as Array<{ voter_id: string; first: string[]; second: string[] }>)
    .forEach(b => {
      b.first.forEach(p => { pts[p] = (pts[p] || 0) + 2; });
      b.second.forEach(p => { pts[p] = (pts[p] || 0) + 1; });
    });
  return pts;
}

const allNbaPoints = computeAllNbaPoints();
const allDefPoints = computeAllDefPoints();

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const isHighlighted = payload.notable;
  return (
    <g>
      <circle cx={cx} cy={cy} r={isHighlighted ? 8 : 6}
        fill={isHighlighted ? 'var(--highlight)' : 'var(--accent)'}
        fillOpacity={0.85}
        stroke={isHighlighted ? 'var(--highlight)' : 'var(--accent)'}
        strokeWidth={1} />
      {(isHighlighted || payload.topRanked) && (
        <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--text-primary)" fontSize={11} fontWeight={600}>
          {payload.name.split(' ').pop()}
        </text>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: 'var(--text-secondary)' }}>Team: {d.team} ({d.team_record})</div>
      <div style={{ color: 'var(--accent)', marginTop: 4 }}>Vote pts: <strong>{d.y}</strong></div>
      <div style={{ color: 'var(--text-secondary)' }}>{d.statLabel}: <strong style={{ color: 'var(--text-primary)' }}>{d.displayX ?? d.x}</strong></div>
    </div>
  );
};

export default function StatsScatter() {
  const [award, setAward] = useState<Award>('mvp');
  const [offStat, setOffStat] = useState<OffStatKey>('win_shares');
  const [defStat, setDefStat] = useState<DefStatKey>('dbpm');
  const [zoomedIn, setZoomedIn] = useState(false);

  const isOffensive = award === 'mvp' || award === 'allnba';

  // Reset zoom and default stat when switching between offensive/defensive
  useEffect(() => {
    setZoomedIn(false);
    if (!isOffensive) setDefStat('dbpm');
    else setOffStat('win_shares');
  }, [isOffensive]);

  useEffect(() => { setZoomedIn(false); }, [award]);

  const votePoints = useMemo(() => {
    if (award === 'mvp') {
      return Object.fromEntries(getConsensusRanking(mvpBallots as MvpBallot[]).map(r => [r.player, r.points]));
    }
    if (award === 'allnba') return allNbaPoints;
    if (award === 'dpoy') {
      return Object.fromEntries(getDpoyConsensus(dpoyBallots as DpoyBallot[]).map(r => [r.player, r.points]));
    }
    return allDefPoints;
  }, [award]);

  const data = useMemo(() => {
    if (isOffensive) {
      const statKey = offStat;
      return playerStats
        .map(p => {
          const pts = votePoints[p.player_id] ?? 0;
          const rawX = p[statKey] as number;
          return { x: rawX, displayX: rawX, y: pts, name: p.name, team: p.team, team_record: p.team_record, statLabel: OFF_STAT_LABELS[statKey], player_id: p.player_id, notable: false, topRanked: false };
        })
        .filter(d => d.y > 0);
    } else {
      const statKey = defStat;
      return dpoyStats
        .map(p => {
          const pts = votePoints[p.player_id] ?? 0;
          const rawX = p[statKey] as number;
          const x = statKey === 'def_on_off' ? -rawX : rawX;
          return { x, displayX: rawX, y: pts, name: p.name, team: p.team, team_record: p.team_record, statLabel: DEF_STAT_LABELS[statKey], player_id: p.player_id, notable: false, topRanked: false };
        })
        .filter(d => d.y > 0);
    }
  }, [award, offStat, defStat, votePoints, isOffensive]);

  const reg = useMemo(() => linearRegression(data), [data]);

  const dataWithNotable = useMemo(() => {
    const yVals = data.map(d => d.y);
    const yRange = Math.max(...yVals) - Math.min(...yVals);
    const sorted = [...data].sort((a, b) => b.y - a.y);
    const topIds = new Set(sorted.slice(0, 4).map(d => d.player_id));
    return data.map(d => {
      const yPred = reg.slope * d.x + reg.intercept;
      const normalizedDist = Math.abs(d.y - yPred) / (yRange || 1);
      return { ...d, notable: normalizedDist > 0.25, topRanked: topIds.has(d.player_id) };
    });
  }, [data, reg]);

  // Zoom: clip Y to the 90th percentile to spread out the cluster
  const yVals = data.map(d => d.y).sort((a, b) => a - b);
  const yDomainMax = zoomedIn
    ? yVals[Math.floor(yVals.length * 0.75)] * 1.15
    : Math.max(...yVals) * 1.08;
  const yDomainMin = Math.min(...yVals) * 0.9;

  const xVals = data.map(d => d.x);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);

  const RegressionLine = (props: any) => {
    const xAxis = props.xAxisMap && (Object.values(props.xAxisMap)[0] as any);
    const yAxis = props.yAxisMap && (Object.values(props.yAxisMap)[0] as any);
    if (!xAxis?.scale || !yAxis?.scale) return null;
    const x1 = xAxis.scale(xMin);
    const x2 = xAxis.scale(xMax);
    const y1 = yAxis.scale(reg.slope * xMin + reg.intercept);
    const y2 = yAxis.scale(reg.slope * xMax + reg.intercept);
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.5} />;
  };

  const hasOutlier = Math.max(...yVals) > yVals[Math.floor(yVals.length * 0.75)] * 2;

  const currentStatLabel = isOffensive ? OFF_STAT_LABELS[offStat] : DEF_STAT_LABELS[defStat];
  const currentDescription = isOffensive ? OFF_STAT_DESCRIPTIONS[offStat] : DEF_STAT_DESCRIPTIONS[defStat];

  return (
    <div>
      {/* Award toggle */}
      <div className="mobile-stack flex items-center gap-4 mb-6">
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Stats vs. Vote Points</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Select an award and statistic. Points further from the regression line received more or fewer votes than their stats suggest.
          </p>
        </div>
        <div className="award-btns flex gap-2 ml-auto">
          {(Object.keys(AWARD_LABELS) as Award[]).map(a => (
            <button key={a} onClick={() => setAward(a)} style={{
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: award === a ? 'var(--accent)' : 'var(--surface)',
              color: award === a ? '#fff' : 'var(--text-secondary)',
              fontSize: 13, cursor: 'pointer',
              fontWeight: award === a ? 600 : 400,
            }}>
              {AWARD_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Stat selector + description */}
      <div className="mobile-stack flex items-center gap-4 mb-4">
        {isOffensive ? (
          <select value={offStat} onChange={e => setOffStat(e.target.value as OffStatKey)}
            className="mobile-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {(Object.entries(OFF_STAT_LABELS) as [OffStatKey, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        ) : (
          <select value={defStat} onChange={e => setDefStat(e.target.value as DefStatKey)}
            className="mobile-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {(Object.entries(DEF_STAT_LABELS) as [DefStatKey, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        )}
        <div style={{
          flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{currentStatLabel}:</span>
          <span>{currentDescription}</span>
        </div>
      </div>

      {hasOutlier && (
        <div className="flex items-center justify-end mb-2" style={{ gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {zoomedIn ? 'Showing cluster only (outlier hidden)' : 'Showing all data'}
          </span>
          <button onClick={() => setZoomedIn(z => !z)} style={{
            padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
            background: zoomedIn ? 'var(--accent)' : 'var(--surface)',
            color: zoomedIn ? '#fff' : 'var(--text-secondary)',
            fontSize: 12, cursor: 'pointer',
          }}>
            {zoomedIn ? 'Show all' : 'Zoom to cluster'}
          </button>
        </div>
      )}

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" dataKey="x" domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            tickLine={false} axisLine={{ stroke: 'var(--border)' }}>
            <Label value={currentStatLabel} offset={-10} position="insideBottom" fill="var(--text-secondary)" fontSize={12} />
          </XAxis>
          <YAxis type="number" dataKey="y" domain={[yDomainMin, yDomainMax]}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            tickLine={false} axisLine={{ stroke: 'var(--border)' }}>
            <Label value={VOTE_LABELS[award]} angle={-90} position="insideLeft" fill="var(--text-secondary)" fontSize={12} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <Customized component={RegressionLine} />
          <Scatter data={dataWithNotable} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-6 mt-4 justify-center" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
          Standard
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--highlight)' }} />
          Notable divergence from trend
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 24, height: 2, background: 'var(--accent)', opacity: 0.5 }} />
          Best-fit line
        </div>
      </div>
    </div>
  );
}
