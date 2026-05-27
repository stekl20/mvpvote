import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import VoteBreakdownBar from '../components/VoteBreakdownBar';
import PlayerVoterPanel from '../components/PlayerVoterPanel';
import OutlierSpotlight from '../components/OutlierSpotlight';
import mvpBallots from '../data/mvp_ballots.json';
import coyBallots from '../data/coy_ballots.json';
import dpoyBallots from '../data/dpoy_ballots.json';
import { getConsensusRanking, getCoyConsensus, getDpoyConsensus, type MvpBallot, type CoyBallot, type DpoyBallot } from '../utils/voteCalc';

type Award = 'mvp' | 'coy' | 'dpoy';

const AWARD_LABELS: Record<Award, string> = {
  mvp: 'MVP',
  coy: 'Coach of the Year',
  dpoy: 'Def. Player of the Year',
};

function useAwardData(award: Award) {
  return useMemo(() => {
    if (award === 'mvp') {
      const consensus = getConsensusRanking(mvpBallots as MvpBallot[]);
      return { consensus, rankCount: 5 as const, totalVoters: mvpBallots.length };
    }
    if (award === 'coy') {
      const consensus = getCoyConsensus(coyBallots as CoyBallot[]);
      return { consensus, rankCount: 3 as const, totalVoters: coyBallots.length };
    }
    const consensus = getDpoyConsensus(dpoyBallots as DpoyBallot[]);
    return { consensus, rankCount: 3 as const, totalVoters: dpoyBallots.length };
  }, [award]);
}

export default function Distribution() {
  const [award, setAward] = useState<Award>('mvp');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const { consensus, rankCount, totalVoters } = useAwardData(award);

  // Reset selection when switching awards
  useEffect(() => { setSelectedPlayer(null); }, [award]);

  const maxPoints = consensus[0]?.points ?? 1;
  const displayed = consensus.filter(r => r.points > 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="flex items-center gap-4 mb-8">
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Vote Breakdown</h1>
        <div className="flex gap-2 ml-auto">
          {(Object.keys(AWARD_LABELS) as Award[]).map(a => (
            <button
              key={a}
              onClick={() => setAward(a)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: award === a ? 'var(--accent)' : 'var(--surface)',
                color: award === a ? '#fff' : 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: award === a ? 600 : 400,
              }}
            >
              {AWARD_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
        <div style={{ padding: '28px 32px 20px' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{AWARD_LABELS[award]} — Vote Distribution</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Click a player name to see who voted for them, where they work, and where they're based.
          </p>
        </div>
        {displayed.map((row, i) => (
          <div key={row.player}>
            <div style={{ padding: '0 32px' }}>
              <VoteBreakdownBar
                player={row.player}
                votes={row.votes}
                totalVoters={totalVoters}
                maxPoints={maxPoints}
                totalPoints={row.points}
                rank={i + 1}
                rankCount={rankCount}
                isSelected={selectedPlayer === row.player}
                onNameClick={() => setSelectedPlayer(selectedPlayer === row.player ? null : row.player)}
              />
            </div>
            <AnimatePresence>
              {selectedPlayer === row.player && (
                <PlayerVoterPanel key={`panel-${row.player}`} player={row.player} award={award} />
              )}
            </AnimatePresence>
          </div>
        ))}
        <div style={{ height: 8 }} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '28px 32px' }}>
        <OutlierSpotlight award={award} />
      </div>
    </div>
  );
}
