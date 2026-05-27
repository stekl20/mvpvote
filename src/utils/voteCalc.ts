export type MvpBallot = {
  voter_id: string;
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
};

export type CoyBallot = {
  voter_id: string;
  first: string;
  second: string;
  third: string;
};

export type DpoyBallot = {
  voter_id: string;
  first: string;
  second: string;
  third: string;
};

const MVP_POINTS = [10, 7, 5, 3, 1];
const COY_POINTS = [5, 3, 1];
// DPOY: 1st and 2nd are both worth 5 points, 3rd = 1
const DPOY_POINTS = [5, 5, 1];
const RANK_KEYS_5 = ['first', 'second', 'third', 'fourth', 'fifth'] as const;
const RANK_KEYS_3 = ['first', 'second', 'third'] as const;

export function calculateMvpPoints(ballot: MvpBallot): Record<string, number> {
  const result: Record<string, number> = {};
  RANK_KEYS_5.forEach((key, i) => {
    const player = ballot[key];
    result[player] = (result[player] || 0) + MVP_POINTS[i];
  });
  return result;
}

export function getConsensusRanking(ballots: MvpBallot[]): Array<{ player: string; points: number; votes: Record<string, number> }> {
  const totals: Record<string, number> = {};
  const voteCounts: Record<string, Record<string, number>> = {};

  ballots.forEach(ballot => {
    RANK_KEYS_5.forEach((key, i) => {
      const player = ballot[key];
      totals[player] = (totals[player] || 0) + MVP_POINTS[i];
      if (!voteCounts[player]) voteCounts[player] = { first: 0, second: 0, third: 0, fourth: 0, fifth: 0 };
      voteCounts[player][key] = (voteCounts[player][key] || 0) + 1;
    });
  });

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([player, points]) => ({ player, points, votes: voteCounts[player] || {} }));
}

export function getCoyConsensus(ballots: CoyBallot[]): Array<{ player: string; points: number; votes: Record<string, number> }> {
  const totals: Record<string, number> = {};
  const voteCounts: Record<string, Record<string, number>> = {};

  ballots.forEach(ballot => {
    RANK_KEYS_3.forEach((key, i) => {
      const player = ballot[key];
      totals[player] = (totals[player] || 0) + COY_POINTS[i];
      if (!voteCounts[player]) voteCounts[player] = { first: 0, second: 0, third: 0 };
      voteCounts[player][key] = (voteCounts[player][key] || 0) + 1;
    });
  });

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([player, points]) => ({ player, points, votes: voteCounts[player] || {} }));
}

export function getDpoyConsensus(ballots: DpoyBallot[]): Array<{ player: string; points: number; votes: Record<string, number> }> {
  const totals: Record<string, number> = {};
  const voteCounts: Record<string, Record<string, number>> = {};

  ballots.forEach(ballot => {
    RANK_KEYS_3.forEach((key, i) => {
      const player = ballot[key];
      totals[player] = (totals[player] || 0) + DPOY_POINTS[i];
      if (!voteCounts[player]) voteCounts[player] = { first: 0, second: 0, third: 0 };
      voteCounts[player][key] = (voteCounts[player][key] || 0) + 1;
    });
  });

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([player, points]) => ({ player, points, votes: voteCounts[player] || {} }));
}

export function getVoterDeviation(ballot: MvpBallot, consensus: Array<{ player: string }>): number {
  const consensusRank: Record<string, number> = {};
  consensus.forEach((item, i) => { consensusRank[item.player] = i + 1; });

  let distance = 0;
  RANK_KEYS_5.forEach((key, i) => {
    const player = ballot[key];
    const voterRank = i + 1;
    const consensusPos = consensusRank[player] ?? 6;
    distance += Math.abs(voterRank - consensusPos);
  });
  return distance;
}

export function getOutlierVoters(ballots: MvpBallot[], n: number): Array<{ voter_id: string; deviation: number }> {
  const consensus = getConsensusRanking(ballots);
  return ballots
    .map(ballot => ({ voter_id: ballot.voter_id, deviation: getVoterDeviation(ballot, consensus) }))
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, n);
}

export function groupVotersByOutletType<T extends { outlet_category: string }>(voters: T[]): Record<string, T[]> {
  return voters.reduce((acc, voter) => {
    const cat = voter.outlet_category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(voter);
    return acc;
  }, {} as Record<string, T[]>);
}

export function groupVotersByMarket<T extends { nba_team_affiliation: string | null }>(voters: T[]): Record<string, T[]> {
  return voters.reduce((acc, voter) => {
    const team = voter.nba_team_affiliation ?? 'None';
    if (!acc[team]) acc[team] = [];
    acc[team].push(voter);
    return acc;
  }, {} as Record<string, T[]>);
}

export function getAverageRankByGroup(
  groupVoterIds: string[],
  ballots: MvpBallot[],
  players: string[]
): Record<string, number> {
  const voterSet = new Set(groupVoterIds);
  const groupBallots = ballots.filter(b => voterSet.has(b.voter_id));
  const result: Record<string, number> = {};

  players.forEach(player => {
    const ranks: number[] = [];
    groupBallots.forEach(ballot => {
      RANK_KEYS_5.forEach((key, i) => {
        if (ballot[key] === player) ranks.push(i + 1);
      });
      const mentioned = RANK_KEYS_5.some(key => ballot[key] === player);
      if (!mentioned) ranks.push(6);
    });
    result[player] = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 6;
  });

  return result;
}

export function getVoterDeviation3(
  ballot: CoyBallot | DpoyBallot,
  consensus: Array<{ player: string }>
): number {
  const consensusRank: Record<string, number> = {};
  consensus.forEach((item, i) => { consensusRank[item.player] = i + 1; });
  let distance = 0;
  RANK_KEYS_3.forEach((key, i) => {
    const player = (ballot as Record<string, string>)[key];
    const voterRank = i + 1;
    const consensusPos = consensusRank[player] ?? 4;
    distance += Math.abs(voterRank - consensusPos);
  });
  return distance;
}

export function getOutlierVotersCoy(ballots: CoyBallot[], n: number): Array<{ voter_id: string; deviation: number }> {
  const consensus = getCoyConsensus(ballots);
  return ballots
    .map(ballot => ({ voter_id: ballot.voter_id, deviation: getVoterDeviation3(ballot, consensus) }))
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, n);
}

export function getOutlierVotersDpoy(ballots: DpoyBallot[], n: number): Array<{ voter_id: string; deviation: number }> {
  const consensus = getDpoyConsensus(ballots);
  return ballots
    .map(ballot => ({ voter_id: ballot.voter_id, deviation: getVoterDeviation3(ballot, consensus) }))
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, n);
}

export function linearRegression(data: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX = data.reduce((s, d) => s + d.x, 0);
  const sumY = data.reduce((s, d) => s + d.y, 0);
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
