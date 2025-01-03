import logger from '../../logger';
import {HoldemStage} from '../../enums';
import {getRandomInt} from '../../utils';
import {BotInterface} from '../../interfaces';
import {BOT_CALL, BOT_CHECK, BOT_FOLD, BOT_RAISE, BOT_REMOVE} from '../../constants';

export class HoldemBot implements BotInterface {

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
  currentStage: HoldemStage;
  myTotalBet: number;
  resultsSet: { action: string; amount: number };

  /*
    Changelog:
        05.08.2018 - Added isBot bit to separate bots from autoPlay actions (to tweak parameters)
        05.08.2018 - Added logic to never fold if have nothing to call against (no money to lose on checks)
        06.08.2018 - Added logic for # 1 First stage, fixed getCalculatedRaiseAmount function over playerMoney problem
        08.08.2018 - Many modifications because bots suddenly folded all time caused by myTotalBet change on collectPotAction
        05.11.2018 - Removed this.isBot logic check. Making autoPlay action for own file for future tricks
  */
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
    currentStage: HoldemStage,
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
    this.resultsSet = {action: "", amount: 0};
  }

  performAction(): { action: string; amount: number } {
    if (this.playerMoney <= this.tableMinBet + 100) {
      this.resultsSet.action = BOT_REMOVE;
    } else if (this.isCallSituation && this.checkAmount > this.playerMoney) {
      this.resultsSet.action = BOT_FOLD;
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
    switch (this.currentStage) {
      case HoldemStage.TWO_PRE_FLOP:
        this.handleFirstStage();
        break;
      case HoldemStage.FOUR_POST_FLOP:
        this.handleSecondStage();
        break;
      case HoldemStage.SIX_THE_POST_TURN:
        this.handleThirdStage();
        break;
      case HoldemStage.EIGHT_THE_SHOW_DOWN:
        this.handleFourthStage();
        break;
    }
  }

  private handleFirstStage(): void {
    //if (this.hasBadHoleCardsHand()) {
    //  this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
    //} else {
    const hasSameCards = this.myHand[0][0] === this.myHand[1][0];
    if (hasSameCards && !this.isCallSituation) {
      this.resultsSet.action = BOT_RAISE;
      this.resultsSet.amount = this.getCalculatedRaiseAmount();
    } else {
      this.HOLDEM_BOT_CHECK_CALL();
    }
    //}
  }

  private handleSecondStage(): void {
    // Here we have hole cards and three middle cards => 5 cards
    if (this.handValue < 4300 && this.isCallSituation) { // never fold if have nothing to call against (no money to lose on checks)
      this.resultsSet.action = BOT_FOLD;
    } else {
      if (this.handValue > 10000 && !this.isCallSituation) {
        this.resultsSet.action = BOT_RAISE;
        this.resultsSet.amount = this.getCalculatedRaiseAmount();
      } else {
        if (this.handValue < 7000 && this.isCallSituation) { // 02.08.2018 - added case to fold if call situation and bad cards
          this.resultsSet.action = BOT_FOLD;
        } else {
          this.HOLDEM_BOT_CHECK_CALL();
        }
      }
    }
  }

  private handleThirdStage(): void {
    // Hole cards + four cards in the middle
    if (this.handValue < 4500 && this.isCallSituation) {
      this.resultsSet.action = BOT_FOLD;
    } else {
      if (this.handValue > 15000 && !this.isCallSituation) {
        this.resultsSet.action = BOT_RAISE;
        this.resultsSet.amount = this.getCalculatedRaiseAmount();
      } else {
        if (this.handValue < 9000 && this.isCallSituation) { // 02.08.2018 - added case to fold if call situation and bad cards
          this.resultsSet.action = BOT_FOLD;
        } else {
          this.HOLDEM_BOT_CHECK_CALL();
        }
      }
    }
  }

  private handleFourthStage(): void {
    if (this.handValue > 20000 && !this.isCallSituation) {
      this.resultsSet.action = BOT_RAISE;
      this.resultsSet.amount = this.getCalculatedRaiseAmount();
    } else {
      if (this.handValue < 9000 && this.isCallSituation) {
        this.resultsSet.action = BOT_FOLD;
      } else {
        this.HOLDEM_BOT_CHECK_CALL();
      }
    }
  }

  private getCalculatedRaiseAmount(): number {
    let value1 = this.myTotalBet + this.checkAmount;
    let value2 = value1 / 3;
    let v = Math.ceil((value1 + value2 + 1) / 10) * 10;
    v += [10, 25, 50, 75, 100][getRandomInt(0, 4)];
    return Math.min(v, this.playerMoney);
  }

  private HOLDEM_BOT_CHECK_CALL(): void {
    this.resultsSet.action = this.isCallSituation ? BOT_CALL : BOT_CHECK;
  }

  private hasBadHoleCardsHand(): boolean {
    const badHands = [
      "Q7", "Q6", "Q5", "Q4", "Q3", "Q2", "J6", "J5", "J4", "J3", "J2",
      "95", "94", "93", "92", "85", "84", "83", "82", "74", "73", "72",
      "64", "63", "62", "53", "52", "43", "42", "32"
    ];
    const hand = this.myHand[0][0] + this.myHand[1][0];
    return badHands.some((badHand) => hand.includes(badHand[0]) && hand.includes(badHand[1]));
  }

}
