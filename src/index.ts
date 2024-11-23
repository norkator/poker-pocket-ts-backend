import WebSocket, {WebSocketServer} from 'ws';
import logger from './logger';

const port = 8080;
const server = new WebSocketServer({port});

server.on('connection', (socket: WebSocket) => {
    logger.info('New client connected');

    socket.on('message', (message: string) => {
        logger.info(`Received: ${message}`);

        server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    socket.on('close', () => {
        logger.info('Client disconnected');
    });
});

logger.info(`WebSocket server is running on ws://localhost:${port}`);
