import { AntPacket } from './types';

export class InterpolationBuffer {
  private buffer: AntPacket[] = [];
  private readonly delay: number;

  constructor(delay: number = 100) {
    this.delay = delay;
  }

  public addPacket(packet: AntPacket) {
    this.buffer.push(packet);
    // Prune old packets
    const now = Date.now();
    while (this.buffer.length > 10 && this.buffer[1].t < now - this.delay - 1000) {
      this.buffer.shift();
    }
  }

  public getInterpolationState(renderTime: number) {
    if (this.buffer.length < 2) {
      return null;
    }

    let i = 0;
    while (i < this.buffer.length - 2 && this.buffer[i + 1].t < renderTime) {
      i++;
    }

    const packetA = this.buffer[i];
    const packetB = this.buffer[i + 1];

    if (renderTime < packetA.t) {
      return null;
    }

    const alpha = (renderTime - packetA.t) / (packetB.t - packetA.t);
    return { packetA, packetB, alpha };
  }
}
