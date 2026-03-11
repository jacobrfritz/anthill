import * as PIXI from 'pixi.js';

export class WorldRenderer extends PIXI.Container {
  private sky: PIXI.Graphics;
  private hills: PIXI.Graphics;
  private dirtSprite: PIXI.Sprite;
  private dirtTexture: PIXI.RenderTexture;
  private grass: PIXI.Graphics;

  private readonly WIDTH = 800;
  private readonly HEIGHT = 600;
  private readonly GRID_WIDTH = 160;
  private readonly GRID_HEIGHT = 120;
  private readonly SCALE = 5;
  private readonly GRASS_LINE = 80; // pixels

  private readonly DIRT_COLOR = 0x8b4513;
  private readonly DIRT_DARK = 0x5d2e0d;
  private readonly DIRT_LIGHT = 0xa0522d;
  private readonly SKY_COLOR = 0x5c94fc;

  constructor(private app: PIXI.Application) {
    super();

    // 1. Sky
    this.sky = new PIXI.Graphics();
    this.sky.rect(0, 0, this.WIDTH, this.HEIGHT).fill(this.SKY_COLOR);
    this.addChild(this.sky);

    // 2. Hills
    this.hills = this.drawHills();
    this.addChild(this.hills);

    // 3. Dirt RenderTexture
    this.dirtTexture = PIXI.RenderTexture.create({
      width: this.GRID_WIDTH,
      height: this.GRID_HEIGHT,
      scaleMode: 'nearest',
    });

    this.renderInitialDirt();

    this.dirtSprite = new PIXI.Sprite(this.dirtTexture);
    this.dirtSprite.scale.set(this.SCALE);
    this.addChild(this.dirtSprite);

    // 4. Grass
    this.grass = this.drawDetailedGrass();
    this.addChild(this.grass);
  }

  private drawHills(): PIXI.Graphics {
    const hills = new PIXI.Graphics();
    const hillColor = 0x4caf50;
    const hillShadow = 0x388e3c;

    // Background hills
    hills.ellipse(200, this.GRASS_LINE + 20, 150, 80).fill(hillShadow);
    hills.ellipse(600, this.GRASS_LINE + 40, 200, 100).fill(hillShadow);
    
    hills.ellipse(150, this.GRASS_LINE + 10, 120, 60).fill(hillColor);
    hills.ellipse(450, this.GRASS_LINE + 20, 180, 80).fill(hillColor);
    hills.ellipse(750, this.GRASS_LINE + 10, 100, 50).fill(hillColor);

    return hills;
  }

  private drawDetailedGrass(): PIXI.Graphics {
    const grass = new PIXI.Graphics();
    const grassColor = 0x76c442;
    const darkGrass = 0x558b2f;

    // Main grass body
    grass.rect(0, this.GRASS_LINE - 10, this.WIDTH, 15).fill(grassColor);
    
    // Shadows/Roots at the bottom
    grass.rect(0, this.GRASS_LINE + 5, this.WIDTH, 5).fill(darkGrass);

    // Tufts
    for (let x = 0; x < this.WIDTH; x += 15) {
      const height = 5 + Math.random() * 10;
      grass.moveTo(x, this.GRASS_LINE - 10)
           .lineTo(x + 5, this.GRASS_LINE - 10 - height)
           .lineTo(x + 10, this.GRASS_LINE - 10)
           .fill(grassColor);
    }

    return grass;
  }

  private renderInitialDirt() {
    const graphics = new PIXI.Graphics();
    const startY = this.GRASS_LINE / this.SCALE;
    
    graphics.rect(0, startY, this.GRID_WIDTH, this.GRID_HEIGHT - startY).fill(this.DIRT_COLOR);
    
    // Add texture
    for (let i = 0; i < 400; i++) {
      const tx = Math.floor(Math.random() * this.GRID_WIDTH);
      const ty = Math.floor(Math.random() * (this.GRID_HEIGHT - startY)) + startY;
      const color = Math.random() > 0.5 ? this.DIRT_DARK : this.DIRT_LIGHT;
      graphics.rect(tx, ty, 1, 1).fill(color);
    }

    this.app.renderer.render({
      container: graphics,
      target: this.dirtTexture,
      clear: true,
    });
  }

  public applySnapshot(grid: number[][]) {
    const graphics = new PIXI.Graphics();
    graphics.clear();
    
    // Background (revealed when dirt is cleared)
    // Use a slightly darker color for tunnels, only below the grass line
    const tunnelColor = 0x4a2a10;
    const startY = this.GRASS_LINE / this.SCALE;
    graphics.rect(0, startY, this.GRID_WIDTH, this.GRID_HEIGHT - startY).fill(tunnelColor);
    
    for (let x = 0; x < this.GRID_WIDTH; x++) {
      for (let y = 0; y < this.GRID_HEIGHT; y++) {
        if (grid[x][y] === 1) {
          const noise = Math.random();
          let color = this.DIRT_COLOR;
          if (noise > 0.95) color = this.DIRT_DARK;
          else if (noise < 0.05) color = this.DIRT_LIGHT;
          
          graphics.rect(x, y, 1, 1).fill(color);
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
    const startY = this.GRASS_LINE / this.SCALE;
    if (gy < startY) return; // Don't clear air

    const tunnelGraphics = new PIXI.Graphics();
    tunnelGraphics.rect(gx, gy, 1, 1).fill(0x4a2a10); // Darker brown for tunnel
    
    this.app.renderer.render({
      container: tunnelGraphics,
      target: this.dirtTexture,
      clear: false,
    });
  }

  public applyDeltas(deltas: [number, number][]) {
    for (const [gx, gy] of deltas) {
      this.clearDirt(gx, gy);
    }
  }
}
