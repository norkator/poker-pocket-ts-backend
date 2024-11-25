import * as fs from 'fs';
import * as path from 'path';

class PokerEvaluator {

  static HAND_TYPES: string[] = [
    'invalid hand',
    'high card',
    'one pair',
    'two pairs',
    'three of a kind',
    'straight',
    'flush',
    'full house',
    'four of a kind',
    'straight flush',
  ];


  static CARDS: { [key: string]: number } = {
    '2♣': 1,
    '2♦': 2,
    '2♥': 3,
    '2♠': 4,
    '3♣': 5,
    '3♦': 6,
    '3♥': 7,
    '3♠': 8,
    '4♣': 9,
    '4♦': 10,
    '4♥': 11,
    '4♠': 12,
    '5♣': 13,
    '5♦': 14,
    '5♥': 15,
    '5♠': 16,
    '6♣': 17,
    '6♦': 18,
    '6♥': 19,
    '6♠': 20,
    '7♣': 21,
    '7♦': 22,
    '7♥': 23,
    '7♠': 24,
    '8♣': 25,
    '8♦': 26,
    '8♥': 27,
    '8♠': 28,
    '9♣': 29,
    '9♦': 30,
    '9♥': 31,
    '9♠': 32,
    '10♣': 33,
    '10♦': 34,
    '10♥': 35,
    '10♠': 36,
    'J♣': 37,
    'J♦': 38,
    'J♥': 39,
    'J♠': 40,
    'Q♣': 41,
    'Q♦': 42,
    'Q♥': 43,
    'Q♠': 44,
    'K♣': 45,
    'K♦': 46,
    'K♥': 47,
    'K♠': 48,
    'A♣': 49,
    'A♦': 50,
    'A♥': 51,
    'A♠': 52,
  };

  static ranks: Buffer;

  static evalHand(cards: (string | number)[]): { handType: number; handRank: number; value: number; handName: string } {
    if (!this.ranks) {
      throw new Error("HandRanks.dat not loaded");
    }

    if (![3, 5, 6, 7].includes(cards.length)) {
      throw new Error("Hand must be 3, 5, 6, or 7 cards");
    }

    // Convert string cards to numerical representations
    if (typeof cards[0] === "string") {
      cards = cards.map((card) => {
        if (typeof card !== "string") throw new Error("Invalid card format");
        return this.CARDS[card];
      });
    }

    return this.eval(cards as number[]);
  }

  static eval(cards: number[]): { handType: number; handRank: number; value: number; handName: string } {
    let p = 53;
    for (const card of cards) {
      p = this.evalCard(p + card);
    }

    if (cards.length === 5 || cards.length === 6) {
      p = this.evalCard(p);
    }

    return {
      handType: p >> 12,
      handRank: p & 0x00000fff,
      value: p,
      handName: this.HAND_TYPES[p >> 12],
    };
  }

  static evalCard(card: number): number {
    return this.ranks.readUInt32LE(card * 4);
  }
}

// Load HandRanks.dat
const ranksFile = path.join(__dirname, '../app/HandRanks.dat');
PokerEvaluator.ranks = fs.readFileSync(ranksFile);


export default PokerEvaluator;
