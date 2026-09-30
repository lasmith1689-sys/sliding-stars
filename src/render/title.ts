import { Application, Assets, Container, FillGradient, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Layers } from './app';
import { outBack, tween } from './tween';
import { isBirthdayWindow } from './birthday';

/**
 * Birthday title screen. The backdrop is Zena & Pepper's mission-control room
 * (green walls + cherry-wood decor — Zena's real office), with the SLIDING STARS
 * logo, a dedication to Zena, and a PLAY button overlaid. Resolves on PLAY.
 */
export async function showTitle(app: Application, layers: Layers): Promise<void> {
  const W = app.screen.width, H = app.screen.height;
  const root = new Container();
  layers.hud.addChild(root);

  // full-bleed mission-control scene (cover-fit), or a dim scrim if it's missing
  const sceneTex = await Assets.load<Texture>('art/mission-control.png').catch(() => null);
  if (sceneTex) {
    const scene = new Sprite(sceneTex);
    scene.anchor.set(0.5);
    const scale = Math.max(W / sceneTex.width, H / sceneTex.height);
    scene.scale.set(scale);
    scene.x = W / 2; scene.y = H / 2;
    root.addChild(scene);
  } else {
    root.addChild(new Graphics().rect(0, 0, W, H).fill({ color: 0x0a0c1e, alpha: 0.5 }));
  }

  // legibility gradients top & bottom (stacked translucent bands = soft fade)
  const topScrim = new Graphics();
  for (let i = 0; i < 10; i++) {
    topScrim.rect(0, (H * 0.32 * i) / 10, W, H * 0.32 / 10)
      .fill({ color: 0x0a0c1e, alpha: 0.5 * (1 - i / 10) });
  }
  root.addChild(topScrim);
  const botScrim = new Graphics();
  for (let i = 0; i < 10; i++) {
    botScrim.rect(0, H - (H * 0.26 * (i + 1)) / 10, W, H * 0.26 / 10)
      .fill({ color: 0x0a0c1e, alpha: 0.6 * (1 - i / 10) });
  }
  root.addChild(botScrim);

  // logo
  const title = new Text({
    text: 'SLIDING\nSTARS',
    style: {
      fill: 0xffe066, fontSize: W * 0.15, fontWeight: '900', align: 'center',
      fontFamily: 'system-ui, sans-serif', letterSpacing: 2, lineHeight: W * 0.15 * 1.02,
      stroke: { color: 0x3a2a6a, width: Math.max(4, W * 0.014) },
      dropShadow: { color: 0x1a1030, blur: 6, distance: 4, alpha: 0.7, angle: Math.PI / 2 },
    },
  });
  title.anchor.set(0.5);
  title.x = W / 2; title.y = H * 0.16;
  root.addChild(title);

  // dedication ribbon — only during Zena's birthday window (July 5–19)
  if (isBirthdayWindow()) {
    const dediText = new Text({
      text: 'Happy Birthday, Zena ♥',
      style: { fill: 0xffffff, fontSize: W * 0.05, fontWeight: '700', fontFamily: 'system-ui, sans-serif' },
    });
    dediText.anchor.set(0.5);
    const ribW = dediText.width + W * 0.1, ribH = dediText.height + H * 0.02;
    const ribbon = new Container();
    const ribBg = new Graphics()
      .roundRect(-ribW / 2, -ribH / 2, ribW, ribH, ribH / 2)
      .fill(new FillGradient({
        type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
        colorStops: [{ offset: 0, color: 0xe0568c }, { offset: 1, color: 0xb83a6e }],
        textureSpace: 'local',
      }));
    ribBg.roundRect(-ribW / 2, -ribH / 2, ribW, ribH, ribH / 2).stroke({ color: 0xffd0e4, width: 2 });
    ribbon.addChild(ribBg, dediText);
    ribbon.x = W / 2; ribbon.y = H * 0.29;
    ribbon.rotation = -0.03;
    root.addChild(ribbon);
  }

  // PLAY button
  const btnW = W * 0.5, btnH = H * 0.08;
  const btn = new Container();
  const btnBg = new Graphics()
    .roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2)
    .fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: 0x6fe06a }, { offset: 1, color: 0x3f9e3a }],
      textureSpace: 'local',
    }));
  btnBg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2).stroke({ color: 0xd4ffce, width: 3 });
  btnBg.roundRect(-btnW * 0.4, -btnH * 0.34, btnW * 0.8, btnH * 0.24, btnH * 0.12).fill({ color: 0xffffff, alpha: 0.18 });
  const btnLabel = new Text({
    text: 'PLAY',
    style: { fill: 0xffffff, fontSize: btnH * 0.5, fontWeight: '900', fontFamily: 'system-ui, sans-serif', letterSpacing: 2 },
  });
  btnLabel.anchor.set(0.5);
  btn.addChild(btnBg, btnLabel);
  btn.x = W / 2; btn.y = H * 0.9;
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  root.addChild(btn);
  const pulse = async () => {
    while (!root.destroyed) {
      await tween(btn.scale, { x: 1.06, y: 1.06 }, 620);
      await tween(btn.scale, { x: 1, y: 1 }, 620);
    }
  };
  void pulse();

  root.alpha = 0;
  void tween(root, { alpha: 1 }, 350);
  title.scale.set(0.7);
  void tween(title.scale, { x: 1, y: 1 }, 450, outBack);

  return new Promise<void>((resolve) => {
    btn.on('pointertap', () => {
      void tween(root, { alpha: 0 }, 250).then(() => { root.destroy(); resolve(); });
    });
  });
}
