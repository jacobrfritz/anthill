import * as PIXI from 'pixi.js';

export class AntSprite extends PIXI.Container {
  private body: PIXI.Graphics;
  private legs: PIXI.Graphics;
  private walkFrame: number = 0;
  private lastWalkTime: number = 0;

  constructor() {
    super();

    // Body
    this.body = new PIXI.Graphics();
    this.body.ellipse(0, 0, 4, 2).fill(0x000000); // Head/Body
    this.addChild(this.body);

    // Legs
    this.legs = new PIXI.Graphics();
    this.addChild(this.legs);

    this.drawLegs();
  }

  private drawLegs() {
    this.legs.clear();

    const offset = this.walkFrame === 0 ? 1 : -1;

    // Draw simple legs
    this.legs
      .moveTo(-2, -2 + offset)
      .lineTo(2, 2 + offset)
      .moveTo(-2, 2 - offset)
      .lineTo(2, -2 - offset)
      .moveTo(0, -3)
      .lineTo(0, 3)
      .stroke({ width: 1, color: 0x000000 });
  }

  public updateAnimation(dt: number) {
    this.lastWalkTime += dt;
    if (this.lastWalkTime > 100) { // 100ms per frame
      this.walkFrame = (this.walkFrame + 1) % 2;
      this.drawLegs();
      this.lastWalkTime = 0;
    }
  }

  public setRotation(theta: number) {
    this.rotation = theta;
  }
}
