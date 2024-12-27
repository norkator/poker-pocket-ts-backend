import WebSocket, {WebSocketServer} from 'ws';
import logger from './logger';
import {GameHandler} from './games/gameHandler';
import {initializeDatabase} from './database/database';

const port = 8000;
const server = new WebSocketServer({port});
const gameHandler = new GameHandler();


const launch = async () => {
  await initializeDatabase();

  gameHandler.createStartingTables();

  server.on('connection', (socket: WebSocket) => {
    gameHandler.onConnection(socket);

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

