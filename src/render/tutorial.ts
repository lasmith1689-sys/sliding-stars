import { Application, Assets, Container, FillGradient, Graphics, Text, Texture, Sprite } from 'pixi.js';
import type { Layers } from './app';
import { tween } from './tween';

const SEEN_KEY = 'sliding-stars-tutorial-seen';

/**
 * One-time coaching card (guided by Pepper) that teaches the core loop:
 * grow land → build a station → get the crew there. Shown once on level 1;
 * resolves when dismissed. Skips instantly if already seen.
 */
export async function showTutorial(app: Application, layers: Layers): Promise<void> {
  if (localStorage.getItem(SEEN_KEY)) return;
  const W = app.screen.width, H = app.screen.height;
  const root = new Container();
  layers.hud.addChild(root);

  const scrim = new Graphics().rect(0, 0, W, H).fill({ color: 0x05060f, alpha: 0.72 });
  scrim.eventMode = 'static';
  root.addChild(scrim);

  const cardW = W * 0.84, cardH = H * 0.52;
  const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2;
  const card = new Graphics()
    .roundRect(cardX, cardY, cardW, cardH, 26)
    .fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: 0x2b2856 }, { offset: 1, color: 0x161230 }],
      textureSpace: 'local',
    }));
  card.roundRect(cardX, cardY, cardW, cardH, 26).stroke({ color: 0x8a7ae0, width: 3 });
  root.addChild(card);

  const heading = new Text({
    text: 'How to rescue',
    style: {
      fill: 0xffe066, fontSize: cardW * 0.08, fontWeight: '900', align: 'center',
      fontFamily: 'system-ui, sans-serif',
    },
  });
  heading.anchor.set(0.5, 0);
  heading.x = W / 2; heading.y = cardY + cardH * 0.06;
  root.addChild(heading);

  const steps = [
    ['🌱', 'Swap two tiles to line up 3 — they merge into greener, safer land.'],
    ['🛰️', 'Match 3 green living-land tiles to build a Space Station.'],
    ['🧑‍🚀', 'Slide an astronaut onto the station’s glowing door — rescued!'],
  ];
  const startY = cardY + cardH * 0.26;
  const rowH = cardH * 0.17;
  steps.forEach(([icon, txt], i) => {
    const y = startY + i * rowH;
    const badge = new Text({ text: icon, style: { fontSize: rowH * 0.5 } });
    badge.anchor.set(0.5); badge.x = cardX + cardW * 0.13; badge.y = y + rowH * 0.4;
    root.addChild(badge);
    const line = new Text({
      text: txt,
      style: {
        fill: 0xffffff, fontSize: cardW * 0.05, fontWeight: '600',
        fontFamily: 'system-ui, sans-serif', wordWrap: true, wordWrapWidth: cardW * 0.68,
      },
    });
    line.anchor.set(0, 0.5); line.x = cardX + cardW * 0.24; line.y = y + rowH * 0.4;
    root.addChild(line);
  });

  // Pepper peeks from the card corner as the guide
  const pepTex = await Assets.load<Texture>('art/pepper.png').catch(() => null);
  if (pepTex) {
    const pep = new Sprite(pepTex);
    pep.anchor.set(0.5, 1);
    pep.height = cardH * 0.26; pep.width = pep.height * (pepTex.width / pepTex.height);
    pep.x = cardX + cardW * 0.86; pep.y = cardY + 6;
    root.addChild(pep);
  }

  // Got it! button
  const btnW = cardW * 0.55, btnH = cardH * 0.15;
  const btn = new Container();
  const bg = new Graphics()
    .roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2)
    .fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: 0x6fe06a }, { offset: 1, color: 0x3f9e3a }],
      textureSpace: 'local',
    }));
  bg.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2).stroke({ color: 0xd4ffce, width: 3 });
  const label = new Text({
    text: "Let's go!",
    style: { fill: 0xffffff, fontSize: btnH * 0.44, fontWeight: '900', fontFamily: 'system-ui, sans-serif' },
  });
  label.anchor.set(0.5);
  btn.addChild(bg, label);
  btn.x = W / 2; btn.y = cardY + cardH * 0.9;
  btn.eventMode = 'static'; btn.cursor = 'pointer';
  root.addChild(btn);

  root.alpha = 0; void tween(root, { alpha: 1 }, 300);

  return new Promise<void>((resolve) => {
    btn.on('pointertap', () => {
      localStorage.setItem(SEEN_KEY, '1');
      void tween(root, { alpha: 0 }, 220).then(() => { root.destroy(); resolve(); });
    });
  });
}
