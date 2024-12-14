import {asciiCardToStringCard, getRandomBotName} from './utils';

describe('Utils', () => {
  it('should return correct card string', () => {
    expect(asciiCardToStringCard('A♠')).toBe('As');
  });

  it('should return random bot name', () => {
    expect(getRandomBotName(['Isaac', 'Reynolds']).length).toBeGreaterThan(2);
  });
});
