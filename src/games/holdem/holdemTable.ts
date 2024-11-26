import {EventEmitter} from 'events';
import {gameConfig} from '../../gameConfig';
import {HoldemStage} from '../../enums';
import {HoldemTableInterface, RoomInfoInterface, RoomParamsResponse} from '../../interfaces';
import logger from '../../logger';
import {} from '../../poker';

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
    this.deck = poker.visualize(poker.randomize(poker.newSet()));
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
        logger.log(this.roomName + ' sending cards to all room clients...');
        this.sendAllPlayersCards(); // Avoiding cheating with this
        break;
      case HoldemStage.TEN_RESULTS:
        logger.log('-------- Results : ' + this.roomName + ' --------');
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
        playersData: [],
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


}
