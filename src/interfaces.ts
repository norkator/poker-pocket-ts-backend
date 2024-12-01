import WebSocket from 'ws';
import {PlayerState} from './enums';
import {PlayerAction} from "./types";

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

  resetRoomParams(): void; // Run before each new round

  getRoomInfo(): RoomInfoInterface;

  triggerNewGame(): void;

  cleanSpectators(): void;

  startGame(): void;

  newGame(): void; // New deck here

  staging(): void;

  holeCards(): void; // Give players two cards

  theFlop(): void; // Show three middle cards

  theTurn(): void; // Show fourth card

  theRiver(): void; // Show fifth card

  sendAllPlayersCards(): void; // Send all player cards to all clients before round results call

  roundResultsEnd(): void; // Calculate winner and transfer money

  roundResultsMiddleOfTheGame(): void; // Game has stopped middle of the game due everyone folded or disconnected except one

  bettingRound(currentPlayerTurn: number): void;

  bettingRoundTimer(currentPlayerTurn: number): void;

  clearTimers(): void;

  sendStatusUpdate(): void;

  playerFold(connectionId: any, socketKey: any): void; // Remember that if small or big blind is not given, folding player must still pay blind

  playerCheck(connectionId: any, socketKey: any): void; // Player checks but also Call goes through this function

  playerRaise(connectionId: any, socketKey: any, amount: number): void;

  burnCard(): void; // Burn one card before dealing

  resetPlayerParameters(): void;

  resetPlayerStates(): void;

  verifyPlayersBets(): number; // Method checks that every player has correct amount of money in bet

  checkHighestBet(): void;

  getRoomParams(): void;

  sendWebSocketData(player: any, data: any): void; // Send data to table players via this function

  sendWaitingPlayerWebSocketData(player: any, data: any): void; // Send data to waiting table players via this function

  sendSpectatorWebSocketData(spectator: any, data: any): void; // Send room status data to spectators

  cleanSpectators(): void;

  sendAudioCommand(action: string): void; // Needed to be able to play other players command audio on client side

  sendLastPlayerAction(connectionId: any, playerAction: PlayerAction): void; // Animated last user action text command

  collectChipsToPotAndSendAction(): boolean; // Collect chips to pot action, collects and clears user total pots for this round

  sendClientMessage(playerObject: any, message: string): void; // Custom message to send to a playing client before object is moved

  getNextDeckCard(): number;

  getPlayerId(connectionId: any): number;

  hasActivePlayers(): boolean;

  someOneHasAllIn(): void;

  setNextDealerPlayer(): void;

  getNextSmallBlindPlayer(): void;

  getNextBigBlindPlayer(): number;

  resetRoundParameters(): void;

  getNotRoundPlayedPlayer(): number;

  evaluatePlayerCards(currentPlayer: number): HandEvaluationInterface;

  updateLoggedInPlayerDatabaseStatistics(): void;

  botActionHandler(currentPlayerTurn: number): void;

  removeBotFromRoom(currentPlayerTurn: number): void;

  getRoomBotCount(): number;

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

export interface ClientResponse {
  key: string;
  data: {
    message?: string;
    command?: string;
  };
}

export interface HandEvaluationInterface {
  value: number | null;
  handName: string | null;
  handRank?: number;
  handType?: number;
}
