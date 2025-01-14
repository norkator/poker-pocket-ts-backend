import axios from 'axios';
import * as dotenv from 'dotenv';
import {ChatCompletionResponse} from '../interfaces';

dotenv.config();

const model = 'llama3.1-8b-instruct';
const modelInstruction = 'You are a extremely rude but humorous bot in a poker game. You are part of public chat. Keep answer under 30 characters.';

export async function fetchLLMChatCompletion(
  userMsg: string,
): Promise<string | null> {
  const url = `${process.env.JAN_AI_SERVER_ADDRESS}/v1/chat/completions`;
  const data = {
    messages: [
      {role: 'system', content: modelInstruction},
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
    console.error('Error fetching chat completion:', error);
    return null;
  }
}
