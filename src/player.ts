class Player implements PlayerInterface {
  // static PLAYER_STATE_NONE = PlayerState.NONE;
  // static PLAYER_STATE_FOLD = PlayerState.FOLD;
  // static PLAYER_STATE_CHECK = PlayerState.CHECK;
  // static PLAYER_STATE_RAISE = PlayerState.RAISE;

  isBot: boolean;
  connection: WebSocket;
  socketKey: string;
  playerId: string | number;
  playerDatabaseId: number = -1;
  selectedRoomId: number = -1;
  playerName: string | null = null;
  playerMoney: number;
  playerWinCount: number = 0;
  playerLoseCount: number = 0;
  playerCards: any[] = [];
  playerState: PlayerState = PlayerState.NONE;
  totalBet: number = 0;
  isDealer: boolean = false;
  isPlayerTurn: boolean = false;
  playerTimeLeft: number = 0;
  isFold: boolean = false;
  isAllIn: boolean = false;
  roundPlayed: boolean = false;
  handValue: number = 0;
  handName: string = '';
  cardsInvolvedOnEvaluation: any[] = [];

  constructor(
    connection: WebSocket,
    socketKey: string,
    connectionId: string | number,
    playerMoney: number,
    isBot: boolean
  ) {
    this.connection = connection;
    this.socketKey = socketKey;
    this.playerId = connectionId;
    this.playerMoney = playerMoney;
    this.isBot = isBot;
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

  checkFunds(roomMinBet: number): void {
    if (this.playerMoney < roomMinBet) {
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
