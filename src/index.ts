import WebSocket, {WebSocketServer} from 'ws';
import logger from './logger';
import {GameHandler} from './games/gameHandler';

const port = 8000;
const server = new WebSocketServer({port});
const gameHandler = new GameHandler();

server.on('connection', (socket: WebSocket) => {
  // logger.info('New client connected');
  gameHandler.onConnection(socket);

  socket.on('message', (message: string) => {
    gameHandler.onMessage(message);
    // logger.info(`Received: ${message}`);
    // server.clients.forEach((client) => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(message);
    //   }
    // });
  });

  socket.on('error', console.error);

  socket.on('close', () => {
    logger.info('Client disconnected');
  });
});

logger.info(`WebSocket server is running on ws://localhost:${port}`);
