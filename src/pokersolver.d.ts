declare module 'pokersolver' {
  export class Hand {
    constructor(cards: string[]);

    static solve(hands: string[]): any;

    static winners(hands: Hand[]): Hand[];

    rank: string;
    cards: string[];

    toString(): string;
  }
}
