enum SocketState {
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

enum PlayerState {
  NONE = 0,
  FOLD = 1,
  CHECK = 2,
  RAISE = 3,
}
