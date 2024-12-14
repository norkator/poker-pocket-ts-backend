import {gameConfig} from '../../gameConfig';
import {HoldemStage, PlayerState, SocketState} from '../../enums';
import {
  ClientResponse,
  HandEvaluationInterface,
  HoldemTableInterface,
  PlayerData, PlayerInterface, TableInfoInterface,
} from '../../interfaces';
import logger from '../../logger';
import {Poker} from '../../poker';
import {Game, PlayerAction} from '../../types';
import {asciiToStringCardsArray, getRandomInt, sendClientMessage, stringToAsciiCardsArray} from '../../utils';
import {PlayerActions} from '../../constants';
import evaluator from '../../evaluator';
import {HoldemBot} from './holdemBot';
import {Hand} from 'pokersolver';
import {Player} from '../../player';

export class HoldemTable implements HoldemTableInterface {
  game: Game = 'HOLDEM';
  holdemType: number;
  tableId: number;
  tableMinBet: number;
  public tableName: string;
  public maxSeats: number;
  minPlayers: number;
  turnTimeOut: number;
  currentStage: number;
  holeCardsGiven: boolean;
  totalPot: number;
  bots: any[];
  public players: Player[];
  public playersToAppend: Player[];
  playersTemp: Player[];
  spectators: Player[];
  spectatorsTemp: Player[];
  deck: any | null;
  deckCard: number;
  deckSize: number;
  deckCardsBurned: number;
  middleCards: any[];
  gameStarted: boolean;
  turnTimeOutObj: NodeJS.Timeout | null;
  turnIntervalObj: NodeJS.Timeout | null;
  updateJsonTemp: any | null;
  current_player_turn: number;
  currentTurnText: string;
  currentHighestBet: number;
  isCallSituation: boolean;
  isResultsCall: boolean;
  roundWinnerPlayerIds: number[];
  roundWinnerPlayerCards: any[];
  currentStatusText: string;
  lastUserAction: { playerId: number; actionText: string | null };
  dealerPlayerArrayIndex: number;
  smallBlindPlayerArrayIndex: number;
  smallBlindGiven: boolean;
  bigBlindGiven: boolean;
  bigBlindPlayerHadTurn: boolean;
  lastWinnerPlayers: any[];
  collectingPot: boolean;

  constructor(
    holdemType: number,
    tableId: number,
  ) {
    this.holdemType = holdemType;
    this.tableId = tableId;
    this.tableMinBet = gameConfig.games.holdEm.games[holdemType].minBet;
    this.tableName = 'Table ' + tableId;
    this.maxSeats = gameConfig.games.holdEm.games[holdemType].max_seats;
    this.minPlayers = gameConfig.games.holdEm.games[holdemType].minPlayers;
    this.turnTimeOut = gameConfig.games.holdEm.games[holdemType].turnCountdown * 1000;
    this.currentStage = HoldemStage.ONE_HOLE_CARDS;
    this.holeCardsGiven = false;
    this.totalPot = 0;
    this.bots = [];
    this.players = [];
    this.playersToAppend = [];
    this.playersTemp = [];
    this.spectators = [];
    this.spectatorsTemp = [];
    this.deck = null;
    this.deckCard = 0;
    this.deckSize = 52;
    this.deckCardsBurned = 0;
    this.middleCards = [];
    this.gameStarted = false;
    this.turnTimeOutObj = null;
    this.turnIntervalObj = null;
    this.updateJsonTemp = null;
    this.current_player_turn = 0;
    this.currentTurnText = '';
    this.currentHighestBet = 0;
    this.isCallSituation = false;
    this.isResultsCall = false;
    this.roundWinnerPlayerIds = [];
    this.roundWinnerPlayerCards = [];
    this.currentStatusText = 'Waiting players...';
    this.lastUserAction = {playerId: -1, actionText: null};
    this.dealerPlayerArrayIndex = -1;
    this.smallBlindPlayerArrayIndex = -1;
    this.smallBlindGiven = false;
    this.bigBlindGiven = false;
    this.bigBlindPlayerHadTurn = false;
    this.lastWinnerPlayers = [];
    this.collectingPot = false;
  }

  resetTableParams(): void {
    this.currentStage = HoldemStage.ONE_HOLE_CARDS;
    this.holeCardsGiven = false;
    this.totalPot = 0;
    this.middleCards = [];
    this.currentHighestBet = 0;
    this.updateJsonTemp = null;
    this.current_player_turn = 0;
    this.isResultsCall = false;
    this.roundWinnerPlayerIds = [];
    this.roundWinnerPlayerCards = [];
    this.lastUserAction = {playerId: -1, actionText: null};
    this.smallBlindGiven = false;
    this.bigBlindGiven = false;
    this.bigBlindPlayerHadTurn = false;
    this.collectingPot = false;
    this.deckCardsBurned = 0;
  }

  getTableInfo(): TableInfoInterface {
    return {
      game: this.game,
      tableId: this.tableId,
      tableName: this.tableName,
      tableMinBet: this.tableMinBet,
      playerCount: (this.players.length + this.playersToAppend.length + this.bots.length),
      maxSeats: this.maxSeats
    };
  }

