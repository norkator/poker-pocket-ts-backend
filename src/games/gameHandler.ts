import {AuthInterface, ClientResponse, GameHandlerInterface, PlayerInterface} from '../interfaces';
import WebSocket from 'ws';
import {HoldemTable} from './holdem/holdemTable';
import {FiveCardDrawTable} from './fiveCardDraw/fiveCardDrawTable';
import {BottleSpinTable} from './bottleSpin/bottleSpinTable';
import {Player} from '../player';
import {ClientMessageKey} from '../types';
import logger from '../logger';
import {gameConfig} from '../gameConfig';
import {
  authenticate,
  createMockWebSocket,
  generatePlayerName,
  generateToken,
  getPlayerCount,
  getRandomBotName,
  isPlayerInTable,
  sendClientNotification,
} from '../utils';
import {AutoPlay} from './holdem/autoPlay';
import {User} from '../database/models/user';
import bcrypt from 'bcrypt';
import EventEmitter from 'events';
import {NEW_BOT_EVENT_KEY, NEW_PLAYER_STARTING_FUNDS} from '../constants';
import {Achievement} from '../database/models/achievement';

let playerIdIncrement = 0;
const players = new Map<WebSocket, Player>();
const tables = new Map<number, FiveCardDrawTable | HoldemTable | BottleSpinTable>();

