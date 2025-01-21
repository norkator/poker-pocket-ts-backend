import {ClientResponse, PlayerInterface, TableInfoInterface, UserTableInterface} from '../../interfaces';
import {ChatMessage, Game, PlayerAction} from '../../types';
import {Player} from '../../player';
import {gameConfig} from '../../gameConfig';
import {BottleSpinStage, PlayerState, SocketState} from '../../enums';
import logger from '../../logger';
import {findPlayerById, getRandomInt, sendClientMessage} from '../../utils';
import {
  BOT_CALL,
  BOT_CHECK,
  BOT_FOLD,
  BOT_RAISE,
  BOT_REMOVE,
  BOT_SPIN_BOTTLE,
  NEW_BOT_EVENT_KEY,
  PlayerActions
} from '../../constants';
import EventEmitter from 'events';
import {BottleSpinBot} from './bottleSpinBot';
import {randomInt} from 'crypto';

// noinspection DuplicatedCode
export class BottleSpinTable {
  eventEmitter: EventEmitter;
  game: Game = 'BOTTLE_SPIN';
  gameType: number;
  tableId: number;
  tableDatabaseId: number;
  tablePassword: string;
  tableMinBet: number;
  tableName: string;
  maxSeats: number;
  minPlayers: number;
  turnTimeOut: number;
  currentStage: number;
  totalPot: number;
  bots: any[];
  players: Player[];
  playersToAppend: Player[];
  playersTemp: Player[];
  spectators: Player[];
  spectatorsTemp: Player[];
  gameStarted: boolean;
  turnTimeOutObj: NodeJS.Timeout | null;
  turnIntervalObj: NodeJS.Timeout | null;
  afterRoundCountDown: number;
  updateJsonTemp: any | null;
  current_player_turn: number;
  currentTurnText: string;
  currentHighestBet: number;
  isCallSituation: boolean;
  roundWinnerPlayerIds: number[];
  currentStatusText: string;
  lastUserAction: { playerId: number; actionText: string | null };
  dealerPlayerArrayIndex: number;
  smallBlindPlayerArrayIndex: number;
  smallBlindGiven: boolean;
  bigBlindGiven: boolean;
  bigBlindPlayerHadTurn: boolean;
  lastWinnerPlayers: any[];
  collectingPot: boolean;
  bottleSpinInitiated: boolean;
  chatMessages: ChatMessage[] = [];
  chatMaxSize: number = 50;
  winnerPlayer: number = -1;

  constructor(
    eventEmitter: EventEmitter,
    gameType: number,
    tableId: number,
  ) {
    this.eventEmitter = eventEmitter;
    this.gameType = gameType;
    this.tableId = tableId;
    this.tableDatabaseId = -1;
    this.tablePassword = '';
    this.tableMinBet = gameConfig.games.bottleSpin.games[gameType].minBet;
    this.tableName = 'Table ' + tableId;
    this.maxSeats = gameConfig.games.bottleSpin.games[gameType].max_seats;
    this.minPlayers = gameConfig.games.bottleSpin.games[gameType].minPlayers;
    this.turnTimeOut = gameConfig.games.bottleSpin.games[gameType].turnCountdown * 1000;
    this.currentStage = BottleSpinStage.ONE_SMALL_AND_BIG_BLIND;
    this.afterRoundCountDown = gameConfig.games.bottleSpin.games[gameType].afterRoundCountdown * 1000;
    this.totalPot = 0;
    this.bots = [];
    this.players = [];
    this.playersToAppend = [];
    this.playersTemp = [];
    this.spectators = [];
    this.spectatorsTemp = [];
    this.gameStarted = false;
    this.turnTimeOutObj = null;
    this.turnIntervalObj = null;
    this.updateJsonTemp = null;
    this.current_player_turn = 0;
    this.currentTurnText = '';
    this.currentHighestBet = 0;
    this.isCallSituation = false;
    this.roundWinnerPlayerIds = [];
    this.currentStatusText = 'Waiting players...';
    this.lastUserAction = {playerId: -1, actionText: null};
    this.dealerPlayerArrayIndex = -1;
    this.smallBlindPlayerArrayIndex = -1;
    this.smallBlindGiven = false;
    this.bigBlindGiven = false;
    this.bigBlindPlayerHadTurn = false;
    this.lastWinnerPlayers = [];
    this.collectingPot = false;
    this.bottleSpinInitiated = false;
    this.winnerPlayer = -1;
  }

