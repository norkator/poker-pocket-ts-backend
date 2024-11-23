import pino from 'pino';
import 'pino-pretty';

const logger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    },
});

export default logger;