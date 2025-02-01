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
  | 'authenticationError'
  | 'createAccount'
  | 'login'
  | 'refreshToken'
  | 'userParams'
  | 'onXPGained'
  | 'userStatistics'
  | 'rankings'
  | 'getUserTable'
  | 'getUserTables'
  | 'createUpdateUserTable'
  | 'invalidTablePassword'
  | 'selectTable'
  | 'selectSpectateTable'
  | 'bottleSpin'
  | 'spinBottle';
export type ClientMessageKey =
  'getTables' // return playable tables list
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
  | 'login'
  | 'refreshToken'
  | 'userParams'
  | 'userStatistics'
  | 'leaveTable'
  | 'rankings'
  | 'getUserTable'
  | 'getUserTables'
  | 'createUpdateUserTable'
  | 'bottleSpin';
export type PlayerAction =
  'CHECK'
  | 'CALL'
  | 'RAISE'
  | 'FOLD'
  | 'DISCARD_AND_DRAW'
  | 'SPIN_BOTTLE'
  | 'HIT'
  | 'STAND'
  | 'DOUBLE_DOWN'
  | 'SPLIT'
  | 'SURRENDER';
export type ClientMessageType = 'clientMessage' | 'warningMessage' | 'errorMessage' | 'infoMessage';
export type ChatMessage = {
  playerName: string;
  message: string;
};
export type BotType = 'NORMAL' | 'AI';
export type PokerCards = {
  [key: string]: string;
};
export type AchievementIcon =
  'shaded_medal_blank'
  | 'shaded_medal_one'
  | 'shaded_medal_two'
  | 'shaded_medal_three'
  | 'shaded_medal_four'
  | 'shaded_medal_five'
  | 'shaded_medal_six'
  | 'shaded_medal_seven'
  | 'shaded_medal_eight'
  | 'shaded_medal_nine';
