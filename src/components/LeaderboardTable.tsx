import React from 'react';
import type { LeaderboardEntry } from '../types/game';
import { formatRank } from '../utils/scoreCalculator';
import { Trophy, Award, Medal } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightTeamUid?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  highlightTeamUid,
}) => {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>No teams on the leaderboard yet.</p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="rank-icon rank-1" size={20} aria-label="1st place" />;
      case 2:
        return <Award className="rank-icon rank-2" size={20} aria-label="2nd place" />;
      case 3:
        return <Medal className="rank-icon rank-3" size={20} aria-label="3rd place" />;
      default:
        return null;
    }
  };

  return (
    <div className="leaderboard-wrapper" role="region" aria-label="Leaderboard">
      <div className="leaderboard-info-banner">
        <span>Cumulative standings based only on written follow-up votes across all rounds.</span>
      </div>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th scope="col" className="col-rank">Rank</th>
            <th scope="col" className="col-team">Team</th>
            <th scope="col" className="col-votes">Follow-up Votes</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isHighlighted = entry.teamUid === highlightTeamUid;
            return (
              <tr
                key={entry.teamUid}
                className={`leaderboard-row ${entry.rank <= 3 ? `top-${entry.rank}` : ''} ${
                  isHighlighted ? 'is-current-team' : ''
                }`}
              >
                <td className="col-rank">
                  <div className="rank-badge-cell">
                    {getRankIcon(entry.rank)}
                    <span className="rank-text">{formatRank(entry.rank, entry.isTied)}</span>
                  </div>
                </td>
                <td className="col-team">
                  <span className="team-name">{entry.teamName}</span>
                  {isHighlighted && <span className="you-pill">You</span>}
                </td>
                <td className="col-votes">
                  <span className="votes-count">{entry.totalVotes}</span>
                  <span className="votes-unit"> {entry.totalVotes === 1 ? 'vote' : 'votes'}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
