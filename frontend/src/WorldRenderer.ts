import * as PIXI from 'pixi.js';

export class WorldRenderer extends PIXI.Container {
  private sky: PIXI.Graphics;
  private dirtSprite: PIXI.Sprite;
  private dirtTexture: PIXI.RenderTexture;
  private grass: PIXI.Graphics;
  private eraser: PIXI.Graphics;

  private readonly WIDTH = 800;
  private readonly HEIGHT = 600;
  private readonly GRID_WIDTH = 160;
  private readonly GRID_HEIGHT = 120;
  private readonly SCALE = 5;
  private readonly GRASS_LINE = 80; // pixels

  constructor(private app: PIXI.Application) {
    super();

    // 1. Sky
    this.sky = new PIXI.Graphics();
    this.sky.rect(0, 0, this.WIDTH, this.HEIGHT).fill(0x5c94fc);
    this.addChild(this.sky);

    // 2. Dirt RenderTexture
    this.dirtTexture = PIXI.RenderTexture.create({
      width: this.GRID_WIDTH,
      height: this.GRID_HEIGHT,
      scaleMode: 'nearest',
    });

    // Fill dirtTexture with dirt color
    const initialDirt = new PIXI.Graphics();
    initialDirt
      .rect(0, this.GRASS_LINE / this.SCALE, this.GRID_WIDTH, this.GRID_HEIGHT - this.GRASS_LINE / this.SCALE)
      .fill(0x8b4513);
    this.app.renderer.render({
      container: initialDirt,
      target: this.dirtTexture,
      clear: true,
    });

    this.dirtSprite = new PIXI.Sprite(this.dirtTexture);
    this.dirtSprite.scale.set(this.SCALE);
    this.addChild(this.dirtSprite);

    // 3. Grass
    this.grass = new PIXI.Graphics();
    this.grass.rect(0, this.GRASS_LINE - 2, this.WIDTH, 4).fill(0x76c442);
    this.addChild(this.grass);

    // 4. Eraser for tunnels
    this.eraser = new PIXI.Graphics();
    this.eraser.rect(0, 0, 1, 1).fill(0xffffff); // Color doesn't matter for erase
  }

  public applySnapshot(grid: number[][]) {
    const graphics = new PIXI.Graphics();
    graphics.clear();
    
    // Clear whole texture first (Air/Sky)
    graphics.rect(0, 0, this.GRID_WIDTH, this.GRID_HEIGHT).fill(0x5c94fc);
    
    for (let x = 0; x < this.GRID_WIDTH; x++) {
      for (let y = 0; y < this.GRID_HEIGHT; y++) {
        if (grid[x][y] === 1) {
          graphics.rect(x, y, 1, 1).fill(0x8b4513);
        }
      }
    }
    
    this.app.renderer.render({
      container: graphics,
      target: this.dirtTexture,
      clear: true,
    });
  }

  public clearDirt(gx: number, gy: number) {
    this.eraser.position.set(gx, gy);
    this.app.renderer.render({
      container: this.eraser,
      target: this.dirtTexture,
      clear: false,
    });
  }

  public applyDeltas(deltas: [number, number][]) {
    // Optimization: render multiple erasers in one go?
    // For now, simple loop
    for (const [gx, gy] of deltas) {
      // Set blendMode to erase
      // In PixiJS 8, blendMode is on the State or RenderLayer?
      // Actually we can just set it on the graphics object
      this.eraser.blendMode = 'erase';
      this.clearDirt(gx, gy);
    }
  }
}
