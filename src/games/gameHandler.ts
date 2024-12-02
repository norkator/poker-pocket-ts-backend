import {GameHandlerInterface} from '../interfaces';
import WebSocket from 'ws';
import {HoldemTable} from './holdem/holdemTable';

class GameHandler implements GameHandlerInterface {
  onConnection(socket: WebSocket): void {
    console.log(socket)
  }

  onMessage(message: string): void {
    console.log(message);
  }

  onError(): void {
    throw new Error("Method not implemented.");
  }

  onClose(): void {
    throw new Error("Method not implemented.");
  }

  connection(): void {
    throw new Error("Method not implemented.");
  }
}

export {GameHandler}