  triggerNewGame(): void {
    this.cleanSpectators();
    if (!this.gameStarted) {
      this.playersTemp = [];
      for (const player of this.players) {
        if (player && player.socket && player.playerMoney > this.tableMinBet) {
          this.playersTemp.push(player);
        } else if (player && !player.isBot) {
          sendClientMessage(
            player.socket, 'Not enough money to join the game. You are now spectator.', 'NO_MONEY_CHANGED_TO_SPECTATOR'
          );
          this.spectators.push(player);
        }
      }
      this.players = this.playersTemp.filter(player => player && player.socket);
      this.playersTemp = [];
      if (this.playersToAppend.length > 0) {
        for (const player of this.playersToAppend) {
          if (player.socket && player.playerMoney > this.tableMinBet) {
            this.players.push(player);
          } else if (!player.isBot) {
            sendClientMessage(
              player.socket, 'Not enough money to join the game. You are now spectator.', 'NO_MONEY_CHANGED_TO_SPECTATOR'
            );
            this.spectators.push(player);
          }
        }
        this.playersToAppend = [];
        if (this.players.length >= this.minPlayers) {
          setTimeout(() => {
            this.startGame();
          }, gameConfig.common.startGameTimeOut);
        } else {
          logger.info(`Table ${this.tableName} has not enough players`);
        }
      } else {
        if (this.players.length >= this.minPlayers) {
          logger.info(`Table ${this.tableName} no new players to append... starting new game`);
          setTimeout(() => {
            this.startGame();
          }, gameConfig.common.startGameTimeOut);
        } else {
          this.currentStatusText = `${this.minPlayers} players needed to start a new game...`;
        }
      }
    } else {
      logger.warn(`Cant append more players since round is running for table: ${this.tableName}`);
    }
  }

  cleanSpectators(): void {
    this.spectatorsTemp = [];
    for (const spectator of this.spectators) {
      if (spectator && spectator.socket) {
        this.spectatorsTemp.push(spectator);
      }
    }
    this.spectators = this.spectatorsTemp.filter(spectator => spectator && spectator.socket);
    this.spectatorsTemp = [];
  }

  startGame(): void {
    if (!this.gameStarted) {
      this.gameStarted = true;
      logger.info('Game started for table: ' + this.tableName);
      this.resetTableParams();
      this.resetPlayerParameters(); // Reset players (resets dealer param too)
      this.setNextDealerPlayer(); // Get next dealer player
      this.getNextSmallBlindPlayer(); // Get small blind player
      let response = this.getTableParams();
      logger.debug(JSON.stringify(response));
      for (let i = 0; i < this.players.length; i++) {
        this.players[i].isFold = false;
        this.sendWebSocketData(i, response);
      }
      for (let w = 0; w < this.playersToAppend.length; w++) {
        this.sendWaitingPlayerWebSocketData(w, response);
      }
      for (let s = 0; s < this.spectators.length; s++) {
        this.sendSpectatorWebSocketData(s, response);
      }
      this.newGame();
    }
  }

