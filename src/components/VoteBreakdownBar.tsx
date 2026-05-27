import { motion } from 'framer-motion';

type Props = {
  player: string;
  votes: Record<string, number>;
  totalVoters: number;
  maxPoints: number;
  totalPoints: number;
  rank: number;
  rankCount?: 3 | 5;
  isSelected?: boolean;
  onNameClick?: () => void;
};

const RANK_COLORS = ['var(--rank-1)', 'var(--rank-2)', 'var(--rank-3)', 'var(--rank-4)', 'var(--rank-5)'];
const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th'];
const RANK_KEYS = ['first', 'second', 'third', 'fourth', 'fifth'];

export default function VoteBreakdownBar({ player, votes, totalVoters, maxPoints, totalPoints, rank, rankCount = 5, isSelected, onNameClick }: Props) {
  const barPct = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
  const activeKeys = RANK_KEYS.slice(0, rankCount);
  const activeLabels = RANK_LABELS.slice(0, rankCount);
  const activeColors = RANK_COLORS.slice(0, rankCount);

  const segments = activeKeys.map((key, i) => ({
    label: activeLabels[i],
    color: activeColors[i],
    count: votes[key] || 0,
    pct: totalVoters > 0 ? ((votes[key] || 0) / totalVoters) * 100 : 0,
  })).filter(s => s.count > 0);

  return (
    <div style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border)', padding: '16px 0' }}>
      <div className="flex items-center gap-4 mb-2">
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, width: 24, textAlign: 'right' }}>#{rank}</span>
        <span
          onClick={onNameClick}
          style={{
            fontWeight: 600, fontSize: 15, width: 220,
            cursor: onNameClick ? 'pointer' : 'default',
            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
            borderBottom: onNameClick ? `1px dashed ${isSelected ? 'var(--accent)' : 'var(--border)'}` : 'none',
            transition: 'color 0.15s',
          }}
        >
          {player} <span style={{ fontSize: 10, opacity: 0.6 }}>{isSelected ? '▲' : '▼'}</span>
        </span>
        <span style={{ color: 'var(--highlight)', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, width: 60 }}>
          {totalPoints} pts
        </span>
        <div className="flex-1 relative h-7 rounded overflow-hidden" style={{ background: 'var(--border)' }}>
          {segments.map((seg, i) => {
            const left = segments.slice(0, i).reduce((acc, s) => acc + s.pct, 0) * (barPct / 100);
            const width = seg.pct * (barPct / 100);
            return (
              <motion.div
                key={seg.label}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  width: `${width}%`,
                  height: '100%',
                  background: seg.color,
                  transformOrigin: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#0a0a0f',
                }}
                title={`${seg.label}: ${seg.count} votes`}
              >
                {seg.count > 2 ? seg.count : ''}
              </motion.div>
            );
          })}
        </div>
        <div className="flex gap-3 ml-2">
          {activeKeys.map((key, i) => (
            <div key={key} className="text-center" style={{ width: 28 }}>
              <div style={{ color: activeColors[i], fontWeight: 700, fontSize: 13 }}>{votes[key] || 0}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{activeLabels[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
