import {EventEmitter} from 'events';
import {gameConfig} from '../../gameConfig';
import {HoldemStage, PlayerState, SocketState} from '../../enums';
import {
  ClientResponse,
  HandEvaluationInterface,
  HoldemTableInterface,
  RoomInfoInterface,
  RoomParamsResponse
} from '../../interfaces';
import logger from '../../logger';
import {Poker} from '../../poker';
import {PlayerAction, ResponseKey} from "../../types";
import {getRandomInt} from "../../utils";
import {PlayerActions} from "../../constants";
import evaluator from "../../evaluator";

export class HoldemTable implements HoldemTableInterface {
  holdemType: number;
  roomId: number;
  eventEmitter: EventEmitter;
  roomMinBet: number;
  roomName: string;
  maxSeats: number;
  minPlayers: number;
  turnTimeOut: number;
  currentStage: number;
  holeCardsGiven: boolean;
  totalPot: number;
  bots: any[];
  players: any[];
  playersToAppend: any[];
  playersTemp: any[];
  spectators: any[];
  spectatorsTemp: any[];
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
  stackCall: number;
  lastWinnerPlayers: any[];
  collectingPot: boolean;

  constructor(
    holdemType: number,
    number: number,
    eventEmitter: EventEmitter,
  ) {
    this.holdemType = holdemType;
    this.roomId = number;
    this.eventEmitter = eventEmitter;
    this.roomMinBet = gameConfig.games.holdEm.holdEmGames[holdemType].minBet;
    this.roomName = 'Room ' + number;
    this.maxSeats = gameConfig.games.holdEm.holdEmGames[holdemType].max_seats;
    this.minPlayers = gameConfig.games.holdEm.holdEmGames[holdemType].minPlayers;
    this.turnTimeOut = gameConfig.games.holdEm.holdEmGames[holdemType].turnCountdown * 1000;
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
    this.stackCall = 0;
    this.lastWinnerPlayers = [];
    this.collectingPot = false;
  }

