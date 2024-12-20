import {ClientResponse, GameHandlerInterface, PlayerInterface} from '../interfaces';
import WebSocket from 'ws';
import {HoldemTable} from './holdem/holdemTable';
import {FiveCardDrawTable} from './fiveCardDraw/fiveCardDrawTable';
import {BottleSpinTable} from './bottleSpin/bottleSpinTable';
import {Player} from '../player';
import {ClientMessageKey} from '../types';
import logger from '../logger';
import {gameConfig} from '../gameConfig';
import {
  createMockWebSocket,
  generatePlayerName,
  getRandomBotName,
  isPlayerInTable,
  sendClientNotification,
} from '../utils';
import {AutoPlay} from './holdem/autoPlay';

let playerIdIncrement = 0;
const players = new Map<WebSocket, Player>();
const tables = new Map<number, FiveCardDrawTable | HoldemTable | BottleSpinTable>();

class GameHandler implements GameHandlerInterface {

  createStartingTables(): void {
    const holdEmCount = gameConfig.games.holdEm.startingTables;
    Array.from({length: holdEmCount}).forEach((_, index: number) => {
      this.createHoldEmTable(index, index);
    });
    const fiveCardDrawCount = gameConfig.games.fiveCardDraw.startingTables;
    Array.from({length: fiveCardDrawCount}).forEach((_, index: number) => {
      const roomNumber = holdEmCount + index;
      this.createFiveCardDrawTable(roomNumber, index);
    });
    // Todo implement all table creation logic behind same function
    // const bottleSpinCount = gameConfig.games.bottleSpin.startingTables;
    // Array.from({length: bottleSpinCount}).forEach((_, index: number) => {
    //   const roomNumber = holdEmCount + fiveCardDrawCount + index;
    //   this.createFiveCardDrawTable(roomNumber);
    // });
  }

  onConnection(socket: WebSocket): void {
    const playerId = playerIdIncrement;
    const player = new Player(socket, playerId, gameConfig.games.holdEm.startMoney, false, generatePlayerName(playerId));
    playerIdIncrement++;
    players.set(socket, player);
    socket.send(JSON.stringify({key: 'connected', data: {playerId: playerId}} as ClientResponse));
    logger.info(`New client connection player id ${playerId} and name ${player.playerName}`);
  }

  onMessage(socket: WebSocket, msg: string): void {
    const message = JSON.parse(msg.toString());
    this.messageHandler(socket, message);
  }

  onClientDisconnected(socket: WebSocket) {
    players.delete(socket);
    logger.info('Client disconnected');
  }

  onError(): void {
    throw new Error("Method not implemented.");
  }

  onClose(): void {
    throw new Error("Method not implemented.");
  }

  private messageHandler(socket: WebSocket, message: {
    key: ClientMessageKey;
    tableId: number;
    tableSortParam: string;
    cardsToDiscard: string[];
  } | any): void {
    let tableId: number = -1;
    let table: FiveCardDrawTable | HoldemTable | BottleSpinTable | undefined = undefined;
    let player: Player | undefined = undefined;
    let cardsToDiscard: string[] = [];
    switch (message.key) {
      case 'getTables':
        const tableSortParam: string = message.tableSortParam || 'all';
        const tableParams: ClientResponse = {key: 'getTables', data: {tables: []}}
        tables.forEach((table: HoldemTable | FiveCardDrawTable | BottleSpinTable) => {
          tableParams.data.tables?.push(table.getTableInfo());
        });
        socket.send(JSON.stringify(tableParams));
        break;
      case 'selectTable':
        tableId = Number(message.tableId);
        table = tables.get(tableId);
        if (table) {
          const player: Player | undefined = players.get(socket);
          if (player && (table.players.length + table.playersToAppend.length) < table.maxSeats) {
            if (!isPlayerInTable(player, table.players, table.playersToAppend)) {
              player.selectedTableId = tableId;
              table.playersToAppend.push(player);
              logger.info(`${player.playerName} selected table ${tableId}`);
              table.triggerNewGame();
              socket.send(JSON.stringify(table.getTableParams()));
            } else {
              logger.error(`Player ${player.playerId} somehow was able to try join table ${tableId} again while being already in it!`);
              sendClientNotification(player.socket, 'errorMessage', 'Player already in table', 'ERROR_PLAYER_ALREADY_IN_TABLE');
            }
          } else {
            logger.warn(`Table ${tableId} is already full!`);
          }
        }
        break;
      case 'getSpectateTables':
        const spectateTableParams: ClientResponse = {key: 'getSpectateTables', data: {tables: []}}
        tables.forEach((table: HoldemTable | FiveCardDrawTable | BottleSpinTable) => {
          spectateTableParams.data.tables?.push(table.getTableInfo());
        });
        logger.info("Sending spectate tables... " + JSON.stringify(spectateTableParams));
        socket.send(JSON.stringify(spectateTableParams));
        break;
      case 'selectSpectateTable':
        tableId = Number(message.tableId);
        table = tables.get(tableId);
        player = players.get(socket);
        if (table && player) {
          if (player.selectedTableId > -1) {
            const previousTable = tables.get(player.selectedTableId);
            if (previousTable) {
              previousTable.spectators = previousTable.spectators.filter(
                spectator => spectator !== player
              );
              logger.info(`Spectating player id ${player.playerId} is removed from table ${previousTable.tableName}`);
            }
          }
          player.selectedTableId = tableId;
          table.spectators.push(player);
          logger.info(`Player id ${player.playerId} is spectating on table ${table.tableName}`);
        }
        break;
      case 'getTableParams':
        tableId = Number(message.tableId);
        table = tables.get(tableId);
        if (table) {
          socket.send(JSON.stringify(table.getTableParams()));
        }
        break;
      case 'setFold':
        tableId = Number(message.tableId);
        table = tables.get(tableId);
        player = players.get(socket);
        if (table && player) {
          if (table instanceof HoldemTable) {
            table.playerFold(player.playerId);
            table.sendStatusUpdate();
          } else if (table instanceof FiveCardDrawTable) {
            table.playerFold(player.playerId);
            table.sendStatusUpdate();
          } else {
            logger.error(`Player ${player.playerId} called ${message.key} for table instance which do not exist`);
          }
        }
        break;
      case 'setCheck':
        tableId = Number(message.tableId);
        table = tables.get(tableId);
        player = players.get(socket);
        if (table && player) {
          if (table instanceof HoldemTable) {
            table.playerCheck(player.playerId);
            table.sendStatusUpdate();
          } else if (table instanceof FiveCardDrawTable) {
            table.playerCheck(player.playerId);
            table.sendStatusUpdate();
          } else {
            logger.error(`Player ${player.playerId} called ${message.key} for table instance which do not exist`);
          }
        }
        break;
      case 'setRaise':
        tableId = Number(message.tableId);
        table = tables.get(tableId);
        player = players.get(socket);
        if (table && player) {
          if (table instanceof HoldemTable) {
            table.playerRaise(player.playerId, Number(message.amount));
            table.sendStatusUpdate();
          } else if (table instanceof FiveCardDrawTable) {
            table.playerRaise(player.playerId, Number(message.amount));
            table.sendStatusUpdate();
          } else {
            logger.error(`Player ${player.playerId} called ${message.key} for table instance which do not exist`);
          }
        }
        break;
      case 'autoPlayAction':
        player = players.get(socket);
        if (player) {
          this.autoPlayAction(player);
        }
        break;
      case 'discardAndDraw':
        tableId = Number(message.tableId);
        table = tables.get(tableId);
        player = players.get(socket);
        cardsToDiscard = message.cardsToDiscard;
        if (table && player && table instanceof FiveCardDrawTable) {
          logger.error(`Player ${player.playerId} discarded fcd cards ${message.cardsToDiscard}`);
          table.playerDiscardAndDraw(player.playerId, cardsToDiscard);
          table.sendStatusUpdate();
        }
        break;
      default:
        logger.error(`No handler for ${message.key} full message ${JSON.stringify(message)}`);
    }
  }

