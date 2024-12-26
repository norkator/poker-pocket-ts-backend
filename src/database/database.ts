import {Sequelize} from 'sequelize-typescript';
import logger from '../logger';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'poker-pocket-ts-db',
  logging: (msg: string) => logger.info(msg),
});

export {sequelize};
