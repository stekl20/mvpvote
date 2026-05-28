import { useMemo } from 'react';
import mvpBallots from '../data/mvp_ballots.json';
import coyBallots from '../data/coy_ballots.json';
import dpoyBallots from '../data/dpoy_ballots.json';
import voters from '../data/voters.json';
import {
  getOutlierVoters, getOutlierVotersCoy, getOutlierVotersDpoy,
  getConsensusRanking, getCoyConsensus, getDpoyConsensus,
  type MvpBallot, type CoyBallot, type DpoyBallot,
} from '../utils/voteCalc';

type Award = 'mvp' | 'coy' | 'dpoy';

const RANK_KEYS_5 = ['first', 'second', 'third', 'fourth', 'fifth'] as const;
const RANK_KEYS_3 = ['first', 'second', 'third'] as const;

const AWARD_LABELS: Record<Award, string> = {
  mvp: 'MVP',
  coy: 'Coach of the Year',
  dpoy: 'Def. Player of the Year',
};

export default function OutlierSpotlight({ award }: { award: Award }) {
  const { consensus, outliers, rankKeys } = useMemo(() => {
    if (award === 'mvp') {
      const cons = getConsensusRanking(mvpBallots as MvpBallot[]).slice(0, 5).map(r => r.player);
      return { consensus: cons, outliers: getOutlierVoters(mvpBallots as MvpBallot[], 10), rankKeys: RANK_KEYS_5 as readonly string[] };
    }
    if (award === 'coy') {
      const cons = getCoyConsensus(coyBallots as CoyBallot[]).slice(0, 3).map(r => r.player);
      return { consensus: cons, outliers: getOutlierVotersCoy(coyBallots as CoyBallot[], 10), rankKeys: RANK_KEYS_3 as readonly string[] };
    }
    const cons = getDpoyConsensus(dpoyBallots as DpoyBallot[]).slice(0, 3).map(r => r.player);
    return { consensus: cons, outliers: getOutlierVotersDpoy(dpoyBallots as DpoyBallot[], 10), rankKeys: RANK_KEYS_3 as readonly string[] };
  }, [award]);

  const unrankedPos = rankKeys.length + 1;
  const consensusRank: Record<string, number> = {};
  consensus.forEach((p, i) => { consensusRank[p] = i + 1; });

  const RANK_COLORS = ['var(--rank-1)', 'var(--rank-2)', 'var(--rank-3)', 'var(--rank-4)', 'var(--rank-5)'];

  return (
    <div>
      <div className="mobile-stack flex items-center gap-4 mb-6">
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Most Distinctive {AWARD_LABELS[award]} Ballots</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Voters whose ballot differed most from the median. Ranked by Manhattan distance from consensus.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', background: 'var(--surface-2)', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Consensus order</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {consensus.map((p, i) => (
              <span key={p} style={{ fontSize: 12, color: RANK_COLORS[i] }}>
                {i + 1}. {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {outliers.map(({ voter_id, deviation }, idx) => {
          const voter = voters.find(v => v.id === voter_id);
          const ballot = (award === 'mvp' ? mvpBallots : award === 'coy' ? coyBallots : dpoyBallots)
            .find(b => b.voter_id === voter_id) as Record<string, string> | undefined;
          if (!voter || !ballot) return null;

          return (
            <div key={voter_id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
              <div className="flex items-start gap-4">
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12, width: 24, paddingTop: 2 }}>#{idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span style={{ fontWeight: 600 }}>{voter.name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{voter.outlet}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: 12 }}>
                      distance: <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 700 }}>{deviation}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {rankKeys.map((key, i) => {
                      const pick = ballot[key];
                      const voterRank = i + 1;
                      const consensusPos = consensusRank[pick] ?? unrankedPos;
                      const diff = Math.abs(voterRank - consensusPos);
                      const isDistinctive = diff >= 2 || consensusPos === unrankedPos;
                      return (
                        <div key={key} style={{
                          background: isDistinctive ? 'rgba(255,208,96,0.12)' : 'var(--surface-2)',
                          border: `1px solid ${isDistinctive ? 'var(--highlight)' : 'var(--border)'}`,
                          borderRadius: 6,
                          padding: '6px 10px',
                          minWidth: 100,
                          flexShrink: 0,
                        }}>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>#{i + 1}</div>
                          <div style={{ fontSize: 13, fontWeight: isDistinctive ? 700 : 400, color: isDistinctive ? 'var(--highlight)' : 'var(--text-primary)' }}>
                            {pick}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                            consensus #{consensusPos <= rankKeys.length ? consensusPos : 'NR'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
