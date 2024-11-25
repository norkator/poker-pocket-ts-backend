import seedRandom from 'seedrandom';

const POKER_COLORS: { [key: number]: string } = {
  4: '♠', 	// spade
  3: '♥', 	// heart
  2: '♣', 	// club
  1: '♦' 		// diamond
};

const POKER_NUMBERS: { [key: number]: string } = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

const POKER_NUMBER_RANK: { [key: string]: number } = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};
const POKER_COLOR_RANK: { [key: string]: number } = {
  '♦': 1, '♣': 2, '♥': 3, '♠': 4
};

const POKER_CARDS: PokerCards = {};
for (let color = 1; color <= 4; color++) {
  for (let number = 2; number <= 14; number++) {
    const card = (color << 4) | number;
    POKER_CARDS[card] = `${POKER_NUMBERS[number]}${POKER_COLORS[color]}`;
  }
}
POKER_CARDS[0] = '?';

class Poker {

  static SPADE: number = 4;
  static HEART: number = 3;
  static CLUB: number = 2;
  static DIAMOND: number = 1;

  static COLORS = POKER_COLORS;
  static NUMBERS = POKER_NUMBERS;
  static CARDS = POKER_CARDS;
  static NUMBER_RANK = POKER_NUMBER_RANK;

  constructor(str: string | string[]) {
    return Poker.parse(str);
  }

  static parse(input: string | string[]): number | number[] {
    if (typeof input === 'string') {
      const c = POKER_COLOR_RANK[input.charAt(0)];
      const n = POKER_NUMBER_RANK[input.substring(1)];
      return c && n ? (c << 4) | n : 0;
    } else {
      return input.map((str) => Poker.parse(str) as number);
    }
  }

  static visualize(cards: number | number[]): string | string[] {
    if (typeof cards === 'number') return POKER_CARDS[cards];
    return cards.map((card) => POKER_CARDS[card]);
  }

  static newSet(options?: { noColor?: number[]; noNumber?: number[]; noCard?: number[] }): number[] {
    const {noColor = [], noNumber = [], noCard = []} = options || {};
    const cards: number[] = [];
    for (let color = 1; color <= 4; color++) {
      if (noColor.includes(color)) continue;
      for (let number = 2; number <= 14; number++) {
        if (noNumber.includes(number)) continue;
        const card = (color << 4) | number;
        if (noCard.includes(card)) continue;
        cards.push(card);
      }
    }
    return cards;
  }

  static clone(cards: number[]): number[] {
    return [...cards];
  }

  static draw(cards: number[], n: number): number[] {
    if (cards.length < n) return [];
    const subset: number[] = [];
    while (n-- > 0) {
      const i = Math.floor(Math.random() * cards.length);
      subset.push(cards[i]);
      cards.splice(i, 1);
    }
    return subset;
  }

  static drawRandom(cards: number[], n: number): number[] {
    const rng = seedRandom();
    if (cards.length < n) return [];
    const subset: number[] = [];
    while (n-- > 0) {
      const i = Math.floor(rng() * cards.length);
      subset.push(cards[i]);
      cards.splice(i, 1);
    }
    return subset;
  }

  static randomize(cards: number[]): number[] {
    const randomized = Poker.drawRandom(cards, cards.length);
    while (randomized.length) {
      cards.push(randomized.shift()!);
    }
    return cards;
  }

  static compareColorNumber(a: number, b: number): number {
    if (a === b) return 0;
    const aColor = a >> 4, aNumber = a & 0x0f;
    const bColor = b >> 4, bNumber = b & 0x0f;
    if (aColor === bColor) return aNumber - bNumber;
    return aColor - bColor;
  }

  static compareNumberColor(a: number, b: number): number {
    if (a === b) return 0;
    const aColor = a >> 4, aNumber = a & 0x0f;
    const bColor = b >> 4, bNumber = b & 0x0f;
    if (aNumber === bNumber) return aColor - bColor;
    return aNumber - bNumber;
  }

  static compare(a: number, b: number): number {
    return (a & 0xff) - (b & 0xff);
  }

  static sort(cards: number[]): number[] {
    return cards.sort(Poker.compareColorNumber).reverse();
  }

  // static sortByColor(cards: number[]): number[] {
  //   return Poker.sort(cards); // Alias for `sort`
  // }

  static sortByNumber(cards: number[]): number[] {
    return cards.sort(Poker.compareNumberColor).reverse();
  }

  static merge(a: number[], b: number[]): number[] {
    return a.concat(b);
  }

  // static print(cards: number[]): void {
  //   const str = cards.join(',');
  //   console.log(str);
  // }

  // static view(cards: number[]): void {
  //   const str = Poker.visualize(cards).join(',');
  //   console.log(str);
  // }

}
