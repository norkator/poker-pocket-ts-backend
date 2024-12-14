import {PlayerInterface} from './interfaces';
import {PlayerState} from './enums';
import WebSocket from 'ws';

class Player implements PlayerInterface {
  socket: WebSocket | null;
  playerId: number; // this is incremented for each connection or bot, needed for table seat handling
  isBot: boolean;
  playerMoney: number;
  playerDatabaseId: number = -1;
  public selectedTableId: number = -1;
  playerName: string;
  playerWinCount: number = 0;
  playerLoseCount: number = 0;
  playerCards: string[] = [];
  playerState: PlayerState = PlayerState.NONE;
  totalBet: number = 0;
  isDealer: boolean = false;
  isPlayerTurn: boolean = false;
  playerTimeLeft: number = 0;
  isFold: boolean = false;
  isAllIn: boolean = false;
  roundPlayed: boolean = false;
  handValue: number = 0;
  handName: string | null = null;
  cardsInvolvedOnEvaluation: { value: string; suit: string; }[] = [];

  constructor(
    socket: WebSocket,
    playerId: number,
    playerMoney: number,
    isBot: boolean,
    playerName: string,
  ) {
    this.socket = socket;
    this.playerId = playerId;
    this.isBot = isBot;
    this.playerMoney = playerMoney;
    this.playerName = playerName;
  }

  resetParams(): void {
    this.playerCards = [];
    this.totalBet = 0;
    this.isPlayerTurn = false;
    this.playerTimeLeft = 0;
    this.isFold = false;
    this.isAllIn = false;
    this.handValue = 0;
    this.handName = '';
    this.cardsInvolvedOnEvaluation = [];
    this.isDealer = false;
  }

  checkFunds(tableMinBet: number): void {
    if (this.playerMoney < tableMinBet) {
      this.setStateFold();
    }
  }

  isLoggedInPlayer(): boolean {
    return this.playerDatabaseId !== -1;
  }

  setPlayerMoney(amount: number): void {
    this.playerMoney = amount;
  }

  setStateNone(): void {
    this.playerState = PlayerState.NONE;
  }

  setStateFold(): void {
    this.playerState = PlayerState.FOLD;
    this.isFold = true;
    this.playerTimeLeft = 0;
    this.isPlayerTurn = false;
    this.roundPlayed = true;
  }

  setStateCheck(): void {
    this.playerState = PlayerState.CHECK;
    this.playerTimeLeft = 0;
    this.isPlayerTurn = false;
    this.roundPlayed = true;
  }

  setStateRaise(): void {
    this.playerState = PlayerState.RAISE;
    this.playerTimeLeft = 0;
    this.isPlayerTurn = false;
    this.roundPlayed = true;
  }

}

export {Player};
