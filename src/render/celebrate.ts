import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Layers } from './app';
import type { TextureSet } from './textures';
import { outBack, tween } from './tween';

/**
 * A short, escalating "Station N complete!" cheer shown when a station is fully
 * built (after the first, which gets the heartfelt finale instead). The cheer
 * grows with how many stations she has completed.
 */
export function showCelebration(
  app: Application, layers: Layers, textures: TextureSet, stationsCompleted: number,
): Promise<void> {
  const W = app.screen.width, H = app.screen.height;
  const root = new Container(); layers.hud.addChild(root);
  const scrim = new Graphics().rect(0, 0, W, H).fill({ color: 0x0a0c1e, alpha: 0.86 });
  scrim.eventMode = 'static'; root.addChild(scrim);

  // confetti — more with each station completed
  const pieces = Math.min(140, 40 + stationsCompleted * 24);
  const colors = [0xffe066, 0x7dd45f, 0xe0568c, 0x5fb0ff, 0xff9f4a];
  for (let i = 0; i < pieces; i++) {
    const c = new Graphics().rect(-3, -6, 6, 12).fill(colors[i % colors.length]!);
    c.x = Math.random() * W; c.y = -Math.random() * H * 0.5; c.rotation = Math.random() * Math.PI;
    root.addChild(c);
    void tween(c, { y: H + 20, rotation: c.rotation + (Math.random() * 6 - 3) }, 1400 + Math.random() * 1200);
  }

  const title = new Text({
    text: `Station ${stationsCompleted} complete!`,
    style: { fill: 0xffe066, fontSize: W * 0.085, fontWeight: '900', align: 'center', fontFamily: 'system-ui, sans-serif' },
  });
  title.anchor.set(0.5); title.x = W / 2; title.y = H * 0.42; root.addChild(title);
  title.scale.set(0.6); void tween(title.scale, { x: 1, y: 1 }, 460, outBack);

  const sub = new Text({
    text: 'Onward to the next one!',
    style: { fill: 0xffffff, fontSize: W * 0.045, fontWeight: '700', fontFamily: 'system-ui, sans-serif' },
  });
  sub.anchor.set(0.5); sub.x = W / 2; sub.y = H * 0.52; root.addChild(sub);

  // Pepper pops in to celebrate
  if (textures.pepper) {
    const pep = new Sprite(textures.pepper);
    pep.anchor.set(0.5, 1); pep.height = H * 0.2;
    pep.width = pep.height * (textures.pepper.width / textures.pepper.height);
    pep.x = W / 2; pep.y = H * 0.86; root.addChild(pep);
    pep.scale.set(0); const t = (H * 0.2) / textures.pepper.height;
    void tween(pep.scale, { x: t, y: t }, 500, outBack);
  }

  root.alpha = 0; void tween(root, { alpha: 1 }, 280);
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; void tween(root, { alpha: 0 }, 240).then(() => { root.destroy(); resolve(); }); };
    scrim.on('pointertap', finish);
    setTimeout(finish, 3200); // auto-dismiss so it never blocks progress
  });
}
