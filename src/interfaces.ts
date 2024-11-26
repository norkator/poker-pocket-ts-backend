import WebSocket from 'ws';
import {PlayerState} from './enums';

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

export interface RoomInfoInterface {
  roomId: number;
  roomName: string;
  roomMinBet: number;
  playerCount: number;
  maxSeats: number;
}

export interface HoldemTableInterface {

  resetRoomParams(): void;

  getRoomInfo(): RoomInfoInterface;

  triggerNewGame(): void;

  cleanSpectators(): void;

  startGame(): void;

  newGame(): void;

  staging(): void;

}

export interface Player {
  playerId: string | number;
  playerName: string;
  playerMoney: number;
  isDealer: boolean;
}

export interface RoomParamsResponse {
  key: string;
  data: {
    gameStarted: boolean;
    playerCount: number;
    roomMinBet: number;
    middleCards: any[];
    playersData: PlayerData[];
  };
}

export interface PlayerData {
  playerId: string | number;
  playerName: string;
  playerMoney: number;
  isDealer: boolean;
}