class GameHandler implements GameHandlerInterface {
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.on(NEW_BOT_EVENT_KEY, this.onAppendBot.bind(this));
  }

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
    // noinspection JSIgnoredPromiseFromCall
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

  private async messageHandler(socket: WebSocket, message: {
    key: ClientMessageKey;
    tableId: number;
    tableSortParam: string;
    cardsToDiscard: string[];
    username: string;
    email: string;
    password: string;
    token: string;
  } | any): Promise<void> {
    let tableId: number = -1;
    let table: FiveCardDrawTable | HoldemTable | BottleSpinTable | undefined = undefined;
    let player: Player | undefined = undefined;
    let cardsToDiscard: string[] = [];
    switch (message.key as ClientMessageKey) {
      case 'getTables':
        const tableSortParam: string = message.tableSortParam || 'all';
        const tableParams: ClientResponse = {key: 'getTables', data: {tables: []}}
        tables.forEach((table: HoldemTable | FiveCardDrawTable | BottleSpinTable) => {
          tableParams.data.tables?.push(table.getTableInfo());
        });
        tableParams.data.stats = {
          totalGames: tables.size,
          totalBots: getPlayerCount(players, true),
          totalPlayers: getPlayerCount(players),
        }
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
          logger.info(`Player ${player.playerId} discarded fcd cards ${message.cardsToDiscard}`);
          table.playerDiscardAndDraw(player.playerId, cardsToDiscard);
          table.sendStatusUpdate();
        }
        break;
      case 'leaveTable': {
        tableId = Number(message.tableId);
        table = tables.get(tableId);
        player = players.get(socket);
        cardsToDiscard = message.cardsToDiscard;
        if (table && player) {
          if (table instanceof HoldemTable) {
            const spectatorIndex = table.spectators.indexOf(player);
            const playersToAppendIndex = table.playersToAppend.indexOf(player);
            if (spectatorIndex !== -1) {
              table.spectators.splice(spectatorIndex, 1); // Remove from spectators
            } else if (playersToAppendIndex !== -1) {
              table.playersToAppend.splice(spectatorIndex, 1); // Remove from waiting players
            } else {
              table.playerFold(player.playerId);
            }
            player.selectedTableId = -1;
            table.sendStatusUpdate();
          } else if (table instanceof FiveCardDrawTable) {
            const spectatorIndex = table.spectators.indexOf(player);
            const playersToAppendIndex = table.playersToAppend.indexOf(player);
            if (spectatorIndex !== -1) {
              table.spectators.splice(spectatorIndex, 1); // Remove from spectators
            } else if (playersToAppendIndex !== -1) {
              table.playersToAppend.splice(spectatorIndex, 1); // Remove from waiting players
            } else {
              table.playerFold(player.playerId);
            }
            player.selectedTableId = -1;
            table.sendStatusUpdate();
          } else {
            logger.error(`Player ${player.playerId} called ${message.key} for table instance which do not exist`);
          }
        }
        break;
      }
      case 'chatMessage': {
        player = players.get(socket);
        const chatMsg = message.message;
        if (player) {
          tableId = Number(player.selectedTableId);
          table = tables.get(tableId);
          if (table && table instanceof HoldemTable) {
            logger.info(`Player ${player.playerId} send chat message ${chatMsg} into table ${table.tableName}`);
            table.handleChatMessage(player.playerId, chatMsg)
          } else if (table && table instanceof FiveCardDrawTable) {
            logger.info(`Player ${player.playerId} send chat message ${chatMsg} into table ${table.tableName}`);
            table.handleChatMessage(player.playerId, chatMsg)
          }
        }
        break;
      }
      case 'getChatMessages': {
        player = players.get(socket);
        if (player) {
          tableId = Number(player.selectedTableId);
          table = tables.get(tableId);
          if (table && table instanceof HoldemTable) {
            table.getChatMessages(player.playerId);
          } else if (table && table instanceof FiveCardDrawTable) {
            table.getChatMessages(player.playerId);
          }
        }
        break;
      }
      case 'createAccount': {
        const {username, email, password} = message;
        if (!username || !email || !password) {
          const response: ClientResponse = {
            key: 'createAccount',
            data: {
              message: 'Username, email and password are required',
              translationKey: 'USERNAME_EMAIL_PASSWORD_REQUIRED',
              success: false,
            }
          };
          socket.send(JSON.stringify(response));
          return;
        }
        try {
          const user = await User.create({
            username: username,
            email: email,
            password: password,
            money: NEW_PLAYER_STARTING_FUNDS,
          });
          logger.info(`New user account created with id ${user.id}`);
          const response: ClientResponse = {
            key: 'createAccount',
            data: {
              success: true,
            }
          };
          socket.send(JSON.stringify(response));
        } catch (error: any) {
          logger.error(error.message);
          const response: ClientResponse = {
            key: 'createAccount',
            data: {
              message: error.message,
              translationKey: 'ACCOUNT_CREATE_ERROR',
              success: false,
            }
          };
          socket.send(JSON.stringify(response));
        }
        break;
      }
      case 'login': {
        const {username, password} = message;
        if (!username || !password) {
          const response: ClientResponse = {
            key: 'login',
            data: {
              message: 'Username and password are required',
              translationKey: 'USERNAME_PASSWORD_REQUIRED',
              success: false,
            }
          };
          socket.send(JSON.stringify(response));
          return;
        }
        try {
          const user = await User.findOne({where: {username}});
          if (!user || !(await bcrypt.compare(password, user.password))) {
            const response: ClientResponse = {
              key: 'login',
              data: {
                message: 'Invalid username or password',
                translationKey: 'INVALID_USERNAME_OR_PASSWORD',
                success: false,
              }
            };
            socket.send(JSON.stringify(response));
            return;
          }
          const token = generateToken(user.id);
          const response: ClientResponse = {
            key: 'login',
            data: {
              token: token,
              success: true,
            }
          };
          socket.send(JSON.stringify(response));
        } catch (error: any) {
          logger.error(error.message);
          const response: ClientResponse = {
            key: 'login',
            data: {
              message: error.message,
              translationKey: 'LOGIN_ERROR',
              success: false,
            }
          };
          socket.send(JSON.stringify(response));
        }
        break;
      }
      case 'userParams': {
        const auth: AuthInterface = authenticate(socket, message);
        if (auth.success) {
          player = players.get(socket);
          const user = await User.findOne({where: {id: auth.userId}});
          if (player && user) {
            player.playerDatabaseId = user.id;
            player.playerName = user.username;
            player.playerMoney = user.money;
            player.playerWinCount = user.win_count;
            player.playerLoseCount = user.lose_count;
            const response: ClientResponse = {
              key: 'userParams',
              data: {
                success: true,
              }
            };
            socket.send(JSON.stringify(response));
          }
        }
        break;
      }
      case 'userStatistics': {
        const auth: AuthInterface = authenticate(socket, message);
        if (auth.success) {
          player = players.get(socket);
          const user = await User.findOne({where: {id: auth.userId}});
          if (player && user) {
            const achievements: Achievement[] = await Achievement.findAll({where: {userId: auth.userId}});
            const response: ClientResponse = {
              key: 'userStatistics',
              data: {
                userStats: {
                  username: user.username,
                  money: user.money,
                  winCount: user.win_count,
                  loseCount: user.lose_count,
                  xp: user.xp,
                  achievements: achievements.map(({id, achievementType}) => ({
                    id, achievementType,
                  })),
                },
                success: true,
              }
            };
            socket.send(JSON.stringify(response));
          }
        }
        break;
      }
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
    tables.set(tableNumber, new HoldemTable(this.eventEmitter, type, tableNumber));
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
    tables.set(tableNumber, new FiveCardDrawTable(this.eventEmitter, type, tableNumber));
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
      player.selectedTableId = table.tableId;
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
