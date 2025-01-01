import logger from '../../logger';
import {FiveCardDrawStage} from '../../enums';
import {BotInterface, HandEvaluationInterface} from '../../interfaces';
import {botDiscard} from './botUtils';
import {BOT_CALL, BOT_CHECK, BOT_DISCARD_AND_DRAW, BOT_FOLD, BOT_REMOVE} from '../../constants';

export class FiveCardDrawBot implements BotInterface {
  holdemType: number;
  name: string;
  playerMoney: number;
  myHand: string[];
  isCallSituation: boolean;
  tableMinBet: number;
  checkAmount: number;
  smallBlindGiven: boolean;
  bigBlindGiven: boolean;
  handEvaluation: HandEvaluationInterface;
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
    handEvaluation: HandEvaluationInterface,
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
    this.handEvaluation = handEvaluation;
    this.currentStage = currentStage;
    this.myTotalBet = myTotalBet;
    this.resultsSet = {action: "", amount: 0, cardsToDiscard: []};
  }

  performAction(): { action: string; amount: number; cardsToDiscard: string[] } {
    if (this.playerMoney <= this.tableMinBet + 500) {
      this.resultsSet.action = BOT_REMOVE;
    } else if (this.isCallSituation && this.checkAmount > this.playerMoney) {
      this.resultsSet.action = BOT_FOLD;
    } else {
      this.handleGameStages();
    }

    logger.info(
      `${this.name} | ${this.resultsSet.action} ${
        this.resultsSet.amount > 0 ? this.resultsSet.amount : ""
      } | hand value: ${this.handEvaluation.value ?? ""} | cA: ${this.checkAmount}`
    );

    return this.resultsSet;
  }

  private handleGameStages(): void {
    this.resultsSet.action = BOT_CHECK;
    switch (this.currentStage) {
      case FiveCardDrawStage.ONE_SMALL_AND_BIG_BLIND:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        break;
      case FiveCardDrawStage.THREE_FIRST_BETTING_ROUND:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        break;
      case FiveCardDrawStage.FOUR_DRAW_PHASE:
        this.resultsSet.action = BOT_DISCARD_AND_DRAW;
        this.resultsSet.cardsToDiscard = botDiscard(this.myHand, this.handEvaluation, 'balanced');
        logger.info(`${this.name} discarded cards ${this.resultsSet.cardsToDiscard}`);
        break;
      case FiveCardDrawStage.FIVE_SECOND_BETTING_ROUND:
        this.FIVE_CARD_DRAW_BOT_CHECK_CALL();
        break;
    }
  }

  private FIVE_CARD_DRAW_BOT_CHECK_CALL(): void {
    this.resultsSet.action = this.isCallSituation ? BOT_CALL : BOT_CHECK;
  }

}
