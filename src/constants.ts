export const PlayerActions = {
  CHECK: 'CHECK',
  CALL: 'CALL',
  RAISE: 'RAISE',
  FOLD: 'FOLD',
  DISCARD_AND_DRAW: 'DISCARD_AND_DRAW',
} as const;
export const NEW_BOT_EVENT_KEY: string = 'needNewBot';
export const WIN_XP: number = 5;
export const WIN_STREAK_XP: number = 10;
export const NEW_PLAYER_STARTING_FUNDS: number = 1000;