  getTableParams(): ClientResponse {
    const response: ClientResponse = {
      key: 'tableParams',
      data: {
        gameStarted: this.currentStage >= HoldemStage.ONE_HOLE_CARDS && this.holeCardsGiven,
        playerCount: this.players.length,
        tableMinBet: this.tableMinBet,
        middleCards: this.middleCards,
        playersData: [],
      },
    };
    response.data.playersData = this.players.map((player: PlayerInterface) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      playerMoney: player.playerMoney,
      isDealer: player.isDealer,
    }));
    return response;
  }

  newGame(): void {
    // Always shuffle new deck
    this.deck = Poker.visualize(Poker.randomize(Poker.newSet()));
    this.deckSize = this.deck.length;
    this.deckCard = 0;
    this.sendStatusUpdate();
    setTimeout(() => {
      this.staging();
    }, 1000);
  };

  staging(): void {
    switch (this.currentStage) {
      case HoldemStage.ONE_HOLE_CARDS: // Give cards
        this.currentStatusText = 'Hole cards';
        this.currentTurnText = '';
        this.burnCard(); // Burn one card before dealing cards
        this.holeCards();
        break;
      case HoldemStage.TWO_PRE_FLOP: // First betting round
        this.currentStatusText = 'Pre flop & small blind & big blind';
        this.isCallSituation = false; // table related reset
        this.resetPlayerStates();
        this.resetRoundParameters();
        this.current_player_turn = this.smallBlindPlayerArrayIndex; // Round starting player is always small blind player
        this.currentTurnText = '';
        this.currentHighestBet = 0;
        this.bettingRound(this.smallBlindPlayerArrayIndex); // this.bettingRound(this.current_player_turn);
        break;
      case HoldemStage.THREE_THE_FLOP: // Show three middle cards
        this.currentStatusText = 'The flop';
        this.currentTurnText = '';
        this.burnCard(); // Burn one card before dealing cards
        this.theFlop();
        break;
      case HoldemStage.FOUR_POST_FLOP: // Second betting round
        this.currentStatusText = 'Post flop';
        this.currentTurnText = '';
        this.isCallSituation = false; // table related reset
        this.resetPlayerStates();
        this.resetRoundParameters();
        this.current_player_turn = this.smallBlindPlayerArrayIndex; // Round starting player is always small blind player
        this.currentHighestBet = 0;
        this.bettingRound(this.current_player_turn); // this.bettingRound(this.current_player_turn);
        break;
      case HoldemStage.FIVE_THE_TURN: // Show fourth card
        this.currentStatusText = 'The turn';
        this.currentTurnText = '';
        this.burnCard(); // Burn one card before dealing cards
        this.theTurn();
        break;
      case HoldemStage.SIX_THE_POST_TURN: // Third betting round
        this.currentStatusText = 'Post turn';
        this.currentTurnText = '';
        this.isCallSituation = false; // table related reset
        this.resetPlayerStates();
        this.resetRoundParameters();
        this.current_player_turn = this.smallBlindPlayerArrayIndex; // Round starting player is always small blind player
        this.currentHighestBet = 0;
        this.bettingRound(this.current_player_turn); // this.bettingRound(this.current_player_turn);
        break;
      case HoldemStage.SEVEN_THE_RIVER: // Show fifth card
        this.currentStatusText = 'The river';
        this.currentTurnText = '';
        this.burnCard(); // Burn one card before dealing cards
        this.theRiver();
        break;
      case HoldemStage.EIGHT_THE_SHOW_DOWN: // Fourth and final betting round
        this.currentStatusText = 'The show down';
        this.currentTurnText = '';
        this.isCallSituation = false; // table related reset
        this.resetPlayerStates();
        this.resetRoundParameters();
        this.current_player_turn = this.smallBlindPlayerArrayIndex; // Round starting player is always small blind player
        this.currentHighestBet = 0;
        this.bettingRound(this.current_player_turn); // this.bettingRound(this.current_player_turn);
        break;
      case HoldemStage.NINE_SEND_ALL_PLAYERS_CARDS: // Send all players cards here before results to all players and spectators
        this.sendAllPlayersCards(); // Avoiding cheating with this
        break;
      case HoldemStage.TEN_RESULTS:
        this.roundResultsEnd();
        break;
      default:
        return;
    }
    this.sendStatusUpdate();
  }

  sendStatusUpdate(): void {
    const response = {
      key: 'statusUpdate',
      data: {
        totalPot: this.totalPot,
        tableMinBet: this.tableMinBet,
        currentStatus: this.currentStatusText,
        currentTurnText: this.currentTurnText,
        middleCards: this.middleCards,
        playersData: [] as any[],
        isCallSituation: this.isCallSituation,
        isResultsCall: this.isResultsCall,
        roundWinnerPlayerIds: this.roundWinnerPlayerIds,
        roundWinnerPlayerCards: this.roundWinnerPlayerCards,
        tableName: this.tableName,
        playingPlayersCount: this.players.length,
        appendPlayersCount: this.playersToAppend.length,
        spectatorsCount: this.spectators.length,
        deckStatus: `${this.deckCard}/${this.deckSize}`,
        deckCardsBurned: this.deckCardsBurned,
        collectingPot: this.collectingPot,
      },
    };
    response.data.playersData = this.players.map(player => ({
      playerId: player.playerId,
      playerName: player.playerName,
      playerMoney: player.playerMoney,
      totalBet: player.totalBet,
      isPlayerTurn: player.isPlayerTurn,
      isFold: player.isFold,
      timeLeft: player.playerTimeLeft,
      timeBar: (player.playerTimeLeft / this.turnTimeOut) * 100,
    }));
    if (JSON.stringify(this.updateJsonTemp) !== JSON.stringify(response)) {
      this.updateJsonTemp = response;
      this.players.forEach((_, i) => this.sendWebSocketData(i, response));
      this.playersToAppend.forEach((_, w) => this.sendWaitingPlayerWebSocketData(w, response));
      this.spectators.forEach((_, s) => this.sendSpectatorWebSocketData(s, response));
    }
  }


  holeCards(): void {
    this.currentStage = HoldemStage.TWO_PRE_FLOP;
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].playerCards[0] = this.getNextDeckCard();
      this.players[i].playerCards[1] = this.getNextDeckCard();
    }
    let response: ClientResponse = {key: 'holeCards', data: {}};
    for (let i = 0; i < this.players.length; i++) {
      response.data.players = [];
      for (let p = 0; p < this.players.length; p++) {
        let playerData: PlayerData = {};
        playerData.playerId = this.players[p].playerId;
        playerData.playerName = this.players[p].playerName;
        this.players[p].playerId === this.players[i].playerId ? playerData.cards = this.players[p].playerCards : playerData.cards = [];
        response.data.players.push(playerData);
      }
      this.sendWebSocketData(i, response);
    }
    response.data.players = [];
    for (let i = 0; i < this.players.length; i++) {
      let playerData: PlayerData = {};
      playerData.playerId = this.players[i].playerId;
      playerData.cards = []; // Empty cards, otherwise causes security problem
      response.data.players.push(playerData);
    }
    for (let i = 0; i < this.spectators.length; i++) {
      this.sendSpectatorWebSocketData(i, response);
    }
    this.holeCardsGiven = true;
    setTimeout(() => {
      this.staging();
    }, 3000);
  }

  theFlop(): void {
    this.currentStage = HoldemStage.FOUR_POST_FLOP;
    this.middleCards[0] = this.getNextDeckCard();
    this.middleCards[1] = this.getNextDeckCard();
    this.middleCards[2] = this.getNextDeckCard();
    let response: ClientResponse = {key: 'theFlop', data: {}};
    response.data.middleCards = this.middleCards;
    for (let p = 0; p < this.players.length; p++) {
      this.sendWebSocketData(p, response);
    }
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
    setTimeout(() => {
      this.staging();
    }, 3000);
  }

  theTurn(): void {
    this.currentStage = HoldemStage.SIX_THE_POST_TURN;
    this.middleCards[3] = this.getNextDeckCard();
    let response: ClientResponse = {key: 'theTurn', data: {}};
    response.data.middleCards = this.middleCards;
    for (let p = 0; p < this.players.length; p++) {
      this.sendWebSocketData(p, response);
    }
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
    setTimeout(() => {
      this.staging();
    }, 2000);
  }

  theRiver(): void {
    this.currentStage = HoldemStage.EIGHT_THE_SHOW_DOWN;
    this.middleCards[4] = this.getNextDeckCard();
    let response: ClientResponse = {key: 'theRiver', data: {}};
    response.data.middleCards = this.middleCards;
    for (let p = 0; p < this.players.length; p++) {
      this.sendWebSocketData(p, response);
    }
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
    setTimeout(() => {
      this.staging();
    }, 2000);
  }

  sendAllPlayersCards(): void {
    this.currentStage = HoldemStage.TEN_RESULTS;
    let response: ClientResponse = {key: 'allPlayersCards', data: {}};
    response.data.players = [];
    for (let i = 0; i < this.players.length; i++) {
      let playerData: PlayerData = {};
      playerData.playerId = this.players[i].playerId;
      playerData.cards = this.players[i].playerCards;
      response.data.players.push(playerData);
    }
    for (let p = 0; p < this.players.length; p++) {
      this.sendWebSocketData(p, response);
    }
    for (let a = 0; a < this.playersToAppend.length; a++) {
      this.sendWaitingPlayerWebSocketData(a, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
    setTimeout(() => {
      this.staging();
    }, 3000);
  }

  roundResultsEnd(): void {
    let winnerPlayers = [];
    let currentHighestRank = 0;
    let l = this.players.length;
    for (let i = 0; i < l; i++) {
      if (!this.players[i].isFold) {
        // Use poker solver to get hand used in evaluation
        let hand = Hand.solve(asciiToStringCardsArray([
          this.middleCards[0], this.middleCards[1], this.middleCards[2], this.middleCards[3], this.middleCards[4],
          this.players[i].playerCards[0], this.players[i].playerCards[1]
        ]));
        this.players[i].cardsInvolvedOnEvaluation = hand.cards;
        // Use Hand ranks to get value and hand name
        let evaluated = this.evaluatePlayerCards(i);
        this.players[i].handValue = evaluated.value;
        this.players[i].handName = evaluated.handName;
        // Log out results
        logger.info(
          `${this.players[i].playerName} has ${this.players[i].handName} with value ${this.players[i].handValue} cards involved ${hand.cards}`
        );
        // Calculate winner(s)
        if (this.players[i].handValue > currentHighestRank) {
          currentHighestRank = this.players[i].handValue;
          winnerPlayers = []; // zero it
          winnerPlayers.push(i);
        } else if (this.players[i].handValue === currentHighestRank) {
          winnerPlayers.push(i);
        }
      }
    }
    let winnerNames = [];
    let sharedPot = (this.totalPot / winnerPlayers.length);
    l = winnerPlayers.length;
    for (let i = 0; i < l; i++) {
      winnerNames.push(this.players[winnerPlayers[i]].playerName + (l > 1 ? '' : ''));
      this.players[winnerPlayers[i]].playerMoney = this.players[winnerPlayers[i]].playerMoney + sharedPot;
      this.roundWinnerPlayerIds.push(this.players[winnerPlayers[i]].playerId);
      this.roundWinnerPlayerCards.push(stringToAsciiCardsArray(this.players[winnerPlayers[i]].cardsInvolvedOnEvaluation));
    }
    logger.info(`table ${this.tableName} winners are ${winnerNames}`);
    this.currentStatusText = `${winnerNames} got ${this.players[winnerPlayers[0]].handName}`;

    this.updateLoggedInPlayerDatabaseStatistics(winnerPlayers, this.lastWinnerPlayers);
    this.lastWinnerPlayers = winnerPlayers; // Take new reference of winner players
    this.totalPot = 0;
    this.isResultsCall = true;

    setTimeout(() => {
      this.gameStarted = false;
      this.triggerNewGame();
    }, gameConfig.games.holdEm.games[this.holdemType].afterRoundCountdown * 1000);
  }

  roundResultsMiddleOfTheGame(): void {
    let winnerPlayer = -1;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i] !== null) {
        if (!this.players[i].isFold) {
          winnerPlayer = i;
          break;
        }
      }
    }
    if (winnerPlayer !== -1) {
      this.collectChipsToPotAndSendAction();
      this.collectingPot = false;
      this.players[winnerPlayer].playerMoney = this.players[winnerPlayer].playerMoney + this.totalPot;
      this.currentStatusText = this.players[winnerPlayer].playerName + ' is only standing player!';
      this.currentTurnText = '';
      this.isResultsCall = true;
      this.updateLoggedInPlayerDatabaseStatistics([winnerPlayer], this.lastWinnerPlayers);
      this.lastWinnerPlayers = [winnerPlayer]; // Take new reference of winner player
    }
    setTimeout(() => {
      this.gameStarted = false;
      this.triggerNewGame();
    }, gameConfig.games.holdEm.games[this.holdemType].afterRoundCountdown * 1000);
  }

  bettingRound(currentPlayerTurn: number): void {
    if (this.hasActivePlayers()) { // Checks that game has active players (not fold ones)
      let verifyBets = this.verifyPlayersBets(); // Active players have correct amount of money in game
      let noRoundPlayedPlayer = this.getNotRoundPlayedPlayer(); // Returns player position who has not played it's round
      if (currentPlayerTurn >= this.players.length || this.isCallSituation && verifyBets === -1 || verifyBets === -1 && noRoundPlayedPlayer === -1) {
        this.resetPlayerStates();
        if (verifyBets === -1 && this.smallBlindGiven) {
          if (noRoundPlayedPlayer === -1) {
            this.currentStage = this.currentStage + 1;
            if (this.collectChipsToPotAndSendAction()) { // Collect pot and send action if there is pot to collect
              setTimeout(() => {
                this.collectingPot = false;
                this.staging();
              }, 2500); // Have some time to collect pot and send action
            } else {
              setTimeout(() => {
                this.staging(); // No pot to collect, continue without timing
              }, 1000);
            }
          } else {
            //this.bettingRound(noRoundPlayedPlayer);
            // --- going into testing ---
            this.players[noRoundPlayedPlayer].isPlayerTurn = true;
            this.players[noRoundPlayedPlayer].playerTimeLeft = this.turnTimeOut;
            this.currentTurnText = '' + this.players[noRoundPlayedPlayer].playerName + ' Turn';
            this.sendStatusUpdate();

            if (this.players[noRoundPlayedPlayer].isBot) {
              this.botActionHandler(noRoundPlayedPlayer);
            }
            this.bettingRoundTimer(noRoundPlayedPlayer);
            // --- going into testing ---
          }
        } else {
          this.isCallSituation = true;
          this.bettingRound(verifyBets);
        }
      } else {
        if (this.players[currentPlayerTurn] != null || this.isCallSituation && verifyBets === -1 || !this.smallBlindGiven || !this.bigBlindGiven || !this.bigBlindPlayerHadTurn) { // 07.08.2018, added || !this.bigBlindPlayerHadTurn
          // Forced small and big blinds case
          if (this.currentStage === HoldemStage.TWO_PRE_FLOP && (!this.smallBlindGiven || !this.bigBlindGiven)) {
            this.playerCheck(this.players[currentPlayerTurn].playerId);
            this.bettingRound(currentPlayerTurn + 1);
          } else {
            if (!this.players[currentPlayerTurn].isFold && !this.players[currentPlayerTurn].isAllIn) {
              if (verifyBets !== -1 || !this.smallBlindGiven || !this.bigBlindGiven) {
                this.isCallSituation = true;
              }
              // player's turn
              this.players[currentPlayerTurn].isPlayerTurn = true;
              this.players[currentPlayerTurn].playerTimeLeft = this.turnTimeOut;
              this.currentTurnText = '' + this.players[currentPlayerTurn].playerName + ' Turn';
              this.sendStatusUpdate();

              if (this.players[currentPlayerTurn].isBot) {
                this.botActionHandler(currentPlayerTurn);
              }
              this.bettingRoundTimer(currentPlayerTurn);
            } else {
              this.current_player_turn = this.current_player_turn + 1;
              this.bettingRound(this.current_player_turn);
            }
          }
        } else {
          if (this.isCallSituation && verifyBets !== -1) {
            this.bettingRound(verifyBets);
          } else {
            this.current_player_turn = this.current_player_turn + 1;
            this.bettingRound(this.current_player_turn);
          }
        }
      }
    } else {
      this.roundResultsMiddleOfTheGame();
    }
  }

  bettingRoundTimer(currentPlayerTurn: number): void {
    let turnTime = 0;
    this.turnIntervalObj = setInterval(() => {
      if (this.players[currentPlayerTurn] !== null) {
        if (this.players[currentPlayerTurn].playerState === PlayerState.NONE) {
          turnTime = turnTime + 1000;
          this.players[currentPlayerTurn].playerTimeLeft = this.turnTimeOut - turnTime;
        } else {
          this.clearTimers();
          this.bettingRound(currentPlayerTurn + 1);
        }
      } else {
        this.clearTimers();
        this.bettingRound(currentPlayerTurn + 1);
      }
    }, 1000);
    this.turnTimeOutObj = setTimeout(() => {
      if (this.players[currentPlayerTurn].playerState === PlayerState.NONE) {
        this.playerFold(this.players[currentPlayerTurn].playerId);
        this.sendStatusUpdate();
      }
      this.clearTimers();
      this.bettingRound(currentPlayerTurn + 1);
    }, this.turnTimeOut + 200);
  }

  clearTimers(): void {
    if (this.turnIntervalObj !== null) {
      clearInterval(this.turnIntervalObj);
    }
    if (this.turnTimeOutObj !== null) {
      clearTimeout(this.turnTimeOutObj);
    }
  }

  playerFold(playerId: number): void {
    let playerIndex = this.getPlayerIndex(playerId);
    if (this.players[playerIndex] !== undefined) {
      if (this.players[playerIndex].socket != null || this.players[playerIndex].isBot) {
        if (playerIndex !== -1) {
          if (!this.smallBlindGiven || !this.bigBlindGiven) {
            let blind_amount = 0;
            if (!this.smallBlindGiven && !this.bigBlindGiven) {
              blind_amount = (this.tableMinBet / 2);
              this.smallBlindGiven = true;
            } else if (this.smallBlindGiven && !this.bigBlindGiven) {
              blind_amount = this.tableMinBet;
              this.bigBlindGiven = true;
            }
            if (blind_amount <= this.players[playerIndex].playerMoney) {
              if (blind_amount === this.players[playerIndex].playerMoney || this.someOneHasAllIn()) {
                this.players[playerIndex].isAllIn = true;
              }
              this.players[playerIndex].totalBet = this.players[playerIndex].totalBet + blind_amount;
              this.players[playerIndex].playerMoney = this.players[playerIndex].playerMoney - blind_amount;
            }
          }
          this.players[playerIndex].setStateFold();
          this.checkHighestBet();
          this.sendLastPlayerAction(playerId, PlayerActions.FOLD);
          this.sendAudioCommand('fold');
        }
      }
    }
  }

  playerCheck(playerId: number): void {
    let playerIndex = this.getPlayerIndex(playerId);
    if (this.players[playerIndex].socket != null || this.players[playerIndex].isBot) {
      if (playerIndex !== -1) {
        let check_amount = 0;
        if (this.isCallSituation || this.totalPot === 0 || !this.smallBlindGiven || !this.bigBlindGiven) {
          if (this.smallBlindGiven && this.bigBlindGiven) {
            check_amount = this.currentHighestBet === 0 ? this.tableMinBet : (this.currentHighestBet - this.players[playerIndex].totalBet);
          } else {
            if (this.smallBlindGiven && !this.bigBlindGiven) {
              check_amount = this.tableMinBet;
              this.bigBlindGiven = true;
              this.players[playerIndex].roundPlayed = false;
            } else {
              check_amount = this.tableMinBet / 2;
              this.smallBlindGiven = true;
            }
          }
          if (check_amount <= this.players[playerIndex].playerMoney) {
            this.players[playerIndex].setStateCheck();
            if (check_amount === this.players[playerIndex].playerMoney || this.someOneHasAllIn()) {
              this.players[playerIndex].isAllIn = true;
            }
            this.players[playerIndex].totalBet = this.players[playerIndex].totalBet + check_amount;
            this.players[playerIndex].playerMoney = this.players[playerIndex].playerMoney - check_amount;
          }
          if (this.isCallSituation) {
            this.sendLastPlayerAction(playerId, PlayerActions.CALL);
          }
        } else {
          this.players[playerIndex].setStateCheck();
          this.sendLastPlayerAction(playerId, PlayerActions.CHECK);
        }
        if (this.isCallSituation || check_amount > 0) {
          this.sendAudioCommand('call');
        } else {
          this.sendAudioCommand('check');
        }
        this.checkHighestBet();
      }
    }
  }

  playerRaise(playerId: number, amount: number): void {
    let playerIndex = this.getPlayerIndex(playerId);
    if (this.players[playerIndex].socket !== null || this.players[playerIndex].isBot) {
      if (playerIndex !== -1) {
        let playerBetDifference = (this.currentHighestBet - this.players[playerIndex].totalBet);
        if (amount === 0) {
          amount = playerBetDifference;
        }
        if (amount < playerBetDifference) {
          amount = (playerBetDifference + amount);
        }
        if (amount <= this.players[playerIndex].playerMoney) {
          if (amount === this.players[playerIndex].playerMoney || this.someOneHasAllIn()) {
            this.players[playerIndex].isAllIn = true;
          }
          this.players[playerIndex].setStateRaise();
          this.players[playerIndex].totalBet = this.players[playerIndex].totalBet + amount;
          this.players[playerIndex].playerMoney = this.players[playerIndex].playerMoney - amount;
          this.isCallSituation = true;
          if (!this.smallBlindGiven || !this.bigBlindGiven) {
            if (amount >= (this.tableMinBet / 2)) {
              this.smallBlindGiven = true;
            }
            if (amount >= this.tableMinBet) {
              this.bigBlindGiven = true;
            }
          }
        }
        this.sendLastPlayerAction(playerId, PlayerActions.RAISE);
        this.sendAudioCommand('raise');
        this.checkHighestBet();
        //this.calculateTotalPot();
      }
    }
  }

  checkHighestBet(): void {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].totalBet > this.currentHighestBet) {
        this.currentHighestBet = this.players[i].totalBet;
      }
    }
  }

  sendWebSocketData(player: any, data: any): void {
    if (this.players[player] != null && !this.players[player].isBot) {
      if (this.players[player].socket != null) {
        if (this.players[player].socket.readyState === SocketState.OPEN) {
          this.players[player].socket.send(JSON.stringify(data));
        } else {
          this.players[player].socket = null;
        }
      } else {
        this.players[player].setStateFold();
      }
    }
  }

  sendWaitingPlayerWebSocketData(player: any, data: any): void {
    if (this.playersToAppend[player] != null && !this.playersToAppend[player].isBot) {
      if (this.playersToAppend[player].socket != null) {
        if (this.playersToAppend[player].socket.readyState === SocketState.OPEN) {
          this.playersToAppend[player].socket.send(JSON.stringify(data));
        } else {
          this.playersToAppend[player].socket = null;
        }
      }
    }
  }

  sendSpectatorWebSocketData(spectator: any, data: any): void {
    if (this.spectators[spectator] != null) {
      if (this.spectators[spectator].socket != null) {
        if (this.spectators[spectator].socket.readyState === SocketState.OPEN) {
          this.spectators[spectator].socket.send(JSON.stringify(data));
        }
      }
    }
  }

  sendAudioCommand(action: string): void {
    let response: ClientResponse = {key: 'audioCommand', data: {}};
    response.data.command = action;
    for (let i = 0; i < this.players.length; i++) {
      this.updateJsonTemp = response;
      this.sendWebSocketData(i, response);
    }
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
  }

  sendLastPlayerAction(playerId: number, playerAction: PlayerAction): void {
    let response = {key: '', data: {}};
    response.key = 'lastUserAction';
    this.lastUserAction.playerId = playerId;
    this.lastUserAction.actionText = playerAction;
    response.data = this.lastUserAction;
    for (let i = 0; i < this.players.length; i++) {
      this.updateJsonTemp = response;
      this.sendWebSocketData(i, response);
    }
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
  }

  collectChipsToPotAndSendAction(): boolean {
    let boolMoneyToCollect = false;
    for (let u = 0; u < this.players.length; u++) {
      if (this.players[u].totalBet > 0) {
        boolMoneyToCollect = true;
      }
      this.totalPot = this.totalPot + this.players[u].totalBet; // Get round bet to total pot
      this.players[u].totalBet = 0; // It's collected, we can empty players total bet
    }
    // Send animation action
    if (boolMoneyToCollect) {
      this.collectingPot = true;
      let response = {key: '', data: {}};
      response.key = 'collectChipsToPot';
      for (let i = 0; i < this.players.length; i++) {
        this.updateJsonTemp = response;
        this.sendWebSocketData(i, response);
      }
      for (let w = 0; w < this.playersToAppend.length; w++) {
        this.sendWaitingPlayerWebSocketData(w, response);
      }
      for (let s = 0; s < this.spectators.length; s++) {
        this.sendSpectatorWebSocketData(s, response);
      }
      return true; // Money to collect, wait before continuing to staging
    }
    return false; // No money to collect, continue staging without delay
  }

  getNextDeckCard(): number {
    let nextCard = this.deck[this.deckCard];
    this.deckCard = this.deckCard + 1;
    return nextCard;
  }

  getPlayerIndex(playerId: number): number {
    return this.players.findIndex(player => player.playerId === playerId);
  }

  hasActivePlayers(): boolean {
    let count = 0;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i] !== null) {
        if (!this.players[i].isFold) {
          count = count + 1;
        }
      }
    }
    return count > 1;
  }

  someOneHasAllIn(): boolean {
    let count = 0;
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].isAllIn) {
        count = count + 1;
      }
    }
    return count > 0;
  }

  setNextDealerPlayer(): void {
    this.dealerPlayerArrayIndex = this.dealerPlayerArrayIndex + 1;
    if (this.dealerPlayerArrayIndex >= this.players.length) {
      this.dealerPlayerArrayIndex = 0;
    }
    this.players[this.dealerPlayerArrayIndex].isDealer = true;
  }

  getNextSmallBlindPlayer(): void {
    if (this.players.length > 2) {
      this.smallBlindPlayerArrayIndex = this.dealerPlayerArrayIndex + 1;
      if (this.smallBlindPlayerArrayIndex >= this.players.length) {
        this.smallBlindPlayerArrayIndex = 0;
      }
    } else {
      this.smallBlindPlayerArrayIndex = this.dealerPlayerArrayIndex;
    }
  }

  getNextBigBlindPlayer(): number {
    let bigBlindPlayerIndex = this.smallBlindPlayerArrayIndex + 1;
    if (bigBlindPlayerIndex >= this.players.length) {
      bigBlindPlayerIndex = 0;
    }
    return bigBlindPlayerIndex;
  }

  resetRoundParameters(): void {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].roundPlayed = false;
    }
  }

  getNotRoundPlayedPlayer(): number {
    // Check that all players have had their turn
    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].isFold && !this.players[i].roundPlayed && !this.players[i].isAllIn) {
        return i;
      }
    }
    // Check that big blind player have had its turn
    if (
      this.currentStage === HoldemStage.TWO_PRE_FLOP &&
      this.smallBlindGiven &&
      this.bigBlindGiven &&
      !this.bigBlindPlayerHadTurn
    ) {
      this.bigBlindPlayerHadTurn = true;
      let bigBlindPlayer = this.getNextBigBlindPlayer();
      this.players[bigBlindPlayer].playerState = PlayerState.NONE;
      this.players[bigBlindPlayer].roundPlayed = false;
      return bigBlindPlayer;
    }
    return -1; // Otherwise return -1 to continue
  }

  evaluatePlayerCards(currentPlayer: number): HandEvaluationInterface {
    let cardsToEvaluate = [];
    let ml = this.middleCards.length;
    // Push available middle cards
    for (let i = 0; i < ml; i++) {
      if (this.middleCards[i] !== void 0) { // Index is not 'undefined'
        cardsToEvaluate.push(this.middleCards[i]);
      }
    }
    // Push player hole cards
    if (this.players[currentPlayer] === undefined) {
      return {value: 0, handName: null};
    } else {
      if (this.players[currentPlayer].playerCards == null || this.players[currentPlayer].playerCards === undefined) {
        return {value: 0, handName: null};
      } else {
        cardsToEvaluate.push(this.players[currentPlayer].playerCards[0]);
        cardsToEvaluate.push(this.players[currentPlayer].playerCards[1]);
        let cl = cardsToEvaluate.length;
        if (cl === 3 || cl === 5 || cl === 6 || cl === 7) {
          return evaluator.evalHand(cardsToEvaluate);
        } else {
          return {value: 0, handName: null};
        }
      }
    }
  }

  updateLoggedInPlayerDatabaseStatistics(winnerPlayers: any, lastWinnerPlayers: any): void {
    // for (let i = 0; i < this.players.length; i++) {
    //   if (this.players[i] !== null) {
    //     if (this.players[i].socket !== null) {
    //       if (!this.players[i].isBot && this.players[i].isLoggedInPlayer()) {
//
    //         // this.fancyLogGreen(this.arrayHasValue(winnerPlayers, i));
    //         if (this.arrayHasValue(winnerPlayers, i)) { // Update win count
    //           let winStreak = this.arrayHasValue(lastWinnerPlayers, i);
    //           dbUtils.UpdatePlayerWinCountPromise(this.sequelizeObjects, this.eventEmitter, this.players[i].playerId, this.players[i].playerDatabaseId, winStreak).then(() => {
    //           });
    //           this.players[i].playerWinCount = this.players[i].playerWinCount + 1;
//
    //         } else {
//
    //           // Update lose count (update only if money is raised up from small and big blinds)
    //           if (this.totalPot > (this.tableMinBet * this.players.length)) {
    //             this.players[i].playerLoseCount = this.players[i].playerLoseCount + 1;
    //             dbUtils.UpdatePlayerLoseCountPromise(this.sequelizeObjects, this.players[i].playerDatabaseId).then(() => {
    //             });
    //           }
    //         }
//
    //         // Update player funds
    //         dbUtils.UpdatePlayerMoneyPromise(this.sequelizeObjects, this.players[i].playerDatabaseId, this.players[i].playerMoney).then(() => {
    //         });
    //         dbUtils.InsertPlayerStatisticPromise(
    //           this.sequelizeObjects, this.players[i].playerDatabaseId,
    //           this.players[i].playerMoney, this.players[i].playerWinCount,
    //           this.players[i].playerLoseCount
    //         ).then(() => {
    //           logger.log('Updated player ' + this.players[i].playerName + ' statistics.', logger.LOG_GREEN);
    //         }).catch(error => {
    //           logger.log(error, logger.LOG_RED);
    //         });
    //       }
    //     }
    //   }
    // }
  }

  burnCard() {
    this.deckCard = this.deckCard + 1;
    this.deckCardsBurned = this.deckCardsBurned + 1;
  };


  resetPlayerParameters() {
    this.resetPlayerStates();
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].resetParams();
      this.players[i].checkFunds(this.tableMinBet);
    }
  };

  resetPlayerStates() {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].playerState = PlayerState.NONE;
    }
  };

  verifyPlayersBets(): number {
    let highestBet = 0;
    for (let i = 0; i < this.players.length; i++) { // Get the highest bet
      if (this.players[i] != null) {
        if (!this.players[i].isFold) {
          if (highestBet === 0) {
            highestBet = this.players[i].totalBet;
          }
          if (this.players[i].totalBet > highestBet) {
            highestBet = this.players[i].totalBet;
          }
        }
      }
    }
    for (let i = 0; i < this.players.length; i++) { // Find someone with lower bet
      if (this.players[i] != null) {
        if (!this.players[i].isFold && !this.players[i].isAllIn) {
          if (this.players[i].totalBet < highestBet) {
            return i;
          }
        }
      }
    }
    return !this.smallBlindGiven || !this.bigBlindGiven ? 0 : -1;
  }

  botActionHandler(currentPlayerTurn: number): void {
    let check_amount = (this.currentHighestBet === 0 ? this.tableMinBet :
      (this.currentHighestBet - this.players[currentPlayerTurn].totalBet));
    let playerId = this.players[currentPlayerTurn].playerId;
    let botObj = new HoldemBot(
      this.holdemType,
      this.players[currentPlayerTurn].playerName,
      this.players[currentPlayerTurn].playerMoney,
      this.players[currentPlayerTurn].playerCards,
      this.isCallSituation,
      this.tableMinBet,
      check_amount,
      this.smallBlindGiven,
      this.bigBlindGiven,
      this.evaluatePlayerCards(currentPlayerTurn).value,
      this.currentStage,
      this.players[currentPlayerTurn].totalBet
    );
    let resultSet = botObj.performAction();
    let tm = setTimeout(() => {
      switch (resultSet.action) {
        case 'bot_fold':
          this.playerFold(playerId);
          break;
        case 'bot_check':
          this.playerCheck(playerId);
          break;
        case 'bot_call':
          this.playerCheck(playerId);
          break;
        case 'bot_raise':
          this.playerRaise(playerId, resultSet.amount);
          break;
        case 'remove_bot': // HoldemBot run out of money
          this.playerFold(playerId);
          this.removeBotFromTable(currentPlayerTurn);
          break;
        default:
          this.playerCheck(playerId);
          break;
      }
      this.sendStatusUpdate();

      clearTimeout(tm);
    }, gameConfig.games.holdEm.bot.turnTimes[getRandomInt(1, 4)]);
  }

  removeBotFromTable(currentPlayerTurn: number): void {
    // this.eventEmitter.emit('needNewBot', this.tableId); // Todo fix
    this.players[currentPlayerTurn].socket = null;
  }

  getTableBotCount(): number {
    let l = this.players.length;
    let c = 0;
    for (let i = 0; i < l; i++) {
      if (this.players[i].isBot) {
        c++;
      }
    }
    return c;
  }

}
