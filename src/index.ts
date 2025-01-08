import {WebSocketServer} from 'ws';
import logger from './logger';
import {GameHandler} from './games/gameHandler';
import {initializeDatabase} from './database/database';
import {ExtendedWebSocket} from './interfaces';

const port = 8000;
const server = new WebSocketServer({port});
const gameHandler = new GameHandler();


const launch = async () => {
  await initializeDatabase();

  await gameHandler.createStartingTables();

  server.on('connection', (socket: ExtendedWebSocket) => {
    gameHandler.onConnection(socket);

    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (message: string) => {
      gameHandler.onMessage(socket, message);
    });

    socket.on('error', logger.error);

    socket.on('close', () => {
      gameHandler.onClientDisconnected(socket);
    });
  });

  logger.info(`WebSocket server is running on ws://localhost:${port}`);
};

launch().catch((error: any) => {
  logger.error('Error starting the application:', error);
});

// Ping clients periodically
const interval = setInterval(() => {
  server.clients.forEach((socket) => {
    const extSocket = socket as ExtendedWebSocket;

    if (!extSocket.isAlive) {
      logger.warn(`Terminating unresponsive client`);
      return extSocket.terminate();
    }

    extSocket.isAlive = false;
    extSocket.ping();
  });
}, 10 * 1000);

server.on('close', () => {
  clearInterval(interval);
});
