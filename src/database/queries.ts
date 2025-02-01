import {col, fn, Op} from 'sequelize';
import {Statistic} from './models/statistic';
import {User} from './models/user';
import {RanksInterface, UserTableInterface} from '../interfaces';
import {UserTable} from './models/userTables';
import {RefreshToken} from './models/refreshToken';

export async function getDailyAverageStats(userId: number) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const results = await Statistic.findAll({
    attributes: [
      [fn('DATE_TRUNC', 'day', col('createdAt')), 'date'],
      [fn('AVG', col('money')), 'avgMoney'],
      [fn('AVG', col('winCount')), 'avgWinCount'],
      [fn('AVG', col('loseCount')), 'avgLoseCount'],
    ],
    where: {
      userId: userId,
      createdAt: {
        [Op.gte]: oneMonthAgo,
      },
    },
    group: [fn('DATE_TRUNC', 'day', col('createdAt'))],
    order: [fn('DATE_TRUNC', 'day', col('createdAt'))],
    raw: true,
  });

  const labels: string[] = [];
  const averageMoney: number[] = [];
  const averageWinCount: number[] = [];
  const averageLoseCount: number[] = [];

  results.forEach((row: any) => {
    const date = new Date(row.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }); // Format date as 'Jan 1', 'Jan 2', etc.
    labels.push(date);
    averageMoney.push(parseFloat(parseFloat(row.avgMoney).toFixed(2)));
    averageWinCount.push(parseFloat(parseFloat(row.avgWinCount).toFixed(2)));
    averageLoseCount.push(parseFloat(parseFloat(row.avgLoseCount).toFixed(2)));
  });

  return {labels, averageMoney, averageWinCount, averageLoseCount};
}


export async function getRankings(): Promise<RanksInterface[]> {
  return await User.findAll({
    attributes: ['username', 'xp', 'money', 'win_count', 'lose_count'],
    order: [
      ['xp', 'DESC'],
    ],
    // limit: 100,
    raw: true
  });
}

export async function createUpdateUserTable(
  userId: number, tableData: UserTableInterface
): Promise<boolean> {
  if (tableData.id && tableData.id > 0) {
    const existingTable = await UserTable.findOne({
      where: {id: tableData.id, userId},
    });
    if (existingTable) {
      await existingTable.update({
        game: tableData.game,
        tableName: tableData.tableName,
        botCount: tableData.botCount,
        password: tableData.password,
        turnCountdown: tableData.turnCountdown,
        minBet: tableData.minBet,
        afterRoundCountdown: tableData.afterRoundCountdown,
        discardAndDrawTimeout: tableData.discardAndDrawTimeout,
      });
    } else {
      throw new Error(`UserTable with ID ${tableData.id} not found for user ${userId}`);
    }
  } else {
    await UserTable.create({
      userId,
      game: tableData.game,
      tableName: tableData.tableName,
      botCount: tableData.botCount,
      password: tableData.password,
      turnCountdown: tableData.turnCountdown,
      minBet: tableData.minBet,
      afterRoundCountdown: tableData.afterRoundCountdown,
      discardAndDrawTimeout: tableData.discardAndDrawTimeout,
    });
  }
  return true;
}

export async function getUserTables(
  userId: number
): Promise<UserTableInterface[]> {
  return UserTable.findAll({
    where: {
      userId: userId
    },
    raw: true,
    order: [['id', 'ASC']],
  });
}

export async function getUserTable(
  userId: number, tableId: number
): Promise<UserTableInterface | null> {
  return UserTable.findOne({
    where: {
      id: tableId,
      userId: userId,
    },
    raw: true,
  });
}

export async function getAllUsersTables(): Promise<UserTableInterface[]> {
  return UserTable.findAll({
    raw: true,
    order: [['id', 'ASC']],
  });
}

export const saveRefreshToken = async (userId: number, token: string, expiresInDays = 7) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  await RefreshToken.create({
    token,
    userId,
    expiresAt,
  });
};

export const findRefreshToken = async (token: string) => {
  return await RefreshToken.findOne({
    where: {token},
  });
};

export const deleteRefreshToken = async (token: string) => {
  return await RefreshToken.destroy({
    where: {token},
  });
};

export const cleanUpExpiredTokens = async () => {
  await RefreshToken.destroy({
    where: {
      expiresAt: {lt: new Date()},
    },
  });
};
