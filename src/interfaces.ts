import WebSocket from 'ws';
import {PlayerState} from './enums';
import {Game, PlayerAction, ResponseKey} from './types';

export interface GameHandlerInterface {
  createStartingTables(): void;

  onConnection(socket: WebSocket): void;

  onMessage(socket: WebSocket, message: string): void;

  onError(): void;

  onClose(): void;
}


export interface PlayerInterface {
  socket: WebSocket | null;
  playerId: number;
  isBot: boolean;
  playerMoney: number;
  playerDatabaseId: number;
  selectedTableId: number;
  playerName: string;
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
  handName: string | null;
  cardsInvolvedOnEvaluation: any[];

  resetParams(): void;

  checkFunds(tableMinBet: number): void;

  isLoggedInPlayer(): boolean;

  setPlayerMoney(amount: number): void;

  setStateNone(): void;

  setStateFold(): void;

  setStateCheck(): void;

  setStateRaise(): void;
}

export interface TableInfoInterface {
  game: Game;
  tableId: number;
  tableName: string;
  tableMinBet: number;
  playerCount: number;
  maxSeats: number;
}

export interface HoldemTableInterface {

  resetTableParams(): void; // Run before each new round

  getTableInfo(): TableInfoInterface;

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

  playerFold(playerId: number): void; // Remember that if small or big blind is not given, folding player must still pay blind

  playerCheck(playerId: number): void; // Player checks but also Call goes through this function

  playerRaise(playerId: number, amount: number): void;

  burnCard(): void; // Burn one card before dealing

  resetPlayerParameters(): void;

  resetPlayerStates(): void;

  verifyPlayersBets(): number; // Method checks that every player has correct amount of money in bet

  checkHighestBet(): void;

  getTableParams(): void;

  sendWebSocketData(player: any, data: any): void; // Send data to table players via this function

  sendWaitingPlayerWebSocketData(player: any, data: any): void; // Send data to waiting table players via this function

  sendSpectatorWebSocketData(spectator: any, data: any): void; // Send table status data to spectators

  cleanSpectators(): void;

  sendAudioCommand(action: string): void; // Needed to be able to play other players command audio on client side

  sendLastPlayerAction(playerId: number, playerAction: PlayerAction): void; // Animated last user action text command

  collectChipsToPotAndSendAction(): boolean; // Collect chips to pot action, collects and clears user total pots for this round

  sendClientMessage(playerObject: any, message: string): void; // Custom message to send to a playing client before object is moved

  getNextDeckCard(): number;

  getPlayerIndex(playerId: number): number;

  hasActivePlayers(): boolean;

  someOneHasAllIn(): void;

  setNextDealerPlayer(): void;

  getNextSmallBlindPlayer(): void;

  getNextBigBlindPlayer(): number;

  resetRoundParameters(): void;

  getNotRoundPlayedPlayer(): number;

  evaluatePlayerCards(currentPlayer: number): HandEvaluationInterface;

  updateLoggedInPlayerDatabaseStatistics(winnerPlayers: any, lastWinnerPlayers: any): void;

  botActionHandler(currentPlayerTurn: number): void;

  removeBotFromTable(currentPlayerTurn: number): void;

  getTableBotCount(): number;

}

export interface Player {
  playerId: string | number;
  playerName: string;
  playerMoney: number;
  isDealer: boolean;
}

export interface PlayerData {
  playerId?: number;
  playerName?: string;
  playerMoney?: number;
  isDealer?: boolean;
  cards?: any;
}

export interface ClientResponse {
  key: ResponseKey;
  data: {
    playerId?: number;
    tables?: any[];
    message?: string;
    command?: string;
    players?: PlayerData[];
    gameStarted?: boolean;
    playerCount?: number;
    tableMinBet?: number;
    middleCards?: any[];
    playersData?: PlayerData[];
    action?: string;
    amount?: number;
  };
}

export interface HandEvaluationInterface {
  value: number;
  handName: string | null;
  handRank?: number;
  handType?: number;
}

export interface BotInterface {
  performAction(): { action: string; amount: number };
}
