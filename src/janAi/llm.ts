import axios from 'axios';
import * as dotenv from 'dotenv';
import {ChatCompletionResponse} from '../interfaces';
import {Game} from '../types';

dotenv.config();

const model = 'llama3.1-8b-instruct';

export async function fetchLLMChatCompletion(
  game: Game,
  playerName: string,
  playerCards: string[],
  middleCardsStr: string[],
  msgPlayerName: string,
  userMsg: string,
): Promise<string | null> {

  const gameInstruction = `You are a extremely rude but humorous bot in a ${game} table and your name is ${playerName}`;
  const chatInstructions = `You are part of public chat where user called ${msgPlayerName} sent a message.`;
  const cardsInstructions = `You have ${playerCards.join(', ')} cards and middle cards ${middleCardsStr.join(', ')} and you use this information for bluffing reasons.`;
  const limitations = `Keep answer under 40 characters.`

  const url = `${process.env.JAN_AI_SERVER_ADDRESS}/v1/chat/completions`;
  const data = {
    messages: [
      {role: 'system', content: `${gameInstruction} ${chatInstructions} ${cardsInstructions} ${limitations}`},
      {role: 'user', content: userMsg},
    ],
    model: model,
    stream: false,
    max_tokens: 2048,
    stop: null,
    frequency_penalty: 0,
    presence_penalty: 0,
    temperature: 0.7,
    top_p: 0.95,
  };

  try {
    const response = await axios.post<ChatCompletionResponse>(url, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const {choices, usage} = response.data;
    return choices.length > 0 ? choices[0].message.content : null;
  } catch (error) {
    return null;
  }
}
