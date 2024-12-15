import logger from '../../logger';
import {FiveCardDrawStage} from '../../enums';
import {getRandomInt} from '../../utils';
import {BotInterface} from '../../interfaces';

export class FiveCardDrawBot implements BotInterface {

  static FIVE_CARD_DRAW_BOT_DISCARD_AND_DRAW = 'five_card_draw_bot_discard_and_draw';
  static FIVE_CARD_DRAW_BOT_FOLD = 'five_card_draw_bot_fold';
  static FIVE_CARD_DRAW_BOT_CHECK = 'five_card_draw_bot_check';
  static FIVE_CARD_DRAW_BOT_CALL = 'five_card_draw_bot_call';
  static FIVE_CARD_DRAW_BOT_RAISE = 'five_card_draw_bot_raise';
  static REMOVE_FIVE_CARD_DRAW_BOT = 'remove_bot';

  holdemType: number;
  name: string;
  playerMoney: number;
  myHand: string[];
  isCallSituation: boolean;
  tableMinBet: number;
  checkAmount: number;
  smallBlindGiven: boolean;
  bigBlindGiven: boolean;
  handValue: number;
  currentStage: FiveCardDrawStage;
  myTotalBet: number;
  resultsSet: { action: string; amount: number; cardsToDiscard: string[] };

  constructor(
    holdemType: number,
    botName: string,
    playerMoney: number,
    myHand: string[],
    isCallSituation: boolean,
    tableMinBet: number,
    checkAmount: number,
    smallBlindGiven: boolean,
    bigBlindGiven: boolean,
    handValue: number,
    currentStage: FiveCardDrawStage,
    myTotalBet: number
  ) {
    this.holdemType = holdemType;
    this.name = botName;
    this.playerMoney = playerMoney;
    this.myHand = myHand;
    this.isCallSituation = isCallSituation;
    this.tableMinBet = tableMinBet;
    this.checkAmount = checkAmount;
    this.smallBlindGiven = smallBlindGiven;
    this.bigBlindGiven = bigBlindGiven;
    this.handValue = handValue;
    this.currentStage = currentStage;
    this.myTotalBet = myTotalBet;
    this.resultsSet = {action: "", amount: 0, cardsToDiscard: []};
  }

  performAction(): { action: string; amount: number; cardsToDiscard: string[] } {
    if (this.playerMoney <= this.tableMinBet + 500) {
      this.resultsSet.action = FiveCardDrawBot.REMOVE_FIVE_CARD_DRAW_BOT;
    } else if (this.isCallSituation && this.checkAmount > this.playerMoney) {
      this.resultsSet.action = FiveCardDrawBot.FIVE_CARD_DRAW_BOT_FOLD;
    } else {
      this.handleGameStages();
    }

    logger.info(
      `${this.name} | ${this.resultsSet.action} ${
        this.resultsSet.amount > 0 ? this.resultsSet.amount : ""
      } | hand value: ${this.handValue ?? ""} | cA: ${this.checkAmount}`
    );

    return this.resultsSet;
  }

  private handleGameStages(): void {
    this.resultsSet.action = FiveCardDrawBot.FIVE_CARD_DRAW_BOT_CHECK;
    switch (this.currentStage) {
      case FiveCardDrawStage.ONE_SMALL_AND_BIG_BLIND:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        // this.handleFirstStage();
        break;
      case FiveCardDrawStage.TWO_DEAL_HOLE_CARDS:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        break;
      case FiveCardDrawStage.THREE_FIRST_BETTING_ROUND:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        // this.handleThirdStage();
        break;
      case FiveCardDrawStage.FOUR_DRAW_PHASE:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        break;
      case FiveCardDrawStage.FIVE_SECOND_BETTING_ROUND:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        // this.handleFourthStage();
        break;
      case FiveCardDrawStage.SIX_THE_SHOWDOWN:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        break;
    }
  }

  private FIVE_CARD_DRAW_BOT_CHECK_CALL(): void {
    this.resultsSet.action = this.isCallSituation ? FiveCardDrawBot.FIVE_CARD_DRAW_BOT_CALL : FiveCardDrawBot.FIVE_CARD_DRAW_BOT_CHECK;
  }

  // private handleFirstStage(): void {
  //   const hasSameCards = this.myHand[0][0] === this.myHand[1][0];
  //   if (hasSameCards && !this.isCallSituation) {
  //     this.resultsSet.action = FiveCardDrawBot.FIVE_CARD_DRAW_BOT_RAISE;
  //     this.resultsSet.amount = this.getCalculatedRaiseAmount();
  //   } else {
  //     this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
  //   }
  // }

}
