import {HandEvaluationInterface} from '../../interfaces';
import {botDiscard} from './botUtils';
import evaluator from '../../evaluator';

describe('Bot utils', () => {

  const myHand = ['Q♠', 'Q♥', 'K♥', '3♦', '2♦'];
  const handEvaluation: HandEvaluationInterface = evaluator.evalHand(myHand);
  it('should discard correct cards using perfect', () => {
    expect(botDiscard(
      myHand, handEvaluation, 'perfect'
    )).toEqual(['K♥', '3♦', '2♦']);
  });

});
