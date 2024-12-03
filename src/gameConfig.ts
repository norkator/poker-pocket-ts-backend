export const gameConfig = {
  common: {
    startGameTimeOut: 3000,
  },
  games: {
    holdEm: {
      startingTables: 1, // default 4, how many tables to create at start
      bot: {
        botCounts: [2,3,2], // add count for each starting table assuming you want bots in every table
        giveRealNames: true, // true => random from assets/names.txt, false => Bot<numbers>
        startMoney: 10000,
        turnTimes: [1000, 1500, 2000, 2500, 3000],
        minMoney: [
          50,     // Low bet game
          200,    // Medium bet game
          2000    // High bet game
        ],
        betAmounts: [
          [25, 35, 100, 500],         // Low bet game
          [125, 150, 200, 250],       // Medium bet game
          [1100, 1200, 1500, 2000]    // High bet game
        ]
      },
      holdEmGames: [
        {
          name: 'Texas Hold\'em with low bets',
          typeName: 'Low bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 10,
          afterRoundCountdown: 10
        },
        {
          name: 'Texas Hold\'em with medium bets',
          typeName: 'Medium bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 100,
          afterRoundCountdown: 10
        },
        {
          name: 'Texas Hold\'em with high bets',
          typeName: 'High bets',
          max_seats: 6,
          minPlayers: 2,
          turnCountdown: 20,
          minBet: 1000,
          afterRoundCountdown: 10
        }
      ],
    },
    fiveCardDraw: {},
    blackJack: {}
  }
};