  resetRoomParams(): void {
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

  getRoomInfo(): RoomInfoInterface {
    return {
      roomId: this.roomId,
      roomName: this.roomName,
      roomMinBet: this.roomMinBet,
      playerCount: (this.players.length + this.playersToAppend.length + this.bots.length),
      maxSeats: this.maxSeats
    };
  }

  triggerNewGame(): void {
    this.cleanSpectators();
    if (!this.gameStarted) {
      this.playersTemp = [];
      for (const player of this.players) {
        if (player && player.connection && player.playerMoney > this.roomMinBet) {
          this.playersTemp.push(player);
        } else if (player && !player.isBot) {
          this.sendClientMessage(player, 'Not enough money to join the game. You are now spectator.');
          this.spectators.push(player);
        }
      }
      this.players = this.playersTemp.filter(player => player && player.connection);
      this.playersTemp = [];
      if (this.playersToAppend.length > 0) {
        for (const player of this.playersToAppend) {
          if (player.connection && player.playerMoney > this.roomMinBet) {
            this.players.push(player);
          } else if (!player.isBot) {
            this.sendClientMessage(player, 'Not enough money to join the game. You are now spectator.');
            this.spectators.push(player);
          }
        }
        this.playersToAppend = [];
        if (this.players.length >= this.minPlayers) {
          setTimeout(() => {
            this.startGame();
          }, gameConfig.common.startGameTimeOut);
        } else {
          console.log(`* Room ${this.roomName} has not enough players`);
        }
      } else {
        if (this.players.length >= this.minPlayers) {
          console.log('No players to append... starting game');
          setTimeout(() => {
            this.startGame();
          }, gameConfig.common.startGameTimeOut);
        } else {
          this.currentStatusText = `${this.minPlayers} players needed to start a new game...`;
        }
      }
    } else {
      console.log(`* Can't append more players since round is running for room: ${this.roomName}`);
    }
  }

  cleanSpectators(): void {
    this.spectatorsTemp = [];
    for (const spectator of this.spectators) {
      if (spectator && spectator.connection) {
        this.spectatorsTemp.push(spectator);
      }
    }
    this.spectators = this.spectatorsTemp.filter(spectator => spectator && spectator.connection);
    this.spectatorsTemp = [];
  }

  startGame(): void {
    if (!this.gameStarted) {
      this.gameStarted = true;
      logger.info('Game started for room: ' + this.roomName);
      this.resetRoomParams();
      this.resetPlayerParameters(); // Reset players (resets dealer param too)
      this.setNextDealerPlayer(); // Get next dealer player
      this.getNextSmallBlindPlayer(); // Get small blind player
      let response = this.getRoomParams();
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

  getRoomParams(): RoomParamsResponse {
    const response: RoomParamsResponse = {
      key: 'roomParams',
      data: {
        gameStarted: this.currentStage >= HoldemStage.ONE_HOLE_CARDS && this.holeCardsGiven,
        playerCount: this.players.length,
        roomMinBet: this.roomMinBet,
        middleCards: this.middleCards,
        playersData: [],
      },
    };
    response.data.playersData = this.players.map(player => ({
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
        this.isCallSituation = false; // Room related reset
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
        this.isCallSituation = false; // Room related reset
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
        this.isCallSituation = false; // Room related reset
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
        this.isCallSituation = false; // Room related reset
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
        currentStatus: this.currentStatusText,
        currentTurnText: this.currentTurnText,
        middleCards: this.middleCards,
        playersData: [] as any[],
        isCallSituation: this.isCallSituation,
        isResultsCall: this.isResultsCall,
        roundWinnerPlayerIds: this.roundWinnerPlayerIds,
        roundWinnerPlayerCards: this.roundWinnerPlayerCards,
        roomName: this.roomName,
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
    // this.currentStage = HoldemStage.TWO_PRE_FLOP;
    // for (let i = 0; i < this.players.length; i++) {
    //   this.players[i].playerCards[0] = this.getNextDeckCard();
    //   this.players[i].playerCards[1] = this.getNextDeckCard();
    // }
    // let response = {key: '', data: {}};
    // response.key = 'holeCards';
    // for (let i = 0; i < this.players.length; i++) {
    //   response.data.players = [];
    //   for (let p = 0; p < this.players.length; p++) {
    //     let playerData = {};
    //     playerData.playerId = this.players[p].playerId;
    //     playerData.playerName = this.players[p].playerName;
    //     this.players[p].playerId === this.players[i].playerId ? playerData.cards = this.players[p].playerCards : playerData.cards = [];
    //     response.data.players.push(playerData);
    //   }
    //   this.sendWebSocketData(i, response);
    // }
    // response.data.players = [];
    // for (let i = 0; i < this.players.length; i++) {
    //   let playerData = {};
    //   playerData.playerId = this.players[i].playerId;
    //   playerData.cards = []; // Empty cards, otherwise causes security problem
    //   response.data.players.push(playerData);
    // }
    // for (let i = 0; i < this.spectators.length; i++) {
    //   this.sendSpectatorWebSocketData(i, response);
    // }
    // this.holeCardsGiven = true;
    // setTimeout(() => {
    //   this.staging();
    // }, 3000);
  }

  theFlop(): void {
    throw new Error('Method not implemented.');
  }

  theTurn(): void {
    throw new Error('Method not implemented.');
  }

  theRiver(): void {
    throw new Error('Method not implemented.');
  }

  sendAllPlayersCards(): void {
    throw new Error('Method not implemented.');
  }

  roundResultsEnd(): void {
    throw new Error('Method not implemented.');
  }

  roundResultsMiddleOfTheGame(): void {
    throw new Error('Method not implemented.');
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
            this.playerCheck(this.players[currentPlayerTurn].playerId, this.players[currentPlayerTurn].socketKey);
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
        this.playerFold(this.players[currentPlayerTurn].playerId, this.players[currentPlayerTurn].socketKey);
        this.sendStatusUpdate();
      }
      this.clearTimers();
      this.bettingRound(currentPlayerTurn + 1);
    }, this.turnTimeOut + 200);
  }

  clearTimers(): void {
    throw new Error('Method not implemented.');
  }

  playerFold(connectionId: any, socketKey: any): void {
    let playerId = this.getPlayerId(connectionId);
    if (this.players[playerId] !== undefined) {
      if (this.players[playerId].connection != null && this.players[playerId].socketKey === socketKey || this.players[playerId].isBot) {
        if (playerId !== -1) {
          if (!this.smallBlindGiven || !this.bigBlindGiven) {
            let blind_amount = 0;
            if (!this.smallBlindGiven && !this.bigBlindGiven) {
              blind_amount = (this.roomMinBet / 2);
              this.smallBlindGiven = true;
            } else if (this.smallBlindGiven && !this.bigBlindGiven) {
              blind_amount = this.roomMinBet;
              this.bigBlindGiven = true;
            }
            if (blind_amount <= this.players[playerId].playerMoney) {
              if (blind_amount === this.players[playerId].playerMoney || this.someOneHasAllIn()) {
                this.players[playerId].isAllIn = true;
              }
              this.players[playerId].totalBet = this.players[playerId].totalBet + blind_amount;
              this.players[playerId].playerMoney = this.players[playerId].playerMoney - blind_amount;
            }
          }
          this.players[playerId].setStateFold();
          this.checkHighestBet();
          //this.calculateTotalPot();
          this.sendLastPlayerAction(connectionId, PlayerActions.FOLD);
          this.sendAudioCommand('fold');
        }
      }
    }
  }

  playerCheck(connectionId: any, socketKey: any): void {
    let playerId = this.getPlayerId(connectionId);
    if (this.players[playerId].connection != null && this.players[playerId].socketKey === socketKey || this.players[playerId].isBot) {
      if (playerId !== -1) {
        let check_amount = 0;
        if (this.isCallSituation || this.totalPot === 0 || !this.smallBlindGiven || !this.bigBlindGiven) {
          if (this.smallBlindGiven && this.bigBlindGiven) {
            check_amount = this.currentHighestBet === 0 ? this.roomMinBet : (this.currentHighestBet - this.players[playerId].totalBet);
          } else {
            if (this.smallBlindGiven && !this.bigBlindGiven) {
              check_amount = this.roomMinBet;
              this.bigBlindGiven = true;
              this.players[playerId].roundPlayed = false;
            } else {
              check_amount = this.roomMinBet / 2;
              this.smallBlindGiven = true;
            }
          }
          if (check_amount <= this.players[playerId].playerMoney) {
            this.players[playerId].setStateCheck();
            if (check_amount === this.players[playerId].playerMoney || this.someOneHasAllIn()) {
              this.players[playerId].isAllIn = true;
            }
            this.players[playerId].totalBet = this.players[playerId].totalBet + check_amount;
            this.players[playerId].playerMoney = this.players[playerId].playerMoney - check_amount;
          }
          if (this.isCallSituation) {
            this.sendLastPlayerAction(connectionId, PlayerActions.CALL);
          }
        } else {
          this.players[playerId].setStateCheck();
          this.sendLastPlayerAction(connectionId, PlayerActions.CHECK);
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

  playerRaise(connectionId: any, socketKey: any, amount: number): void {
    let playerId = this.getPlayerId(connectionId);
    if (this.players[playerId].connection !== null && this.players[playerId].socketKey === socketKey || this.players[playerId].isBot) {
      if (playerId !== -1) {
        let playerBetDifference = (this.currentHighestBet - this.players[playerId].totalBet);
        if (amount === 0) {
          amount = playerBetDifference;
        }
        if (amount < playerBetDifference) {
          amount = (playerBetDifference + amount);
        }
        if (amount <= this.players[playerId].playerMoney) {
          if (amount === this.players[playerId].playerMoney || this.someOneHasAllIn()) {
            this.players[playerId].isAllIn = true;
          }
          this.players[playerId].setStateRaise();
          this.players[playerId].totalBet = this.players[playerId].totalBet + amount;
          this.players[playerId].playerMoney = this.players[playerId].playerMoney - amount;
          this.isCallSituation = true;
          if (!this.smallBlindGiven || !this.bigBlindGiven) {
            if (amount >= (this.roomMinBet / 2)) {
              this.smallBlindGiven = true;
            }
            if (amount >= this.roomMinBet) {
              this.bigBlindGiven = true;
            }
          }
        }
        this.sendLastPlayerAction(connectionId, PlayerActions.RAISE);
        this.sendAudioCommand('raise');
        this.checkHighestBet();
        //this.calculateTotalPot();
      }
    }
  }

  checkHighestBet(): void {
    throw new Error('Method not implemented.');
  }

  sendWebSocketData(player: any, data: any): void {
    if (this.players[player] != null && !this.players[player].isBot) {
      if (this.players[player].connection != null) {
        if (this.players[player].connection.readyState === SocketState.OPEN) {
          this.players[player].connection.sendText(JSON.stringify(data));
        } else {
          this.players[player].connection = null;
        }
      } else {
        this.players[player].setStateFold();
      }
    }
  }

  sendWaitingPlayerWebSocketData(player: any, data: any): void {
    if (this.playersToAppend[player] != null && !this.playersToAppend[player].isBot) {
      if (this.playersToAppend[player].connection != null) {
        if (this.playersToAppend[player].connection.readyState === SocketState.OPEN) {
          this.playersToAppend[player].connection.sendText(JSON.stringify(data));
        } else {
          this.playersToAppend[player].connection = null;
        }
      }
    }
  }

  sendSpectatorWebSocketData(spectator: any, data: any): void {
    if (this.spectators[spectator] != null) {
      if (this.spectators[spectator].connection != null) {
        if (this.spectators[spectator].connection.readyState === SocketState.OPEN) {
          this.spectators[spectator].connection.sendText(JSON.stringify(data));
        }
      }
    }
  }

  sendAudioCommand(action: string): void {
    let response: ClientResponse = {key: '', data: {}};
    response.key = 'audioCommand';
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

  sendLastPlayerAction(connectionId: any, playerAction: PlayerAction): void {
    let response = {key: '', data: {}};
    response.key = 'lastUserAction';
    this.lastUserAction.playerId = connectionId;
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

  sendClientMessage(playerObject: any, message: string): void {
    const response: ClientResponse = {key: '', data: {}};
    response.key = 'clientMessage' as ResponseKey;
    response.data.message = message;
    if (playerObject.connection != null) {
      if (playerObject.connection.readyState === SocketState.OPEN) {
        playerObject.connection.sendText(JSON.stringify(response));
      }
    }
  }

  getNextDeckCard(): number {
    let nextCard = this.deck[this.deckCard];
    this.deckCard = this.deckCard + 1;
    return nextCard;
  }

  getPlayerId(connectionId: any): number {
    return this.players.findIndex(player => player.playerId === connectionId);
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

  someOneHasAllIn(): void {
    throw new Error('Method not implemented.');
  }

  setNextDealerPlayer(): void {
    throw new Error('Method not implemented.');
  }

  getNextSmallBlindPlayer(): void {
    throw new Error('Method not implemented.');
  }

  getNextBigBlindPlayer(): number {
    let bigBlindPlayerIndex = this.smallBlindPlayerArrayIndex + 1;
    if (bigBlindPlayerIndex >= this.players.length) {
      bigBlindPlayerIndex = 0;
    }
    return bigBlindPlayerIndex;
  }

  resetRoundParameters(): void {
    throw new Error('Method not implemented.');
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
          return {value: null, handName: null};
        }
      }
    }
  }

  updateLoggedInPlayerDatabaseStatistics(): void {
    throw new Error('Method not implemented.');
  }

  burnCard() {
    this.deckCard = this.deckCard + 1;
    this.deckCardsBurned = this.deckCardsBurned + 1;
  };


  resetPlayerParameters() {
    this.resetPlayerStates();
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].resetParams();
      this.players[i].checkFunds(this.roomMinBet);
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
    let check_amount = (this.currentHighestBet === 0 ? this.roomMinBet :
      (this.currentHighestBet - this.players[currentPlayerTurn].totalBet));
    let playerId = this.players[currentPlayerTurn].playerId;
    let botObj = new bot.Bot(
      this.holdemType,
      this.players[currentPlayerTurn].playerName,
      this.players[currentPlayerTurn].playerMoney,
      this.players[currentPlayerTurn].playerCards,
      this.isCallSituation,
      this.roomMinBet,
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
          this.playerFold(playerId, null);
          break;
        case 'bot_check':
          this.playerCheck(playerId, null);
          break;
        case 'bot_call':
          this.playerCheck(playerId, null);
          break;
        case 'bot_raise':
          this.playerRaise(playerId, null, resultSet.amount);
          break;
        case 'remove_bot': // Bot run out of money
          this.playerFold(playerId, null);
          this.removeBotFromRoom(currentPlayerTurn);
          break;
        default:
          this.playerCheck(playerId, null);
          break;
      }
      this.sendStatusUpdate();

      clearTimeout(tm);
    }, gameConfig.games.holdEm.bot.turnTimes[getRandomInt(1, 4)]);
  }

  removeBotFromRoom(currentPlayerTurn: number): void {
    this.eventEmitter.emit('needNewBot', this.roomId);
    this.players[currentPlayerTurn].connection = null;
  }

  getRoomBotCount(): number {
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
