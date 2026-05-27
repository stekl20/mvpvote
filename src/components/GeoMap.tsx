import { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import voters from '../data/voters.json';
import mvpBallots from '../data/mvp_ballots.json';
import { getConsensusRanking, type MvpBallot } from '../utils/voteCalc';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const PLAYER_COLORS: Record<string, string> = {
  SGA: 'var(--rank-1)',
  Wembanyama: '#a78bfa',
  Jokic: '#34d399',
  Cunningham: '#f87171',
  Luka: '#fb923c',
};

function getColor(pick: string) {
  return PLAYER_COLORS[pick] || 'var(--text-secondary)';
}

// Region classification
const REGIONS: Record<string, string> = {
  WA: 'West Coast', OR: 'West Coast', CA: 'West Coast',
  CO: 'Mountain', UT: 'Mountain', NV: 'Mountain', AZ: 'Mountain', NM: 'Mountain', MT: 'Mountain', ID: 'Mountain',
  IL: 'Midwest', OH: 'Midwest', IN: 'Midwest', MI: 'Midwest', MN: 'Midwest', WI: 'Midwest', MO: 'Midwest', KS: 'Midwest', IA: 'Midwest',
  TX: 'South', OK: 'South', LA: 'South', FL: 'South', GA: 'South', TN: 'South', NC: 'South', SC: 'South', KY: 'South', AL: 'South', MS: 'South', VA: 'South',
  NY: 'Northeast', NJ: 'Northeast', PA: 'Northeast', CT: 'Northeast', MA: 'Northeast', DC: 'Northeast', MD: 'Northeast', RI: 'Northeast', DE: 'Northeast', NH: 'Northeast',
};

function getRegion(voter: typeof voters[0]): string {
  if (voter.location_country === 'Canada') return 'Canada';
  if (voter.location_country !== 'USA') return 'International';
  return REGIONS[voter.location_state ?? ''] ?? 'Other US';
}

type Voter = typeof voters[0];
type Tooltip = { voter: Voter; x: number; y: number } | null;

const REGION_ORDER = ['West Coast', 'Mountain', 'Midwest', 'South', 'Northeast', 'Canada', 'International'];

export default function GeoMap() {
  const [localOnly, setLocalOnly] = useState(false);
  const [highlightPlayer, setHighlightPlayer] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);

  const consensus = useMemo(() => getConsensusRanking(mvpBallots as MvpBallot[]).slice(0, 5).map(r => r.player), []);

  const getMvpPick = (voterId: string) => mvpBallots.find(b => b.voter_id === voterId)?.first ?? null;

  const displayed = useMemo(() => {
    let v = voters.filter(voter => voter.location_country === 'USA' || voter.location_country === 'Canada');
    if (localOnly) v = v.filter(voter => voter.nba_team_affiliation);
    return v;
  }, [localOnly]);

  // ── Regional breakdown ──────────────────────────────────────────────────
  const regionalStats = useMemo(() => {
    const all = voters.filter(v => v.lat && v.lng);
    const groups: Record<string, Record<string, number>> = {};
    all.forEach(v => {
      const region = getRegion(v);
      const pick = getMvpPick(v.id) ?? 'Other';
      if (!groups[region]) groups[region] = {};
      groups[region][pick] = (groups[region][pick] ?? 0) + 1;
    });
    return groups;
  }, []);

  return (
    <div>
      {/* Map header */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Voter Geography — MVP #1 Picks</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Each dot = one voter. Click a player in the legend to highlight. US and Canada only.
          </p>
        </div>
        <label className="flex items-center gap-2 ml-auto" style={{ cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={localOnly} onChange={e => setLocalOnly(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }} />
          Local market voters only
        </label>
      </div>

      {/* Map */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
        <ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 900 }} style={{ width: '100%', height: 420 }}>
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography key={geo.rsmKey} geography={geo}
                    fill="var(--surface-2)" stroke="var(--border)" strokeWidth={0.5}
                    style={{ default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
                  />
                ))
              }
            </Geographies>
            {displayed.map(voter => {
              const pick = getMvpPick(voter.id);
              const color = pick ? getColor(pick) : 'var(--text-secondary)';
              if (!voter.lat || !voter.lng) return null;
              const dimmed = highlightPlayer && pick !== highlightPlayer;
              return (
                <Marker key={voter.id} coordinates={[voter.lng, voter.lat]}>
                  <circle
                    r={dimmed ? 4 : 6}
                    fill={color}
                    fillOpacity={dimmed ? 0.15 : 0.9}
                    stroke={dimmed ? 'none' : 'var(--bg)'}
                    strokeWidth={0.8}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => setTooltip({ voter, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div style={{
            position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 40,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, zIndex: 1000,
            pointerEvents: 'none', maxWidth: 220,
          }}>
            <div style={{ fontWeight: 700 }}>{tooltip.voter.name}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{tooltip.voter.outlet}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              {tooltip.voter.location_city}{tooltip.voter.location_state ? `, ${tooltip.voter.location_state}` : ''}
            </div>
            <div style={{ marginTop: 4 }}>
              MVP #1: <span style={{ color: getColor(getMvpPick(tooltip.voter.id) ?? ''), fontWeight: 700 }}>
                {getMvpPick(tooltip.voter.id) ?? '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend — clickable to highlight */}
      <div className="flex flex-wrap gap-4 mt-3 mb-8">
        {consensus.map(p => (
          <div key={p}
            onClick={() => setHighlightPlayer(highlightPlayer === p ? null : p)}
            className="flex items-center gap-2"
            style={{
              fontSize: 13, cursor: 'pointer',
              opacity: highlightPlayer && highlightPlayer !== p ? 0.4 : 1,
              fontWeight: highlightPlayer === p ? 700 : 400,
              transition: 'opacity 0.2s',
            }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: getColor(p) }} />
            {p}
          </div>
        ))}
        <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-secondary)', opacity: highlightPlayer ? 0.4 : 1 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--text-secondary)' }} />
          Other
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 12 }}>N = {displayed.length}</span>
      </div>

      {/* ── Regional Breakdown ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Picks by Region</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 12 }}>
          How did MVP #1 picks cluster geographically?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {REGION_ORDER.filter(r => regionalStats[r]).map(region => {
            const picks = regionalStats[region];
            const total = Object.values(picks).reduce((a, b) => a + b, 0);
            const sorted = Object.entries(picks).sort((a, b) => b[1] - a[1]);
            return (
              <div key={region} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                  {region} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({total})</span>
                </div>
                {sorted.map(([player, count]) => (
                  <div key={player} className="flex items-center gap-2" style={{ marginBottom: 5 }}>
                    <div style={{ width: `${(count / total) * 100}%`, height: 6, background: getColor(player), borderRadius: 3, minWidth: 4 }} />
                    <span style={{ color: getColor(player), fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{player}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: 'auto' }}>{count}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
