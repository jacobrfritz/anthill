import * as PIXI from 'pixi.js';
import { Renderer } from './Renderer';
import { WebSocketProvider } from './WebSocketProvider';
// import { MockProvider } from './MockProvider';

async function init() {
  const app = new PIXI.Application();

  await app.init({
    width: 800,
    height: 600,
    backgroundColor: 0x5c94fc,
  });

  document.body.appendChild(app.canvas);

  const renderer = new Renderer(app);
  
  // Use WebSocketProvider for real simulation data
  const wsProvider = new WebSocketProvider();
  wsProvider.connect(
    (packet) => renderer.addPacket(packet),
    (grid) => renderer.applySnapshot(grid)
  );

  /*
  const mockProvider = new MockProvider();
  mockProvider.start((packet) => {
    renderer.addPacket(packet);
  });
  */
}

init();
