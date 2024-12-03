import {ClientResponse, GameHandlerInterface} from '../interfaces';
import WebSocket from 'ws';
import {HoldemTable} from './holdem/holdemTable';
import {FiveCardDrawTable} from './fiveCardDraw/fiveCardDrawTable';
import {Player} from '../player';
import {ClientMessageKey} from '../types';
import logger from '../logger';
import {gameConfig} from '../gameConfig';

const players = new Map<WebSocket, Player>();
const tables = new Map<number, HoldemTable | FiveCardDrawTable>();

class GameHandler implements GameHandlerInterface {

  createStartingTables(): void {
    Array.from({length: gameConfig.games.holdEm.startingTables}).forEach((_, index: number) => {
      this.createHoldEmTable(index);
    });
  }

  onConnection(socket: WebSocket): void {
    const player = new Player(socket, 10000, false);
    players.set(socket, player);
    socket.send(JSON.stringify({key: 'connected'} as ClientResponse));
  }

  onMessage(socket: WebSocket, msg: string): void {
    const message = JSON.parse(msg.toString());
    this.messageHandler(socket, message);
  }

  onError(): void {
    throw new Error("Method not implemented.");
  }

  onClose(): void {
    throw new Error("Method not implemented.");
  }

  connection(): void {
    throw new Error("Method not implemented.");
  }

  private messageHandler(socket: WebSocket, message: { key: ClientMessageKey } | any): void {
    switch (message.key) {
      case 'getTables':
        break;
      case 'getSpectateTables':
        const tableParams: ClientResponse = {key: 'getSpectateTables', data: {tables: []}}
        tables.forEach((table: HoldemTable | FiveCardDrawTable) => {
          tableParams.data.tables?.push(table.getTableInfo());
        });
        logger.info("Sending spectate tables... " + JSON.stringify(tableParams));
        socket.send(JSON.stringify(tableParams));
        break;
    }
  }

  private createHoldEmTable(index: number) {
    let betTypeCount = {lowBets: 0, mediumBets: 0, highBets: 0};
    tables.forEach((table) => {
      if (table instanceof HoldemTable) {
        switch (table.holdemType) {
          case 0:
            betTypeCount.lowBets++;
            break;
          case 1:
            betTypeCount.mediumBets++;
            break;
          case 2:
            betTypeCount.highBets++;
            break;
        }
      }
    });
    let tableType = Object.entries(betTypeCount)
      .sort(([, countA], [, countB]) => countA - countB)
      .map(([key]) => key);
    let type: number = 0;
    switch (tableType[0]) {
      case 'lowBets':
        type = 0;
        break;
      case 'mediumBets':
        type = 1;
        break;
      case 'highBets':
        type = 2;
        break;
    }
    tables.set(index, new HoldemTable(type, index));
    logger.info(`Created starting holdEm table id ${index} with type ${type}`);
    Array.from({length: gameConfig.games.holdEm.bot.botCounts[index]}).forEach((_, botIndex: number) => {
      this.onAppendBot(index);
    });
  }

  // append new bot on selected room
  private onAppendBot(tableIndex: number): void {
    if (!tables.get(tableIndex)) {
      return;
    }
    // if (
    //   Number(rooms[roomId].playersToAppend.length + rooms[roomId].players.length)
    //   < Number(config.games.holdEm.holdEmGames[rooms[roomId].holdemType].max_seats)
    // ) {
    //   const connectionId = CONNECTION_ID;
    //   players.push(new player.Player(-1, null, connectionId, config.games.holdEm.bot.startMoney, true));
    //   if (config.games.holdEm.bot.giveRealNames) {
    //     const currentBotNames = rooms[roomId].players
    //       .filter(player => player.isBot)
    //       .map(function (playerObj) {
    //         return playerObj.playerName
    //       });
    //     players[connectionId].playerName = utils.getRandomBotName(
    //       currentBotNames
    //     );
    //   } else {
    //     players[connectionId].playerName = "Bot" + Math.floor(Math.random() * 1000);
    //   }
    //   rooms[roomId].playersToAppend.push(players[connectionId]);
    //   // logger.log("BOT " + players[connectionId].playerName + " selected room " + roomId);
    //   rooms[roomId].triggerNewGame();
    //   CONNECTION_ID = CONNECTION_ID + 1;
    // } else {
    //   logger.info("Too many players on room " + roomId + " so cannot append more bots from command.");
    // }
  }

}

export {GameHandler}
