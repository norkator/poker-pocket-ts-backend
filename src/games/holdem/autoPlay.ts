import logger from '../../logger';
import {BotInterface} from '../../interfaces';
import {HoldemBot} from './holdemBot';
import {HoldemStage} from '../../enums';
import {asciiCardToStringCard, getRandomInt} from '../../utils';
import {calculateEquity} from 'poker-odds';

export class AutoPlay implements BotInterface {
  private name: string;
  private playerMoney: number;
  private myHand: string[];
  private middleCards: string[];
  private isCallSituation: boolean;
  private roomMinBet: number;
  private checkAmount: number;
  private handValue: number;
  private currentStage: number;
  private myTotalBet: number;
  private resultsSet: { action: string, amount: number };

  constructor(
    botName: string,
    playerMoney: number,
    myHand: string[],
    middleCards: string[],
    isCallSituation: boolean,
    roomMinBet: number,
    checkAmount: number,
    handValue: number,
    currentStage: number,
    myTotalBet: number
  ) {
    this.name = botName;
    this.playerMoney = playerMoney;
    this.myHand = myHand;
    this.middleCards = middleCards;
    this.isCallSituation = isCallSituation;
    this.roomMinBet = roomMinBet;
    this.checkAmount = checkAmount;
    this.handValue = handValue;
    this.currentStage = currentStage;
    this.myTotalBet = myTotalBet;
    this.resultsSet = {action: '', amount: 0};
  }

  performAction(): { action: string, amount: number } {
    if (!this.myHand || !this.myHand[0]) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
      return this.resultsSet;
    }

    if (this.playerMoney <= (2 * this.roomMinBet)) {
      this.resultsSet.action = HoldemBot.REMOVE_HOLDEM_BOT;
    } else if (this.isCallSituation && this.checkAmount > this.playerMoney) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
    } else {
      switch (this.currentStage) {
        case HoldemStage.TWO_PRE_FLOP:
          this.handlePreFlop();
          break;
        case HoldemStage.FOUR_POST_FLOP:
          this.handlePostFlop();
          break;
        case HoldemStage.SIX_THE_POST_TURN:
          this.handlePostTurn();
          break;
        case HoldemStage.EIGHT_THE_SHOW_DOWN:
          this.handleShowDown();
          break;
      }
    }

    logger.info(
      `${this.name} | ${this.resultsSet.action} ${this.resultsSet.amount > 0 ? this.resultsSet.amount : ''}` +
      `${this.handValue != null ? ` | hand value: ${this.handValue}` : ''}` +
      ` | cA: ${this.checkAmount}`
    );

    return this.resultsSet;
  }

  private handlePreFlop(): void {
    if (this.hasBadHoleCardsHand()) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
    } else {
      const hasSameCards = this.myHand[0].charAt(0) === this.myHand[1].charAt(0);
      if (hasSameCards && !this.isCallSituation) {
        this.resultsSet.action = HoldemBot.HOLDEM_BOT_RAISE;
        this.resultsSet.amount = this.getCalculatedRaiseAmount();
      } else {
        if (this.isCallSituation && !hasSameCards && getRandomInt(0, 4) === 4) {
          this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
        } else {
          this.HOLDEM_BOT_CHECK_CALL();
        }
      }
    }
  }

  private handlePostFlop(): void {
    if (this.handValue < 4300 && this.isCallSituation) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
    } else if ((this.handValue > 10000 || this.hasGoodOdds()) && !this.isCallSituation) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_RAISE;
      this.resultsSet.amount = this.getCalculatedRaiseAmount();
    } else if (this.handValue < 7000 && this.isCallSituation) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
    } else {
      this.HOLDEM_BOT_CHECK_CALL();
    }
  }

  private handlePostTurn(): void {
    if (this.handValue < 4500 && this.isCallSituation) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
    } else if ((this.handValue > 15000 || this.hasGoodOdds()) && !this.isCallSituation) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_RAISE;
      this.resultsSet.amount = this.getCalculatedRaiseAmount();
    } else if (this.handValue < 9000 && this.isCallSituation) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
    } else {
      this.HOLDEM_BOT_CHECK_CALL();
    }
  }

  private handleShowDown(): void {
    if ((this.handValue > 20000 || this.hasGoodOdds()) && !this.isCallSituation) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_RAISE;
      this.resultsSet.amount = this.getCalculatedRaiseAmount();
    } else if ((this.handValue < 9000 || !this.hasGoodOdds()) && this.isCallSituation) {
      this.resultsSet.action = HoldemBot.HOLDEM_BOT_FOLD;
    } else {
      this.HOLDEM_BOT_CHECK_CALL();
    }
  }

  private getCalculatedRaiseAmount(): number {
    const value1 = this.myTotalBet + this.checkAmount;
    const value2 = value1 / 3;
    let raise = Math.ceil((value1 + value2 + 1) / 10) * 10;
    raise += [500, 750, 800, 1000, 1500][getRandomInt(0, 4)];
    return Math.min(raise, this.playerMoney);
  }

  private HOLDEM_BOT_CHECK_CALL(): void {
    this.resultsSet.action = this.isCallSituation ? HoldemBot.HOLDEM_BOT_CALL : HoldemBot.HOLDEM_BOT_CHECK;
  }

  private hasBadHoleCardsHand(): boolean {
    const badCombinations = [
      "Q7", "Q6", "Q5", "Q4", "Q3", "Q2",
      "J6", "J5", "J4", "J3", "J2",
      "95", "94", "93", "92",
      "85", "84", "83", "82",
      "74", "73", "72",
      "64", "63", "62",
      "53", "52",
      "43", "42",
      "32"
    ];

    const currentCombination = this.myHand[0][0] + this.myHand[1][0];
    return badCombinations.some(badComb => badComb[0] === currentCombination[0] && badComb[1] === currentCombination[1]);
  }

  private hasGoodOdds(): boolean {
    if (this.currentStage >= HoldemStage.FOUR_POST_FLOP) {
      const hand = [[
        asciiCardToStringCard(this.myHand[0]),
        asciiCardToStringCard(this.myHand[1])
      ]];
      const board = this.middleCards.map(card => asciiCardToStringCard(card));

      const iterations = 100000;
      const result = calculateEquity(hand, board, iterations);

      return result[0].handChances.some((chance: any) => chance.percentage > 10);
    }
    return false;
  }
}
