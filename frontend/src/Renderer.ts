import * as PIXI from 'pixi.js';
import { AntPacket } from './types';
import { AntSprite } from './AntSprite';
import { WorldRenderer } from './WorldRenderer';
import { InterpolationBuffer } from './InterpolationBuffer';

export class Renderer {
  private app: PIXI.Application;
  private antSprites: Map<number, AntSprite> = new Map();
  private buffer: InterpolationBuffer;
  private worldRenderer: WorldRenderer;
  private antContainer: PIXI.Container;

  private readonly INTERPOLATION_DELAY = 100; // ms

  constructor(app: PIXI.Application) {
    this.app = app;
    this.buffer = new InterpolationBuffer(this.INTERPOLATION_DELAY);
    this.worldRenderer = new WorldRenderer(app);
    this.app.stage.addChild(this.worldRenderer);

    this.antContainer = new PIXI.Container();
    this.app.stage.addChild(this.antContainer);

    this.app.ticker.add((ticker) => {
      this.update(ticker.elapsedMS);
    });
  }

  public addPacket(packet: AntPacket) {
    this.buffer.addPacket(packet);
    // Apply deltas immediately to the world renderer
    this.worldRenderer.applyDeltas(packet.deltas);
  }

  public applySnapshot(grid: number[][]) {
    this.worldRenderer.applySnapshot(grid);
  }

  private update(dt: number) {
    const renderTime = Date.now() - this.INTERPOLATION_DELAY;
    const state = this.buffer.getInterpolationState(renderTime);

    if (!state) {
      return;
    }

    this.renderAnts(state.packetA, state.packetB, state.alpha, dt);
  }

  private renderAnts(packetA: AntPacket, packetB: AntPacket, alpha: number, dt: number) {
    // Ants are flattened: [x, y, theta, state, active]
    const stride = 5;
    const numAnts = packetA.ants.length / stride;

    for (let i = 0; i < numAnts; i++) {
      const idx = i * stride;
      const id = i; // The index is the permanent ID

      const activeB = packetB.ants[idx + 4];

      if (!activeB) {
        // Ant is not active in the newer packet, hide it
        const sprite = this.antSprites.get(id);
        if (sprite) {
          sprite.visible = false;
        }
        continue;
      }

      let sprite = this.antSprites.get(id);
      if (!sprite) {
        sprite = new AntSprite();
        this.antSprites.set(id, sprite);
        this.antContainer.addChild(sprite);
      }

      sprite.visible = true;

      // Interpolate position
      const xA = packetA.ants[idx];
      const yA = packetA.ants[idx + 1];
      const xB = packetB.ants[idx];
      const yB = packetB.ants[idx + 1];

      sprite.x = xA + (xB - xA) * alpha;
      sprite.y = yA + (yB - yA) * alpha;

      // Interpolate rotation (handling wrap around)
      const thetaA = packetA.ants[idx + 2];
      let thetaB = packetB.ants[idx + 2];

      // Ensure we take the shortest path for rotation
      while (thetaB - thetaA > Math.PI) thetaB -= Math.PI * 2;
      while (thetaB - thetaA < -Math.PI) thetaB += Math.PI * 2;

      sprite.setRotation(thetaA + (thetaB - thetaA) * alpha);
      sprite.updateAnimation(dt);
    }
  }
}
