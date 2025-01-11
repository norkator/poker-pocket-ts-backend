import {BottleSpinStage} from '../../enums';
import {BotInterface} from '../../interfaces';
import {BOT_CALL, BOT_CHECK, BOT_FOLD, BOT_REMOVE} from '../../constants';

export class BottleSpinBot implements BotInterface {
  playerName: string;
  playerMoney: number;
  isCallSituation: boolean;
  tableMinBet: number;
  checkAmount: number;
  currentStage: BottleSpinStage;
  myTotalBet: number;
  resultsSet: { action: string; amount: number; };

  constructor(
    playerName: string,
    playerMoney: number,
    isCallSituation: boolean,
    tableMinBet: number,
    checkAmount: number,
    currentStage: BottleSpinStage,
    myTotalBet: number
  ) {
    this.playerName = playerName;
    this.playerMoney = playerMoney;
    this.isCallSituation = isCallSituation;
    this.tableMinBet = tableMinBet;
    this.checkAmount = checkAmount;
    this.currentStage = currentStage;
    this.myTotalBet = myTotalBet;
    this.resultsSet = {action: "", amount: 0};
  }

  performAction(): { action: string; amount: number; } {
    if (this.playerMoney <= this.tableMinBet + 100) {
      this.resultsSet.action = BOT_REMOVE;
    } else if (this.isCallSituation && this.checkAmount > this.playerMoney) {
      this.resultsSet.action = BOT_FOLD;
    } else {
      this.handleGameStages();
    }
    return this.resultsSet;
  }

  private handleGameStages(): void {
    this.resultsSet.action = BOT_CHECK;
    switch (this.currentStage) {
      case BottleSpinStage.ONE_SMALL_AND_BIG_BLIND:
        this.BOTTLE_SPIN_BOT_CHECK_CALL();
        break;
      case BottleSpinStage.TWO_BETTING_ROUND:
        this.BOTTLE_SPIN_BOT_CHECK_CALL();
        break;
      case BottleSpinStage.THREE_BOTTLE_SPIN:
        // Todo
        break;
    }
  }

  private BOTTLE_SPIN_BOT_CHECK_CALL(): void {
    this.resultsSet.action = this.isCallSituation ? BOT_CALL : BOT_CHECK;
  }

}
