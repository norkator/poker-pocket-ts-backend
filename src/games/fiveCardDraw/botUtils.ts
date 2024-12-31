import {HandEvaluationInterface} from '../../interfaces';

/**
 * Determines which cards to discard from a hand based on the hand evaluation.
 * @param myHand - Array of cards in the format ['Q♠', 'Q♥', 'K♥', '3♦', '2♦']
 * @param handEvaluation - Object containing the hand evaluation details.
 * @param behavior - Bot behavior: 'perfect', 'balanced', or 'risky'.
 * @returns Array of cards to discard.
 */
export const botDiscard = (
  myHand: string[],
  handEvaluation: HandEvaluationInterface,
  behavior: 'perfect' | 'balanced' | 'risky' = 'balanced'
): string[] => {
  const {handName} = handEvaluation;
  let discardDecisions: boolean[] = new Array(myHand.length).fill(false); // Default: Keep all cards

  switch (handName) {
    case 'high card':
      // Discard all except the highest card
      const highCardIndex = myHand
        .map(card => "23456789TJQKA".indexOf(card.slice(0, -1)) + 2)
        .reduce((highest, value, index, array) => (value > array[highest] ? index : highest), 0);

      discardDecisions = myHand.map((_, index) => index !== highCardIndex);
      break;

    case 'one pair':
      // Discard cards not part of the pair
      const pairRank = myHand.find(card =>
        myHand.filter(c => c.startsWith(card.slice(0, -1))).length === 2
      )?.slice(0, -1);

      discardDecisions = myHand.map(card => pairRank ? !card.startsWith(pairRank) : true);
      break;

    case 'two pairs':
      // Discard the kicker
      const pairRanks = Array.from(
        new Set(
          myHand.map(card => card.slice(0, -1)) // Extract ranks
        )
      ).filter(rank => myHand.filter(card => card.startsWith(rank)).length === 2);

      discardDecisions = myHand.map(card => !pairRanks.includes(card.slice(0, -1)));
      break;

    case 'three of a kind':
      // Discard cards not part of the trips
      const tripRank = myHand.find(card =>
        myHand.filter(c => c.startsWith(card.slice(0, -1))).length === 3
      )?.slice(0, -1);

      discardDecisions = myHand.map(card => tripRank ? !card.startsWith(tripRank) : true);
      break;

    case 'straight':
    case 'flush':
    case 'full house':
    case 'four of a kind':
    case 'straight flush':
      // Keep all cards
      break;

    case 'invalid hand':
      // Discard all cards
      discardDecisions = myHand.map(() => true);
      break;

    default:
      // Unexpected case: Randomly discard some cards
      discardDecisions = myHand.map(() => Math.random() < 0.5);
      break;
  }

  // Simulate mistakes or imperfect logic for 'balanced' and other behaviors
  if (behavior !== 'perfect' && Math.random() < 0.2) {
    const mistakeIndex = Math.floor(Math.random() * myHand.length);
    discardDecisions[mistakeIndex] = !discardDecisions[mistakeIndex];
  }

  // Return the cards to discard
  return myHand.filter((_, index) => discardDecisions[index]);
};
