import type { FollowupVote, LeaderboardEntry, OpeningVote, Team } from '../types/game';

export interface RoundVoteTotals {
  counts: Record<string, number>;
  topUids: string[];
  maxVotes: number;
  isTie: boolean;
}

export function calculateRoundVotes(
  votes: Record<string, OpeningVote | FollowupVote> | undefined,
  candidateUids: string[]
): RoundVoteTotals {
  const counts: Record<string, number> = {};
  for (const uid of candidateUids) {
    counts[uid] = 0;
  }

  if (votes) {
    for (const vote of Object.values(votes)) {
      if (!vote || !vote.candidateUid) continue;
      // Self-votes are invalid
      if (vote.voterUid === vote.candidateUid) continue;

      if (counts[vote.candidateUid] !== undefined) {
        counts[vote.candidateUid] = (counts[vote.candidateUid] || 0) + 1;
      }
    }
  }

  let maxVotes = -1;
  for (const uid of candidateUids) {
    const val = counts[uid] || 0;
    if (val > maxVotes) {
      maxVotes = val;
    }
  }

  const topUids = candidateUids.filter((uid) => (counts[uid] || 0) === maxVotes && maxVotes > 0);
  const isTie = topUids.length > 1;

  return {
    counts,
    topUids: topUids.length > 0 ? topUids : candidateUids,
    maxVotes: Math.max(0, maxVotes),
    isTie,
  };
}

export function calculateLeaderboard(
  teams: Record<string, Team> | undefined,
  followupVotesByRound: Record<number, Record<string, FollowupVote>> | undefined
): LeaderboardEntry[] {
  if (!teams) return [];

  const teamList = Object.values(teams);
  if (teamList.length === 0) return [];

  // Sum follow-up votes only across all rounds
  const totalVotesByTeam: Record<string, number> = {};
  for (const team of teamList) {
    totalVotesByTeam[team.id] = 0;
  }

  if (followupVotesByRound) {
    for (const roundVotes of Object.values(followupVotesByRound)) {
      if (!roundVotes) continue;
      for (const vote of Object.values(roundVotes)) {
        if (!vote || !vote.candidateUid) continue;
        // Strictly ignore self-votes
        if (vote.voterUid === vote.candidateUid) continue;

        if (totalVotesByTeam[vote.candidateUid] !== undefined) {
          totalVotesByTeam[vote.candidateUid] += 1;
        }
      }
    }
  }

  // Sort descending by totalVotes, then alphabetical by team name for stable display
  const sorted = [...teamList].sort((a, b) => {
    const scoreA = totalVotesByTeam[a.id] || 0;
    const scoreB = totalVotesByTeam[b.id] || 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.name.localeCompare(b.name);
  });

  // Calculate standard competition ranking (1224 ranking) with honest tie indicators
  const entries: LeaderboardEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    const score = totalVotesByTeam[team.id] || 0;

    if (i > 0) {
      const prevScore = totalVotesByTeam[sorted[i - 1].id] || 0;
      if (score < prevScore) {
        currentRank = i + 1;
      }
    }

    entries.push({
      teamUid: team.id,
      teamName: team.name,
      totalVotes: score,
      rank: currentRank,
      isTied: false, // determined in second pass
    });
  }

  // Mark ties
  const rankCounts: Record<number, number> = {};
  for (const entry of entries) {
    rankCounts[entry.rank] = (rankCounts[entry.rank] || 0) + 1;
  }

  for (const entry of entries) {
    if (rankCounts[entry.rank] > 1) {
      entry.isTied = true;
    }
  }

  return entries;
}

export function formatRank(rank: number, isTied: boolean): string {
  const prefix = isTied ? 'T-' : '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = rank % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${prefix}${rank}${suffix}`;
}