  resetTableParams(): void {
    this.currentStage = BottleSpinStage.ONE_SMALL_AND_BIG_BLIND;
    this.totalPot = 0;
    this.currentHighestBet = 0;
    this.updateJsonTemp = null;
    this.current_player_turn = 0;
    this.roundWinnerPlayerIds = [];
    this.lastUserAction = {playerId: -1, actionText: null};
    this.smallBlindGiven = false;
    this.bigBlindGiven = false;
    this.bigBlindPlayerHadTurn = false;
    this.collectingPot = false;
    this.bottleSpinInitiated = false;
    this.clearTimers();
  }

  setTableInfo(
    table: UserTableInterface
  ): void {
    this.tableName = table.tableName || this.tableName;
    this.tableDatabaseId = Number(table.id) || this.tableDatabaseId;
    this.tablePassword = table.password || this.tablePassword;
    if (table.turnCountdown && table.turnCountdown > 0) {
      this.turnTimeOut = Number(table.turnCountdown) * 1000;
    }
    if (table.minBet && table.minBet > 0) {
      this.tableMinBet = Number(table.minBet);
    }
    if (table.afterRoundCountdown && table.afterRoundCountdown > 0) {
      this.afterRoundCountDown = Number(table.afterRoundCountdown) * 1000;
    }
    logger.debug(`Table info updated for table ${this.tableId} set name to ${this.tableName}`);
  }

  getTableInfo(): TableInfoInterface {
    return {
      game: this.game,
      tableId: this.tableId,
      tableName: this.tableName,
      tableMinBet: this.tableMinBet,
      playerCount: (this.players.length + this.playersToAppend.length + this.bots.length),
      maxSeats: this.maxSeats,
      passwordProtected: this.tablePassword.length > 0,
    };
  }

