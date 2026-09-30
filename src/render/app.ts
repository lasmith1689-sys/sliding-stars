import { Application, Container } from 'pixi.js';

export type Layers = {
  board: Container;
  pieces: Container;
  actors: Container;
  fx: Container;
  hud: Container;
};

export async function createApp(): Promise<{ app: Application; layers: Layers }> {
  const gameEl = document.getElementById('game')!;
  const app = new Application();
  await app.init({
    resizeTo: gameEl, // the safe-area rectangle, not the full window (avoids the status bar)
    background: 0x0d1030,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  gameEl.appendChild(app.canvas);

  const layers: Layers = {
    board: new Container(),
    pieces: new Container(),
    actors: new Container(),
    fx: new Container(),
    hud: new Container(),
  };
  app.stage.addChild(layers.board, layers.pieces, layers.actors, layers.fx, layers.hud);
  return { app, layers };
}
