export type Game = 'HOLDEM' | 'FIVE_CARD_DRAW';
export type ResponseKey =
  'connected'
  | 'holeCards'
  | 'dealHoleCards'
  | 'theFlop'
  | 'theTurn'
  | 'theRiver'
  | 'allPlayersCards'
  | 'audioCommand'
  | 'clientMessage'
  | 'getTables'
  | 'getSpectateTables'
  | 'tableParams'
  | 'autoPlayActionResult'
  | 'errorMessage'
  | 'warningMessage'
  | 'infoMessage';
export type ClientMessageKey = 'getTables' | 'getSpectateTables';
export type PlayerAction = 'CHECK' | 'CALL' | 'RAISE' | 'FOLD';
export type ClientMessageType = 'clientMessage' | 'warningMessage' | 'errorMessage' | 'infoMessage';
