import { describe, it, expect } from 'vitest';
import { dealCardsForRound } from '../src/utils/cardDealer';
import {
  calculateLeaderboard,
  calculateRoundVotes,
  formatRank,
} from '../src/utils/scoreCalculator';
import { validateTeamName, validateWrittenResponse } from '../src/utils/validation';
import { SILLY_CARDS, ROUNDS_DATA } from '../src/data/gameData';
import type { FollowupVote, OpeningVote, Team } from '../src/types/game';

describe('Game Logic & Rules Test Suite', () => {
  // Test 1: Three unique cards per hand
  it('1. deals exactly three unique cards per hand for every team', () => {
    const teamCounts = [2, 3, 5, 6, 10, 15];

    for (const count of teamCounts) {
      const teams = Array.from({ length: count }, (_, i) => `team-${i + 1}`);
      const deals = dealCardsForRound(0, teams);

      expect(Object.keys(deals).length).toBe(count);

      for (const teamId of teams) {
        const hand = deals[teamId];
        expect(hand).toBeDefined();
        expect(hand.length).toBe(3);

        const cardTexts = hand.map((c) => c.text);
        const uniqueTexts = new Set(cardTexts);
        expect(uniqueTexts.size).toBe(3);
      }
    }
  });

  // Test 2: Exactly one serious card distributed with 2 to 5 teams
  it('2. distributes exactly one serious card to one team for 2 to 5 teams', () => {
    for (let count = 2; count <= 5; count++) {
      const teams = Array.from({ length: count }, (_, i) => `team-${i + 1}`);

      // Run multiple iterations to test random distribution
      for (let iter = 0; iter < 10; iter++) {
        const deals = dealCardsForRound(iter % 7, teams);

        let totalSeriousCards = 0;
        let teamsWithSerious = 0;

        for (const teamId of teams) {
          const hand = deals[teamId];
          const seriousInHand = hand.filter((c) => c.isSerious);
          totalSeriousCards += seriousInHand.length;
          if (seriousInHand.length > 0) {
            teamsWithSerious++;
          }
          // Never more than 1 serious card in the same hand
          expect(seriousInHand.length).toBeLessThanOrEqual(1);
        }

        expect(totalSeriousCards).toBe(1);
        expect(teamsWithSerious).toBe(1);
      }
    }
  });

  // Test 3: Two serious cards distributed to different teams with 6 or more teams
  it('3. distributes both serious cards to two different teams with 6 or more teams', () => {
    const counts = [6, 7, 10, 15];

    for (const count of counts) {
      const teams = Array.from({ length: count }, (_, i) => `team-${i + 1}`);

      for (let iter = 0; iter < 10; iter++) {
        const roundIdx = iter % 7;
        const deals = dealCardsForRound(roundIdx, teams);

        let totalSeriousCards = 0;
        const seriousTeams: string[] = [];

        for (const teamId of teams) {
          const hand = deals[teamId];
          const seriousInHand = hand.filter((c) => c.isSerious);
          totalSeriousCards += seriousInHand.length;

          if (seriousInHand.length > 0) {
            seriousTeams.push(teamId);
          }
          // Never place both serious cards in the same hand
          expect(seriousInHand.length).toBeLessThanOrEqual(1);
        }

        expect(totalSeriousCards).toBe(2);
        expect(seriousTeams.length).toBe(2);
        // Must be given to two DIFFERENT teams
        expect(seriousTeams[0]).not.toBe(seriousTeams[1]);
      }
    }
  });

  // Test 4: No silly-card repetition within a round until the pool is exhausted
  it('4. ensures no silly-card repetition within a round until pool is exhausted', () => {
    // 60 silly cards.
    // For 10 teams:
    // With 10 teams, 2 serious cards, total silly cards needed = 10 * 3 - 2 = 28 cards.
    // 28 < 60, so every single silly card across all teams must be unique.
    const teams = Array.from({ length: 10 }, (_, i) => `team-${i + 1}`);
    const deals = dealCardsForRound(0, teams);

    const allSillyTexts: string[] = [];
    for (const teamId of teams) {
      for (const card of deals[teamId]) {
        if (!card.isSerious) {
          allSillyTexts.push(card.text);
        }
      }
    }

    expect(allSillyTexts.length).toBe(28);
    const uniqueSillyTexts = new Set(allSillyTexts);
    expect(uniqueSillyTexts.size).toBe(28);
  });

  // Test 5: Silly pool reset between rounds
  it('5. resets the silly-card pool at the beginning of every round and has 60 silly cards', () => {
    expect(SILLY_CARDS.length).toBe(60);
    expect(ROUNDS_DATA.length).toBe(7);

    const teams = ['team-1', 'team-2', 'team-3'];
    const dealsRound0 = dealCardsForRound(0, teams);
    const dealsRound1 = dealCardsForRound(1, teams);

    // Both rounds deal valid hands
    expect(Object.keys(dealsRound0).length).toBe(3);
    expect(Object.keys(dealsRound1).length).toBe(3);
  });

  // Test 6: No self-voting
  it('6. rejects self-voting in vote calculations and rules', () => {
    const candidateUids = ['team-1', 'team-2', 'team-3'];

    const votes: Record<string, OpeningVote> = {
      'team-1': { voterUid: 'team-1', candidateUid: 'team-1', votedAt: 100 }, // self-vote!
      'team-2': { voterUid: 'team-2', candidateUid: 'team-1', votedAt: 101 },
      'team-3': { voterUid: 'team-3', candidateUid: 'team-2', votedAt: 102 },
    };

    const totals = calculateRoundVotes(votes, candidateUids);

    // Team 1 should only have 1 vote (from team-2), NOT 2 (self-vote rejected)
    expect(totals.counts['team-1']).toBe(1);
    expect(totals.counts['team-2']).toBe(1);
    expect(totals.counts['team-3']).toBe(0);
  });

  // Test 7: Opening votes excluded from final scores
  it('7. strictly excludes opening votes from cumulative leaderboard scores', () => {
    const teams: Record<string, Team> = {
      'team-1': { id: 'team-1', name: 'Al-Farabi', joinedAt: 1, isReady: true },
      'team-2': { id: 'team-2', name: 'Ibn Sina', joinedAt: 2, isReady: true },
    };

    // Follow-up votes only
    const followupVotes: Record<number, Record<string, FollowupVote>> = {
      0: {
        'team-1': { voterUid: 'team-1', candidateUid: 'team-2', votedAt: 100 },
      },
    };

    const leaderboard = calculateLeaderboard(teams, followupVotes);

    const team1Entry = leaderboard.find((e) => e.teamUid === 'team-1');
    const team2Entry = leaderboard.find((e) => e.teamUid === 'team-2');

    // Team 2 received 1 follow-up vote; Team 1 received 0
    expect(team2Entry?.totalVotes).toBe(1);
    expect(team1Entry?.totalVotes).toBe(0);
  });

  // Test 8: Follow-up vote totals calculated correctly
  it('8. calculates cumulative follow-up vote totals across multiple rounds correctly', () => {
    const teams: Record<string, Team> = {
      't1': { id: 't1', name: 'Team One', joinedAt: 1, isReady: true },
      't2': { id: 't2', name: 'Team Two', joinedAt: 2, isReady: true },
      't3': { id: 't3', name: 'Team Three', joinedAt: 3, isReady: true },
    };

    const followupVotes: Record<number, Record<string, FollowupVote>> = {
      0: {
        't1': { voterUid: 't1', candidateUid: 't2', votedAt: 10 },
        't2': { voterUid: 't2', candidateUid: 't3', votedAt: 11 },
        't3': { voterUid: 't3', candidateUid: 't2', votedAt: 12 },
      },
      1: {
        't1': { voterUid: 't1', candidateUid: 't3', votedAt: 20 },
        't2': { voterUid: 't2', candidateUid: 't3', votedAt: 21 },
        't3': { voterUid: 't3', candidateUid: 't1', votedAt: 22 },
      },
    };

    const leaderboard = calculateLeaderboard(teams, followupVotes);

    // t3: received 1 (rnd 0) + 2 (rnd 1) = 3 votes -> Rank 1
    // t2: received 2 (rnd 0) + 0 (rnd 1) = 2 votes -> Rank 2
    // t1: received 0 (rnd 0) + 1 (rnd 1) = 1 vote -> Rank 3
    expect(leaderboard[0].teamUid).toBe('t3');
    expect(leaderboard[0].totalVotes).toBe(3);
    expect(leaderboard[0].rank).toBe(1);

    expect(leaderboard[1].teamUid).toBe('t2');
    expect(leaderboard[1].totalVotes).toBe(2);
    expect(leaderboard[1].rank).toBe(2);

    expect(leaderboard[2].teamUid).toBe('t1');
    expect(leaderboard[2].totalVotes).toBe(1);
    expect(leaderboard[2].rank).toBe(3);
  });

  // Test 9: Team-name length validation
  it('9. validates team names: trimmed, 1-20 characters, non-blank, case-insensitive uniqueness', () => {
    const existing = ['Team Alpha', 'Beta Squad'];

    // Valid
    expect(validateTeamName('Gamma', existing).valid).toBe(true);
    expect(validateTeamName('  Al-Ghazali  ', existing).valid).toBe(true);
    expect(validateTeamName('12345678901234567890', existing).valid).toBe(true); // exactly 20

    // Blank / empty
    expect(validateTeamName('', existing).valid).toBe(false);
    expect(validateTeamName('    ', existing).valid).toBe(false);

    // Too long
    expect(validateTeamName('123456789012345678901', existing).valid).toBe(false); // 21 chars

    // Duplicate case-insensitive
    expect(validateTeamName('team alpha', existing).valid).toBe(false);
    expect(validateTeamName('BETA SQUAD', existing).valid).toBe(false);
    expect(validateTeamName('  team ALPHA  ', existing).valid).toBe(false);

    // Also test written response validation
    expect(validateWrittenResponse('A thoughtful answer').valid).toBe(true);
    expect(validateWrittenResponse('').valid).toBe(false);
    expect(validateWrittenResponse('a'.repeat(1001)).valid).toBe(false);
    expect(validateWrittenResponse('a'.repeat(1000)).valid).toBe(true);
  });

  // Test 10: Final tie handling
  it('10. handles ties honestly without random hidden tiebreakers', () => {
    const teams: Record<string, Team> = {
      't1': { id: 't1', name: 'Team Alpha', joinedAt: 1, isReady: true },
      't2': { id: 't2', name: 'Team Beta', joinedAt: 2, isReady: true },
      't3': { id: 't3', name: 'Team Gamma', joinedAt: 3, isReady: true },
    };

    // Both t1 and t2 get 5 votes; t3 gets 2 votes
    const followupVotes: Record<number, Record<string, FollowupVote>> = {
      0: {
        'v1': { voterUid: 'v1', candidateUid: 't1', votedAt: 1 },
        'v2': { voterUid: 'v2', candidateUid: 't1', votedAt: 2 },
        'v3': { voterUid: 'v3', candidateUid: 't1', votedAt: 3 },
        'v4': { voterUid: 'v4', candidateUid: 't1', votedAt: 4 },
        'v5': { voterUid: 'v5', candidateUid: 't1', votedAt: 5 },

        'v6': { voterUid: 'v6', candidateUid: 't2', votedAt: 6 },
        'v7': { voterUid: 'v7', candidateUid: 't2', votedAt: 7 },
        'v8': { voterUid: 'v8', candidateUid: 't2', votedAt: 8 },
        'v9': { voterUid: 'v9', candidateUid: 't2', votedAt: 9 },
        'v10': { voterUid: 'v10', candidateUid: 't2', votedAt: 10 },

        'v11': { voterUid: 'v11', candidateUid: 't3', votedAt: 11 },
        'v12': { voterUid: 'v12', candidateUid: 't3', votedAt: 12 },
      },
    };

    const leaderboard = calculateLeaderboard(teams, followupVotes);

    // Both top teams should share rank 1
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].isTied).toBe(true);
    expect(leaderboard[1].rank).toBe(1);
    expect(leaderboard[1].isTied).toBe(true);

    // Third team should be rank 3 (standard competition 1-1-3 ranking)
    expect(leaderboard[2].rank).toBe(3);
    expect(leaderboard[2].isTied).toBe(false);

    expect(formatRank(leaderboard[0].rank, leaderboard[0].isTied)).toBe('T-1st');
    expect(formatRank(leaderboard[1].rank, leaderboard[1].isTied)).toBe('T-1st');
    expect(formatRank(leaderboard[2].rank, leaderboard[2].isTied)).toBe('3rd');
  });
});
