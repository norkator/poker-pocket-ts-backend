import {TableInfoInterface} from '../../interfaces';

export class FiveCardDrawTable {

  getTableInfo(): TableInfoInterface {
    return {
      tableId: 0,
      tableName: '',
      tableMinBet: 0,
      playerCount: 0, //(this.players.length + this.playersToAppend.length + this.bots.length),
      maxSeats: 0 //this.maxSeats
    };
  }

}
