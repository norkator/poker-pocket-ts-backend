import WebSocket from 'ws';

export interface GameHandlerInterface {
  onConnection(socket: WebSocket): void;

  onMessage(message: string): void;

  onError(): void;

  onClose(): void;
}


export interface PlayerInterface {
  isBot: boolean;
  connection: WebSocket;
  socketKey: string;
  playerId: string | number;
  playerDatabaseId: number;
  selectedRoomId: number;
  playerName: string | null;
  playerMoney: number;
  playerWinCount: number;
  playerLoseCount: number;
  playerCards: any[];
  playerState: PlayerState;
  totalBet: number;
  isDealer: boolean;
  isPlayerTurn: boolean;
  playerTimeLeft: number;
  isFold: boolean;
  isAllIn: boolean;
  roundPlayed: boolean;
  handValue: number;
  handName: string;
  cardsInvolvedOnEvaluation: any[];

  resetParams(): void;

  checkFunds(roomMinBet: number): void;

  isLoggedInPlayer(): boolean;

  setPlayerMoney(amount: number): void;

  setStateNone(): void;

  setStateFold(): void;

  setStateCheck(): void;

  setStateRaise(): void;
}

