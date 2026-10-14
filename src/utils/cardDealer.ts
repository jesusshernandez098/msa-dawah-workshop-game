import { ROUNDS_DATA, SILLY_CARDS } from '../data/gameData';
import type { Card } from '../types/game';

// Fisher-Yates shuffle with optional custom RNG
function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealCardsForRound(
  roundIndex: number,
  teamIds: string[],
  rng: () => number = Math.random
): Record<string, Card[]> {
  const n = teamIds.length;
  const result: Record<string, Card[]> = {};

  if (n === 0) {
    return result;
  }

  const roundData = ROUNDS_DATA[roundIndex] || ROUNDS_DATA[0];

  // Serious cards for this round
  const seriousCardA: Card = {
    id: `r${roundIndex}-serious-A`,
    text: roundData.seriousCardA,
    isSerious: true,
  };
  const seriousCardB: Card = {
    id: `r${roundIndex}-serious-B`,
    text: roundData.seriousCardB,
    isSerious: true,
  };

  // Determine serious card distribution
  // 2 to 5 teams: 1 serious card to 1 team
  // 6 or more teams: both serious cards to 2 different teams
  const shuffledTeams = shuffleArray(teamIds, rng);
  const seriousAssignments = new Map<string, Card>();

  if (n >= 2 && n <= 5) {
    const chosenSerious = rng() < 0.5 ? seriousCardA : seriousCardB;
    seriousAssignments.set(shuffledTeams[0], chosenSerious);
  } else if (n >= 6) {
    seriousAssignments.set(shuffledTeams[0], seriousCardA);
    seriousAssignments.set(shuffledTeams[1], seriousCardB);
  } else if (n === 1) {
    // Edge case if 1 team: 1 serious card
    seriousAssignments.set(shuffledTeams[0], seriousCardA);
  }

  // Manage silly-card pool for this round
  // Reshuffled at beginning of each round
  let currentSillyDeck = shuffleArray(SILLY_CARDS, rng);
  let deckIndex = 0;

  const drawSillyCard = (excludedTexts: Set<string>): string => {
    // If pool exhausted, reshuffle
    if (deckIndex >= currentSillyDeck.length) {
      currentSillyDeck = shuffleArray(SILLY_CARDS, rng);
      deckIndex = 0;
    }

    // Find first card not in excludedTexts for this hand
    let attempts = 0;
    const maxAttempts = currentSillyDeck.length * 2;
    while (attempts < maxAttempts) {
      const candidate = currentSillyDeck[deckIndex];
      deckIndex++;

      if (!excludedTexts.has(candidate)) {
        return candidate;
      }

      // If reached end of deck during search, reshuffle and continue
      if (deckIndex >= currentSillyDeck.length) {
        currentSillyDeck = shuffleArray(SILLY_CARDS, rng);
        deckIndex = 0;
      }
      attempts++;
    }

    // Fallback if somehow impossible (e.g. pool is smaller than 3)
    return currentSillyDeck[0];
  };

  let sillyCardCounter = 0;

  for (const teamId of teamIds) {
    const hand: Card[] = [];
    const handTexts = new Set<string>();

    const assignedSerious = seriousAssignments.get(teamId);
    if (assignedSerious) {
      hand.push(assignedSerious);
      handTexts.add(assignedSerious.text);
    }

    // Fill remaining slots until exactly 3 cards
    while (hand.length < 3) {
      const sillyText = drawSillyCard(handTexts);
      handTexts.add(sillyText);
      sillyCardCounter++;
      hand.push({
        id: `r${roundIndex}-silly-${sillyCardCounter}`,
        text: sillyText,
        isSerious: false,
      });
    }

    // Shuffle the 3 cards so serious card isn't always at index 0
    result[teamId] = shuffleArray(hand, rng);
  }

  return result;
}
