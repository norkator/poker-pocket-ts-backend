export enum SocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export enum HoldemStage {
  ONE_HOLE_CARDS = 0,
  TWO_PRE_FLOP = 1,
  THREE_THE_FLOP = 2,
  FOUR_POST_FLOP = 3,
  FIVE_THE_TURN = 4,
  SIX_THE_POST_TURN = 5,
  SEVEN_THE_RIVER = 6,
  EIGHT_THE_SHOW_DOWN = 7,
  NINE_SEND_ALL_PLAYERS_CARDS = 8,
  TEN_RESULTS = 9,
}

export enum PlayerState {
  NONE = 0,               // used in holdem, five card draw, bottle spin
  FOLD = 1,               // used in holdem, five card draw, bottle spin
  CHECK = 2,              // used in holdem, five card draw, bottle spin
  RAISE = 3,              // used in holdem, five card draw, bottle spin
  DISCARD_AND_DRAW = 4,   // used in five card draw
}

export enum FiveCardDrawStage {
  ONE_SMALL_AND_BIG_BLIND = 0,
  TWO_DEAL_HOLE_CARDS = 1,
  THREE_FIRST_BETTING_ROUND = 2,
  FOUR_DRAW_PHASE = 3,
  FIVE_SECOND_BETTING_ROUND = 4,
  SIX_THE_SHOWDOWN = 5,
  SEVEN_RESULTS = 6,
}

export enum BottleSpinStage {
  ONE_SMALL_AND_BIG_BLIND = 0,
  TWO_BETTING_ROUND = 1,
  THREE_BOTTLE_SPIN = 2,
  FOUR_RESULTS = 3,
}
