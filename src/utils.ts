import * as crypto from 'crypto';
import {WebSocket} from 'ws';
import * as fs from 'fs';

const randomNamesList: string[] = fs.readFileSync('./src/assets/names.txt', 'utf-8').split('\n');


export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Returns array of string cards
export function asciiToStringCardsArray(asciiCardsArray: string[]): string[] {
  let stringCardsArray: string[] = [];
  for (let i = 0; i < asciiCardsArray.length; i++) {
    stringCardsArray.push(asciiCardToStringCard(asciiCardsArray[i]));
  }
  return stringCardsArray;
}

export function asciiCardToStringCard(ascii: string): string {
  switch (ascii) {
    case '2♣':
      return '2c';
    case '3♣':
      return '3c';
    case '4♣':
      return '4c';
    case '5♣':
      return '5c';
    case '6♣':
      return '6c';
    case '7♣':
      return '7c';
    case '8♣':
      return '8c';
    case '9♣':
      return '9c';
    case '10♣':
      return 'Tc';
    case 'J♣':
      return 'Jc';
    case 'Q♣':
      return 'Qc';
    case 'K♣':
      return 'Kc';
    case 'A♣':
      return 'Ac';

    case '2♦':
      return '2d';
    case '3♦':
      return '3d';
    case '4♦':
      return '4d';
    case '5♦':
      return '5d';
    case '6♦':
      return '6d';
    case '7♦':
      return '7d';
    case '8♦':
      return '8d';
    case '9♦':
      return '9d';
    case '10♦':
      return 'Td';
    case 'J♦':
      return 'Jd';
    case 'Q♦':
      return 'Qd';
    case 'K♦':
      return 'Kd';
    case 'A♦':
      return 'Ad';

    case '2♥':
      return '2h';
    case '3♥':
      return '3h';
    case '4♥':
      return '4h';
    case '5♥':
      return '5h';
    case '6♥':
      return '6h';
    case '7♥':
      return '7h';
    case '8♥':
      return '8h';
    case '9♥':
      return '9h';
    case '10♥':
      return 'Th';
    case 'J♥':
      return 'Jh';
    case 'Q♥':
      return 'Qh';
    case 'K♥':
      return 'Kh';
    case 'A♥':
      return 'Ah';

    case '2♠':
      return '2s';
    case '3♠':
      return '3s';
    case '4♠':
      return '4s';
    case '5♠':
      return '5s';
    case '6♠':
      return '6s';
    case '7♠':
      return '7s';
    case '8♠':
      return '8s';
    case '9♠':
      return '9s';
    case '10♠':
      return 'Ts';
    case 'J♠':
      return 'Js';
    case 'Q♠':
      return 'Qs';
    case 'K♠':
      return 'Ks';
    case 'A♠':
      return 'As';
    default:
      return '';
  }
}

// Returns array of ascii cards
export function stringToAsciiCardsArray(stringCardsArray: { value: string; suit: string; }[]) {
  let asciiCardsArray = [];
  for (let i = 0; i < stringCardsArray.length; i++) {
    asciiCardsArray.push(stringCardToAsciiCard(stringCardsArray[i].value + stringCardsArray[i].suit));
  }
  return asciiCardsArray;
}

// For example convert Ad to A♦
export function stringCardToAsciiCard(ascii: any) {
  switch (ascii) {
    case '2c':
      return '2♣';
    case '3c':
      return '3♣';
    case '4c':
      return '4♣';
    case '5c':
      return '5♣';
    case '6c':
      return '6♣';
    case '7c':
      return '7♣';
    case '8c':
      return '8♣';
    case '9c':
      return '9♣';
    case 'Tc':
      return '10♣';
    case 'Jc':
      return 'J♣';
    case 'Qc':
      return 'Q♣';
    case 'Kc':
      return 'K♣';
    case 'Ac':
      return 'A♣';

    case '2d':
      return '2♦';
    case '3d':
      return '3♦';
    case '4d':
      return '4♦';
    case '5d':
      return '5♦';
    case '6d':
      return '6♦';
    case '7d':
      return '7♦';
    case '8d':
      return '8♦';
    case '9d':
      return '9♦';
    case 'Td':
      return '10♦';
    case 'Jd':
      return 'J♦';
    case 'Qd':
      return 'Q♦';
    case 'Kd':
      return 'K♦';
    case 'Ad':
      return 'A♦';

    case '2h':
      return '2♥';
    case '3h':
      return '3♥';
    case '4h':
      return '4♥';
    case '5h':
      return '5♥';
    case '6h':
      return '6♥';
    case '7h':
      return '7♥';
    case '8h':
      return '8♥';
    case '9h':
      return '9♥';
    case 'Th':
      return '10♥';
    case 'Jh':
      return 'J♥';
    case 'Qh':
      return 'Q♥';
    case 'Kh':
      return 'K♥';
    case 'Ah':
      return 'A♥';

    case '2s':
      return '2♠';
    case '3s':
      return '3♠';
    case '4s':
      return '4♠';
    case '5s':
      return '5♠';
    case '6s':
      return '6♠';
    case '7s':
      return '7♠';
    case '8s':
      return '8♠';
    case '9s':
      return '9♠';
    case 'Ts':
      return '10♠';
    case 'Js':
      return 'J♠';
    case 'Qs':
      return 'Q♠';
    case 'Ks':
      return 'K♠';
    case 'As':
      return 'A♠';
  }
}

export function generatePlayerName(socket: WebSocket): string {
  const uniqueId = crypto.createHash('md5').update(socket.toString()).digest('hex').slice(0, 8);
  return `Anon${uniqueId}`;
}

export function createMockWebSocket(): WebSocket {
  return {
    send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    },
    close: (code?: number, reason?: string) => {
    },
  } as WebSocket;
}

export function getRandomBotName(currentRoomBotNames: string[]): string {
  for (let i = 0; i < randomNamesList.length; i++) {
    const randomName = randomNamesList[getRandomInt(0, randomNamesList.length)];
    if (!currentRoomBotNames.includes(randomName)) {
      return randomName;
    }
  }
  return 'Bot';
}