  private createHoldEmTable(tableNumber: number, index: number) {
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
    tables.set(tableNumber, new HoldemTable(type, tableNumber));
    logger.info(`Created starting holdEm table id ${tableNumber} with type ${type}`);
    Array.from({length: gameConfig.games.holdEm.bot.botCounts[index]}).forEach((_, botIndex: number) => {
      this.onAppendBot(tableNumber, gameConfig.games.holdEm.startMoney);
    });
  }

  private createFiveCardDrawTable(tableNumber: number, index: number) {
    let betTypeCount = {lowBets: 0, mediumBets: 0, highBets: 0};
    tables.forEach((table) => {
      if (table instanceof FiveCardDrawTable) {
        switch (table.gameType) {
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
    tables.set(tableNumber, new FiveCardDrawTable(type, tableNumber));
    logger.info(`Created starting five card draw table id ${tableNumber} with type ${type}`);
    Array.from({length: gameConfig.games.fiveCardDraw.bot.botCounts[index]}).forEach((_, botIndex: number) => {
      this.onAppendBot(tableNumber, gameConfig.games.fiveCardDraw.startMoney);
    });
  }

  // append new bot on selected room
  private onAppendBot(tableNumber: number, botStartingMoney: number): void {
    const table = tables.get(tableNumber);
    if (!table) {
      return;
    }
    if ((table.playersToAppend.length + table.players.length) < table.maxSeats) {
      const mockSocket = createMockWebSocket();
      const currentBotNames: string[] = table.players
        .filter((player: PlayerInterface) => player.isBot)
        .map((playerObj: PlayerInterface) => {
          return playerObj.playerName
        });
      const player = new Player(mockSocket, playerIdIncrement, botStartingMoney, true, getRandomBotName(currentBotNames));
      playerIdIncrement++;
      players.set(mockSocket, player);
      table.playersToAppend.push(player);
      logger.info(`Bot ${player.playerName} added into table ${table.tableName}`);
      table.triggerNewGame();
    } else {
      logger.info(`Too many players on table ${table.tableName} so cannot append more bots`);
    }
  }

  private autoPlayAction(player: Player) {
    if (!player.isFold) {
      const table = tables.get(player.selectedTableId);
      if (table instanceof HoldemTable) {
        const check_amount = table.currentHighestBet === 0 ?
          table.tableMinBet : (table.currentHighestBet - player.totalBet);
        const autoplay = new AutoPlay(
          player.playerName,
          player.playerMoney,
          player.playerCards,
          table.middleCards,
          table.isCallSituation,
          table.tableMinBet,
          check_amount,
          table.evaluatePlayerCards(table.current_player_turn).value,
          table.currentStage,
          player.totalBet
        );
        const responseArray: ClientResponse = {key: 'autoPlayActionResult', data: {}};
        const action = autoplay.performAction();
        responseArray.data.action = action.action;
        responseArray.data.amount = action.amount;
        logger.info(`Sending player ${player.playerId} auto play action ${action.action}`);
        player.socket?.send(JSON.stringify(responseArray));
      } else {
        logger.warn('No auto play handler defined for other than HoldemTable instance');
      }
    }
  }


}

export {GameHandler}
