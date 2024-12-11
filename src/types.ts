export type Game = 'HOLDEM' | 'FIVE_CARD_DRAW';
export type ResponseKey =
  'connected'
  | 'holeCards'
  | 'theFlop'
  | 'theTurn'
  | 'theRiver'
  | 'allPlayersCards'
  | 'audioCommand'
  | 'clientMessage'
  | 'getTables'
  | 'getSpectateTables'
  | 'tableParams'
  | 'autoPlayActionResult';
export type ClientMessageKey = 'getTables' | 'getSpectateTables';
export type PlayerAction = 'CHECK' | 'CALL' | 'RAISE' | 'FOLD';
export type PokerCards = { [key: number]: string };