  triggerNewGame(): void {
    this.cleanSpectators();
    if (!this.gameStarted) {
      this.playersTemp = [];
      for (const player of this.players) {
        if (player && player.socket && player.playerMoney > this.tableMinBet && player.selectedTableId === this.tableId) {
          this.playersTemp.push(player);
        } else if (player && !player.isBot && player.selectedTableId === this.tableId) {
          sendClientMessage(
            player.socket,
            'Not enough money to join the game. You are now spectator.',
            'NO_MONEY_CHANGED_TO_SPECTATOR'
          );
          this.spectators.push(player);
        }
      }
      this.players = this.playersTemp
        .filter(player => player && player.socket)
        .slice(0, this.maxSeats);
      const excessPlayers = this.playersTemp.slice(this.maxSeats);
      for (const player of excessPlayers) {
        if (!player.isBot) {
          sendClientMessage(
            player.socket,
            'No seats available. You are now a spectator.',
            'NO_SEAT_CHANGED_TO_SPECTATOR'
          );
          this.spectators.push(player);
        }
      }
      this.playersTemp = [];
      if (this.playersToAppend.length > 0) {
        for (const player of this.playersToAppend) {
          if (player.socket && player.playerMoney > this.tableMinBet && this.players.length < this.maxSeats) {
            this.players.push(player);
          } else if (!player.isBot) {
            sendClientMessage(
              player.socket,
              this.players.length >= this.maxSeats
                ? 'No seats available. You are now a spectator.'
                : 'Not enough money to join the game. You are now a spectator.',
              this.players.length >= this.maxSeats
                ? 'NO_SEAT_CHANGED_TO_SPECTATOR'
                : 'NO_MONEY_CHANGED_TO_SPECTATOR'
            );
            this.spectators.push(player);
          }
        }
        this.playersToAppend = [];
      }
      if (this.players.length >= this.minPlayers) {
        setTimeout(() => {
          this.startGame();
        }, gameConfig.common.startGameTimeOut);
      } else {
        logger.info(`Table ${this.tableName} has not enough players`);
        this.currentStatusText = `${this.minPlayers} players needed to start a new game...`;
      }
    } else {
      logger.warn(`Cannot append more players since a round is running for table: ${this.tableName}`);
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
        gameStarted: this.currentStage >= BottleSpinStage.ONE_SMALL_AND_BIG_BLIND,
        playerCount: this.players.length,
        tableMinBet: this.tableMinBet,
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
    this.sendStatusUpdate();
    setTimeout(() => {
      this.staging();
    }, 1000);
  };

  staging(): void {
    switch (this.currentStage) {
      case BottleSpinStage.ONE_SMALL_AND_BIG_BLIND: // Small blind and big blind are posted (small blind left of dealer, big blind second left of 'dealer')
        logger.debug('BS stage ONE_SMALL_AND_BIG_BLIND');
        this.currentStatusText = 'Small blind & big blind & bets';
        this.isCallSituation = false; // table related reset
        this.resetPlayerStates();
        this.resetRoundParameters();
        this.current_player_turn = this.smallBlindPlayerArrayIndex;
        this.currentTurnText = '';
        this.currentHighestBet = 0;
        this.smallAndBigBlinds(this.smallBlindPlayerArrayIndex);
        break;
      // case BottleSpinStage.TWO_BETTING_ROUND: // Betting round to extend small and big blinds so pot will have some serious funds
      //   logger.debug('BS stage TWO_BETTING_ROUND');
      //   this.currentStatusText = 'First betting round';
      //   this.currentTurnText = '';
      //   this.isCallSituation = false; // table related reset
      //   this.resetPlayerStates();
      //   this.resetRoundParameters();
      //   this.current_player_turn = this.smallBlindPlayerArrayIndex;
      //   this.currentHighestBet = 0;
      //   this.bettingRound(this.current_player_turn);
      //   break;
      case BottleSpinStage.TWO_BETTING_ROUND:
        this.currentStage = BottleSpinStage.THREE_BOTTLE_SPIN
        this.staging();
        break;
      case BottleSpinStage.THREE_BOTTLE_SPIN: // In this game, 'dealer' is spinning bottle
        logger.debug('BS stage THREE_BOTTLE_SPIN');
        this.currentStatusText = 'Bottle Spin';
        this.currentTurnText = '';
        this.isCallSituation = false; // table related reset
        this.resetPlayerStates();
        this.resetRoundParameters();
        this.current_player_turn = this.dealerPlayerArrayIndex;
        this.currentHighestBet = 0;
        this.bottleSpin(this.current_player_turn);
        break;
      case BottleSpinStage.FOUR_RESULTS:
        logger.debug('BS stage FOUR_RESULTS');
        this.currentStatusText = 'Results';
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
        playersData: [] as any[],
        isCallSituation: this.isCallSituation,
        roundWinnerPlayerIds: this.roundWinnerPlayerIds,
        tableName: this.tableName,
        playingPlayersCount: this.players.length,
        appendPlayersCount: this.playersToAppend.length,
        spectatorsCount: this.spectators.length,
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
      actionsAvailable: player.actionsAvailable
    }));
    if (JSON.stringify(this.updateJsonTemp) !== JSON.stringify(response)) {
      this.updateJsonTemp = response;
      this.players.forEach((_, i) => this.sendWebSocketData(i, response));
      this.playersToAppend.forEach((_, w) => this.sendWaitingPlayerWebSocketData(w, response));
      this.spectators.forEach((_, s) => this.sendSpectatorWebSocketData(s, response));
    }
  }

  roundResultsEnd(): void {
    const player = this.players[this.winnerPlayer];
    const winnerMsg = `${this.tableName} winner is ${player.playerName}`;
    logger.info(winnerMsg);
    this.currentStatusText = winnerMsg;
    player.playerMoney = player.playerMoney + this.totalPot;

    // this.updateLoggedInPlayerDatabaseStatistics(winnerPlayers, this.lastWinnerPlayers);
    this.lastWinnerPlayers = [this.winnerPlayer]; // Take new reference of winner players
    this.totalPot = 0;

    setTimeout(() => {
      this.gameStarted = false;
      this.triggerNewGame();
    }, this.afterRoundCountDown);
  }

  roundResultsMiddleOfTheGame(): void {
    setTimeout(() => {
      this.gameStarted = false;
      this.triggerNewGame();
    }, this.afterRoundCountDown);
  }

  smallAndBigBlinds(currentPlayerTurn: number): void {
    this.bettingRound(currentPlayerTurn);
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
            this.players[noRoundPlayedPlayer].isPlayerTurn = true;
            this.players[noRoundPlayedPlayer].actionsAvailable = ['CHECK', 'CALL', 'FOLD', 'RAISE'];
            this.players[noRoundPlayedPlayer].playerTimeLeft = this.turnTimeOut;
            this.currentTurnText = '' + this.players[noRoundPlayedPlayer].playerName + ' Turn';
            this.sendStatusUpdate();
            if (this.players[noRoundPlayedPlayer].isBot) {
              this.botActionHandler(noRoundPlayedPlayer);
            }
            this.bettingRoundTimer(noRoundPlayedPlayer);
          }
        } else {
          this.isCallSituation = true;
          this.bettingRound(verifyBets);
        }
      } else {
        if (this.players[currentPlayerTurn] != null || this.isCallSituation && verifyBets === -1 || !this.smallBlindGiven || !this.bigBlindGiven || !this.bigBlindPlayerHadTurn) {
          // Forced small and big blinds case
          if (this.currentStage === BottleSpinStage.ONE_SMALL_AND_BIG_BLIND && (!this.smallBlindGiven || !this.bigBlindGiven)) {
            this.playerCheck(this.players[currentPlayerTurn].playerId);
            this.bettingRound(currentPlayerTurn + 1);
          } else {
            if (!this.players[currentPlayerTurn].isFold && !this.players[currentPlayerTurn].isAllIn) {
              if (verifyBets !== -1 || !this.smallBlindGiven || !this.bigBlindGiven) {
                this.isCallSituation = true;
              }
              // player's turn
              this.players[currentPlayerTurn].isPlayerTurn = true;
              this.players[currentPlayerTurn].actionsAvailable = ['CHECK', 'CALL', 'FOLD', 'RAISE'];
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


  bottleSpin(currentPlayerTurn: number): void {
    if (this.hasActivePlayers()) { // Checks that game has active players (not fold ones)
      if (!this.bottleSpinInitiated) {
        for (let i = 0; i < this.players.length; i++) {
          if (i === currentPlayerTurn) {
            this.players[i].isPlayerTurn = true;
            this.players[i].actionsAvailable = ['SPIN_BOTTLE'];
            this.players[i].playerTimeLeft = this.turnTimeOut;
          } else {
            this.players[i].isPlayerTurn = false;
          }
        }
        this.players.forEach((player, index) => {
          if (player.isPlayerTurn) {
            if (player.isBot) {
              this.botActionHandler(index);
            }
          }
        });
        this.bottleSpinInitiated = true;
        this.sendStatusUpdate();
        this.bottleSpinTimer();
      } else {
        this.currentStage = BottleSpinStage.FOUR_RESULTS;
        this.sendStatusUpdate();
        setTimeout(() => {
          this.staging();
        }, 1000);
      }
    } else {
      this.roundResultsMiddleOfTheGame();
    }
  }

  bottleSpinTimer(): void {
    this.turnTimeOutObj = setTimeout(() => {
      this.clearTimers();
      this.bottleSpin(this.current_player_turn);
      logger.debug('BS bottleSpinTimer timeout reached');
    }, this.turnTimeOut);
  }


  sendWebSocketData(playerIndex: number, data: any): void {
    const player = this.players[playerIndex];
    if (player != null && !player.isBot) {
      if (player.socket != null) {
        if (player.socket.readyState === SocketState.OPEN) {
          player.socket.send(JSON.stringify(data));
        } else {
          player.socket = null;
        }
      } else {
        player.setStateFold();
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
      this.currentStage === BottleSpinStage.ONE_SMALL_AND_BIG_BLIND &&
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
    let checkAmount = (this.currentHighestBet === 0 ? this.tableMinBet :
      (this.currentHighestBet - this.players[currentPlayerTurn].totalBet));
    let playerId = this.players[currentPlayerTurn].playerId;
    let botObj = new BottleSpinBot(
      this.players[currentPlayerTurn].playerName,
      this.players[currentPlayerTurn].playerMoney,
      this.isCallSituation,
      this.tableMinBet,
      checkAmount,
      this.currentStage,
      this.players[currentPlayerTurn].totalBet
    );
    let resultSet = botObj.performAction();
    let tm = setTimeout(() => {
      switch (resultSet.action) {
        case BOT_FOLD:
          this.playerFold(playerId);
          break;
        case BOT_CHECK:
          this.playerCheck(playerId);
          break;
        case BOT_CALL:
          this.playerCheck(playerId);
          break;
        case BOT_RAISE:
          this.playerRaise(playerId, resultSet.amount);
          break;
        case BOT_REMOVE:
          this.playerFold(playerId);
          this.removeBotFromTable(currentPlayerTurn);
          break;
        case BOT_SPIN_BOTTLE:
          this.spinBottle(playerId);
          break;
        // default:
        //   this.playerCheck(playerId);
        //   break;
      }
      this.sendStatusUpdate();

      clearTimeout(tm);
    }, gameConfig.games.bottleSpin.bot.turnTimes[getRandomInt(1, 4)]);
  }

  removeBotFromTable(currentPlayerTurn: number): void {
    this.players[currentPlayerTurn].socket = null;
    this.players[currentPlayerTurn].selectedTableId = -1;
    if (this.players[currentPlayerTurn].isBot) {
      this.eventEmitter.emit(NEW_BOT_EVENT_KEY, this.tableId, gameConfig.games.bottleSpin.startMoney);
    }
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

  getChatMessages(playerId: number): void {
    const player: Player | null = findPlayerById(playerId, this.players, this.playersToAppend, this.spectators);
    if (player && player.socket) {
      const response: ClientResponse = {
        key: 'getChatMessages', data: {
          messages: [...this.chatMessages],
        }
      };
      if (player.socket.readyState === SocketState.OPEN) {
        player.socket.send(JSON.stringify(response));
      }
    }
  }

  handleChatMessage(playerId: number, message: string): void {
    const player: Player | null = findPlayerById(playerId, this.players, this.playersToAppend, this.spectators);
    if (player) {
      if (this.chatMessages.length >= this.chatMaxSize) {
        this.chatMessages.shift();
      }
      const newMessage: ChatMessage = {playerName: player.playerName, message};
      this.chatMessages.push(newMessage);
      const response: ClientResponse = {key: 'chatMessage', data: {chatMessage: newMessage}};
      const allRecipients = [
        ...this.players.map((_, i) => () => this.sendWebSocketData(i, response)),
        ...this.playersToAppend.map((_, i) =>
          () => this.sendWaitingPlayerWebSocketData(i, response)
        ),
        ...this.spectators.map((_, i) =>
          () => this.sendSpectatorWebSocketData(i, response)
        ),
      ];
      allRecipients.forEach((send) => send());
    }
  }

  calculateSpinDuration(
    initialSpeed: number, deceleration: number, intervalMs: number = 16
  ): number {
    const steps = Math.ceil(initialSpeed / deceleration);
    const totalTimeMs = steps * intervalMs;
    return totalTimeMs / 1000;
  }

  spinBottle(playerId: number): void {
    this.clearTimers();
    const playerIndex = this.getPlayerIndex(playerId);
    const player = this.players[playerIndex];
    // Step 1: Generate speed and deceleration
    const initialSpeed = randomInt(25, 60); // Generates a random integer between 25 and 40 (inclusive)

    const deceleration = 0.2;
    const spinDuration = this.calculateSpinDuration(initialSpeed, deceleration);

    // Step 2: Calculate the total spin angle
    const totalSpin = (initialSpeed ** 2) / (2 * deceleration); // Physics: v² = u² + 2as, solve for s

    // Step 3: Determine the stopping angle
    const finalAngle = totalSpin % 360; // Angle in degrees

    // Step 4: Determine which player it points to
    const numPlayers = this.players.length;
    const anglePerPlayer = 360 / numPlayers;

    const halfAngle = anglePerPlayer / 2;
    const adjustedFinalAngle = (finalAngle + halfAngle + 360) % 360;

    const targetIndex = Math.floor(adjustedFinalAngle / anglePerPlayer);
    const winningPlayerId = this.players[targetIndex].playerId;

    logger.info(`Bottle will stop at angle: ${adjustedFinalAngle}, pointing to player: ${this.players[targetIndex].playerName} in ${spinDuration} seconds`);

    for (const player of this.players) {
      player.isPlayerTurn = false;
      player.roundPlayed = true;
      player.playerTimeLeft = 0;
    }

    const response: ClientResponse = {key: 'spinBottle', data: {initialSpeed, deceleration}};
    this.players.forEach((_, index) => {
      this.sendWebSocketData(index, response);
    });
    for (let w = 0; w < this.playersToAppend.length; w++) {
      this.sendWaitingPlayerWebSocketData(w, response);
    }
    for (let s = 0; s < this.spectators.length; s++) {
      this.sendSpectatorWebSocketData(s, response);
    }
    this.sendStatusUpdate();

    this.winnerPlayer = targetIndex;
    this.roundWinnerPlayerIds = [winningPlayerId]
    this.currentStage = BottleSpinStage.FOUR_RESULTS;

    setTimeout(() => {
      this.staging();
    }, (spinDuration + 2) * 1000);
  }

}
