import {ClientResponse, PlayerInterface, TableInfoInterface} from '../../interfaces';

export class FiveCardDrawTable {
  public tableName: string = '';
  players: PlayerInterface[] = [];
  playersToAppend: PlayerInterface[] = [];
  spectators: PlayerInterface[] = [];
  public maxSeats: number = 6;

  getTableInfo(): TableInfoInterface {
    return {
      tableId: 0,
      tableName: '',
      tableMinBet: 0,
      playerCount: 0, //(this.players.length + this.playersToAppend.length + this.bots.length),
      maxSeats: 0 //this.maxSeats
    };
  }

  triggerNewGame(): void {
  }

  getTableParams(): ClientResponse {
    const response: ClientResponse = {
      key: 'tableParams',
      data: {
        // gameStarted: this.currentStage >= HoldemStage.ONE_HOLE_CARDS && this.holeCardsGiven,
        // playerCount: this.players.length,
        // tableMinBet: this.tableMinBet,
        // middleCards: this.middleCards,
        // playersData: [],
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


}
