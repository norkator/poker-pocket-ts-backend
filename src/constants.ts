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
export const BOT_FOLD = 'bot_fold';
export const BOT_CHECK = 'bot_check';
export const BOT_CALL = 'bot_call';
export const BOT_RAISE = 'bot_raise';
export const BOT_REMOVE = 'remove_bot';
export const BOT_DISCARD_AND_DRAW = 'bot_discard_and_draw';
export const BOT_SPIN_BOTTLE = 'bot_spin_bottle';
export const MAX_MESSAGE_LENGTH = 400;
export const MESSAGE_COOLDOWN_MS = 1000;
