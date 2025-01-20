import {Sequelize} from 'sequelize-typescript';
import logger from '../logger';
import * as dotenv from 'dotenv';
import {User} from './models/user';
import {Achievement} from './models/achievement';
import {Statistic} from './models/statistic';
import {UserTable} from './models/userTables';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'poker-pocket-ts',
  // logging: (msg: string) => logger.debug(msg),
  logging: false,
  models: [User, Achievement, Statistic, UserTable],
  define: {
    schema: 'poker',
  },
});


const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    await sequelize.sync(/*{alter: true}*/); // `alter: true` for updates without data loss
  } catch (error) {
    logger.error('Error during database initialization:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
};

export {sequelize, initializeDatabase};
