import { Application, Container, FillGradient, Graphics, Sprite, Text } from 'pixi.js';
import type { Layers } from './app';
import type { TextureSet } from './textures';
import { outBack, tween } from './tween';

/**
 * A one-time heartfelt beat once Zena has rescued a whole crew: a thank-you note
 * from the crew, with Pepper peeking in and stamping a muddy paw-print. Resolves
 * when dismissed. The caller decides when it fires and records that it was seen.
 */
export function showFinale(app: Application, layers: Layers, textures: TextureSet): Promise<void> {
  const W = app.screen.width, H = app.screen.height;
  const root = new Container();
  layers.hud.addChild(root);

  const scrim = new Graphics().rect(0, 0, W, H).fill(new FillGradient({
    type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
    colorStops: [{ offset: 0, color: 0x141636 }, { offset: 1, color: 0x0a0c1e }], textureSpace: 'local',
  }));
  scrim.eventMode = 'static';
  root.addChild(scrim);

  const cardW = W * 0.84, cardH = H * 0.6;
  const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2;
  const card = new Graphics()
    .roundRect(cardX, cardY, cardW, cardH, 28)
    .fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: 0x2b2856 }, { offset: 1, color: 0x161230 }], textureSpace: 'local',
    }));
  card.roundRect(cardX, cardY, cardW, cardH, 28).stroke({ color: 0xe0568c, width: 3 });
  root.addChild(card);

  const heading = new Text({
    text: 'From all of us up here',
    style: { fill: 0xffe066, fontSize: cardW * 0.075, fontWeight: '900', align: 'center', fontFamily: 'system-ui, sans-serif' },
  });
  heading.anchor.set(0.5, 0); heading.x = W / 2; heading.y = cardY + cardH * 0.07; root.addChild(heading);

  const body = new Text({
    text: 'Commander Zena — thank you for bringing every last one of us home. This little station is ours because of you. Happy birthday, with all our love. ♥',
    style: {
      fill: 0xffffff, fontSize: cardW * 0.052, fontWeight: '600', align: 'center',
      fontFamily: 'system-ui, sans-serif', wordWrap: true, wordWrapWidth: cardW * 0.84, lineHeight: cardW * 0.072,
    },
  });
  body.anchor.set(0.5, 0); body.x = W / 2; body.y = cardY + cardH * 0.19; root.addChild(body);

  const note = new Text({
    text: 'Pepper left you a muddy hello:',
    style: { fill: 0xcfc8ff, fontSize: cardW * 0.045, fontWeight: '600', fontStyle: 'italic', fontFamily: 'system-ui, sans-serif' },
  });
  note.anchor.set(0.5, 0); note.x = W / 2; note.y = cardY + cardH * 0.58; root.addChild(note);

  // Pepper's muddy paw print, stamped a touch crooked
  if (textures.pawPrint) {
    const paw = new Sprite(textures.pawPrint);
    paw.anchor.set(0.5);
    paw.width = paw.height = cardW * 0.24;
    paw.x = W / 2; paw.y = cardY + cardH * 0.75;
    paw.rotation = -0.12;
    root.addChild(paw);
    paw.scale.set(0); // stamp it on with a little bounce
    const target = (cardW * 0.24) / (textures.pawPrint.width || 1);
    void tween(paw.scale, { x: target, y: target }, 420, outBack);
  }

  // Pepper peeks in from the top-right corner
  if (textures.pepper) {
    const pep = new Sprite(textures.pepper);
    pep.anchor.set(0.5, 1);
    pep.height = cardH * 0.24; pep.width = pep.height * (textures.pepper.width / textures.pepper.height);
    pep.x = cardX + cardW * 0.85; pep.y = cardY + 8;
    root.addChild(pep);
  }

  const btnW = cardW * 0.4, btnH = cardH * 0.13;
  const btn = new Container();
  const bg = new Graphics().roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2)
    .fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: 0xe0568c }, { offset: 1, color: 0xb83a6e }], textureSpace: 'local',
    }));
  const label = new Text({ text: '♥', style: { fill: 0xffffff, fontSize: btnH * 0.5, fontWeight: '900', fontFamily: 'system-ui, sans-serif' } });
  label.anchor.set(0.5); btn.addChild(bg, label);
  btn.x = W / 2; btn.y = cardY + cardH * 0.93; btn.eventMode = 'static'; btn.cursor = 'pointer';
  root.addChild(btn);

  root.alpha = 0; void tween(root, { alpha: 1 }, 320);

  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      void tween(root, { alpha: 0 }, 240).then(() => { root.destroy(); resolve(); });
    };
    btn.on('pointertap', finish);
    scrim.on('pointertap', finish); // tap anywhere to continue
  });
}
