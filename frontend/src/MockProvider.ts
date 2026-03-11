import { AntPacket, AntState } from './types';

export class MockProvider {
  private antsCount: number = 50;
  private antPositions: { x: number; y: number; theta: number }[] = [];

  constructor() {
    for (let i = 0; i < this.antsCount; i++) {
      this.antPositions.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        theta: Math.random() * Math.PI * 2,
      });
    }
  }

  public getNextPacket(): AntPacket {
    const t = Date.now();
    const ants: number[] = [];
    const deltas: [number, number][] = [];

    for (let i = 0; i < this.antsCount; i++) {
      const pos = this.antPositions[i];
      // Randomly update position for simulation
      pos.theta += (Math.random() - 0.5) * 0.2;
      pos.x += Math.cos(pos.theta) * 2;
      pos.y += Math.sin(pos.theta) * 2;

      // Wrap around for mock
      if (pos.x < 0) pos.x = 800;
      if (pos.x > 800) pos.x = 0;
      if (pos.y < 0) pos.y = 600;
      if (pos.y > 600) pos.y = 0;

      ants.push(
        pos.x,
        pos.y,
        pos.theta,
        AntState.Wandering,
        1 // active
      );

      // Randomly clear dirt if below grass line (y=80)
      if (pos.y > 80 && Math.random() < 0.1) {
        deltas.push([Math.floor(pos.x / 5), Math.floor(pos.y / 5)]);
      }
    }

    return {
      t,
      ants,
      deltas,
    };
  }

  public start(callback: (packet: AntPacket) => void) {
    setInterval(() => {
      callback(this.getNextPacket());
    }, 100); // 10Hz
  }
}
