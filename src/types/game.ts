export type GamePhase =
  | 'lobby'
  | 'intro'
  | 'opening_select'
  | 'opening_review'
  | 'opening_vote'
  | 'opening_result'
  | 'followup_prompt'
  | 'followup_work'
  | 'followup_review'
  | 'followup_vote'
  | 'followup_result'
  | 'final_results';

export interface Card {
  id: string;
  text: string;
  isSerious?: boolean;
}

export interface Team {
  id: string; // auth UID
  name: string;
  joinedAt: number;
  isReady: boolean;
  connected?: boolean;
  lastActiveAt?: number;
}

export interface OpeningSubmission {
  teamUid: string;
  teamName: string;
  cardId: string;
  cardText: string;
  submittedAt: number;
}

export interface OpeningVote {
  voterUid: string;
  candidateUid: string;
  votedAt: number;
}

export interface OpeningResult {
  winningTeamUid: string;
  winningTeamName: string;
  winningCardText: string;
  winningCardId: string;
  voteCounts: Record<string, number>;
  tiedUids?: string[];
  isTieResolved?: boolean;
}

export interface FollowupSubmission {
  teamUid: string;
  teamName: string;
  text: string;
  submittedAt: number;
  updatedAt?: number;
}

export interface FollowupVote {
  voterUid: string;
  candidateUid: string;
  votedAt: number;
}

export interface FollowupResult {
  voteCounts: Record<string, number>;
  roundWinnerUids: string[];
  discussionWinnerUid?: string;
  isTieResolved?: boolean;
}

export interface GameState {
  currentRound: number; // 0 to 6
  currentPhase: GamePhase;
  phaseStartedAt: number;
  phaseEndsAt?: number | null;
  timerStatus: 'running' | 'paused' | 'stopped';
  timerRemainingSeconds?: number;
  submissionsOpen: boolean;
  votingOpen: boolean;
}

export interface SessionData {
  hostUid: string;
  createdAt: number;
  lobbyLocked: boolean;
  game: GameState;
  teams?: Record<string, Team>;
  deals?: Record<number, Record<string, Card[]>>;
  openingSubmissions?: Record<number, Record<string, OpeningSubmission>>;
  openingVotes?: Record<number, Record<string, OpeningVote>>;
  openingResults?: Record<number, OpeningResult>;
  followupSubmissions?: Record<number, Record<string, FollowupSubmission>>;
  followupVotes?: Record<number, Record<string, FollowupVote>>;
  followupResults?: Record<number, FollowupResult>;
}

export interface LeaderboardEntry {
  teamUid: string;
  teamName: string;
  totalVotes: number;
  rank: number;
  isTied: boolean;
}
