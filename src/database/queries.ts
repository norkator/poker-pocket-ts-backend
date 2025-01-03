import {col, fn, Op} from 'sequelize';
import {Statistic} from './models/statistic';

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
    console.log(row.date);
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
