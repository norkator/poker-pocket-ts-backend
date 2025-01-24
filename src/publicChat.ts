import {ChatMessage} from './types';
import {ClientResponse} from './interfaces';
import {SocketState} from './enums';
import {Player} from './player';
import WebSocket from 'ws';

const chatMessages: ChatMessage[] = [];
const chatMaxSize: number = 50;

export function getPublicChatMessages(player: Player): void {
  if (player && player.socket) {
    const response: ClientResponse = {
      key: 'getChatMessages', data: {
        messages: [...chatMessages],
      }
    };
    if (player.socket.readyState === SocketState.OPEN) {
      player.socket.send(JSON.stringify(response));
    }
  }
}

export function handlePublicChatMessage(
  players: Map<WebSocket, Player>, player: Player, message: string
): void {
  if (player) {
    if (chatMessages.length >= chatMaxSize) {
      chatMessages.shift();
    }
    const newMessage: ChatMessage = {playerName: player.playerName, message};
    chatMessages.push(newMessage);
    const response: ClientResponse = {key: 'chatMessage', data: {success: true, chatMessage: newMessage}};
    players.forEach((p: Player) => {
      if (p.selectedTableId === -1 && p.socket && p.socket.readyState === SocketState.OPEN) {
        p.socket.send(JSON.stringify(response));
      }
    });
  }
}
