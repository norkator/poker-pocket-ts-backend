export const gameConfig = {
  common: {
    startGameTimeOut: 3000,
  },
  games: {
    holdEm: {
      startingTables: 2, // default 4, how many tables to create at start
      startMoney: 1000,
      bot: {
        botCounts: [1, 2, 1, 3], // add count for each starting table assuming you want bots in every table
        turnTimes: [1000, 1500, 2000, 2500, 3000],
        betAmounts: [
          [15, 25, 30, 40], // Low bet game
          [20, 30, 50, 50], // Medium bet game
          [35, 50, 80, 100] // High bet game
        ]
      },
      games: [
        {
          name: 'Texas Hold\'em with low bets',
          typeName: 'Low bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 10,
          afterRoundCountdown: 8
        },
        {
          name: 'Texas Hold\'em with medium bets',
          typeName: 'Medium bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 20,
          afterRoundCountdown: 8
        },
        {
          name: 'Texas Hold\'em with high bets',
          typeName: 'High bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 50,
          afterRoundCountdown: 8
        }
      ],
    },
    fiveCardDraw: {
      startingTables: 2,
      startMoney: 1000,
      bot: {
        botCounts: [1, 2, 1, 0],
        turnTimes: [1000, 1500, 2000, 2500, 3000],
        betAmounts: [
          [15, 25, 30, 40], // Low bet game
          [20, 30, 50, 50], // Medium bet game
          [35, 50, 80, 100] // High bet game
        ]
      },
      games: [
        {
          name: 'Five Card Draw with low bets',
          typeName: 'Low bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 10,
          afterRoundCountdown: 8,
          discardAndDrawTimeout: 20,
        },
        {
          name: 'Five Card Draw with medium bets',
          typeName: 'Medium bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 20,
          afterRoundCountdown: 8,
          discardAndDrawTimeout: 20,
        },
        {
          name: 'Five Card Draw with high bets',
          typeName: 'High bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 50,
          afterRoundCountdown: 8,
          discardAndDrawTimeout: 20,
        },
      ],
    },
    bottleSpin: {
      startingTables: 1,
      startMoney: 1000,
      bot: {
        botCounts: [3, 1],
        turnTimes: [1000, 1500, 2000, 2500, 3000],
        betAmounts: [
          [25, 35, 100, 500],         // Low bet game
          [125, 150, 200, 250],       // Medium bet game
          [1100, 1200, 1500, 2000]    // High bet game
        ]
      },
      games: [
        {
          name: 'Bottle Spin with low bets',
          typeName: 'Low bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 10,
          afterRoundCountdown: 5,
        }, {
          name: 'Bottle Spin with medium bets',
          typeName: 'Medium bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 20,
          afterRoundCountdown: 5,
          discardAndDrawTimeout: 20,
        },
        {
          name: 'Bottle Spin with high bets',
          typeName: 'High bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 50,
          afterRoundCountdown: 5,
          discardAndDrawTimeout: 20,
        },
      ],
    },
    blackJack: {
      startingTables: 0,
      startMoney: 1000,
      bot: {
        botCounts: [1, 1],
      },
    },
    dices: {
      startingTables: 0,
      startMoney: 1000,
      bot: {
        botCounts: [1, 1],
      },
    }
  }
};
