export type Game = 'HOLDEM' | 'FIVE_CARD_DRAW' | 'BOTTLE_SPIN';
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
  | 'infoMessage'
  | 'discardAndDraw'
  | 'newCards'
  | 'chatMessage'
  | 'getChatMessages'
  | 'authenticationError';
export type ClientMessageKey =
  'getTables'
  | 'getSpectateTables'
  | 'selectTable'
  | 'selectSpectateTable'
  | 'getTableParams'
  | 'setFold'
  | 'setCheck'
  | 'setRaise'
  | 'autoPlayAction'
  | 'discardAndDraw'
  | 'chatMessage'
  | 'getChatMessages'
  | 'createAccount'
  | 'login';
export type PlayerAction = 'CHECK' | 'CALL' | 'RAISE' | 'FOLD' | 'DISCARD_AND_DRAW';
export type ClientMessageType = 'clientMessage' | 'warningMessage' | 'errorMessage' | 'infoMessage';
export type ChatMessage = {
  playerName: string;
  message: string;
};
