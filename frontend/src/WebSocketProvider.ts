import { AntPacket } from './types';

export class WebSocketProvider {
  private socket: WebSocket | null = null;
  private onPacket: ((packet: AntPacket) => void) | null = null;
  private onSnapshot: ((grid: number[][]) => void) | null = null;

  constructor(private url: string = 'ws://localhost:8000/ws') {}

  public connect(
    onPacket: (packet: AntPacket) => void,
    onSnapshot: (grid: number[][]) => void
  ) {
    this.onPacket = onPacket;
    this.onSnapshot = onSnapshot;

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('Connected to simulation server');
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'snapshot') {
          this.onSnapshot?.(data.grid);
        } else {
          // It's an AntPacket
          this.onPacket?.(data);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('Disconnected from simulation server. Reconnecting in 2s...');
      setTimeout(() => this.connect(onPacket, onSnapshot), 2000);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.socket?.close();
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }
}
