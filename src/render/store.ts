import { Application, Container, FillGradient, Graphics, Sprite, Text } from 'pixi.js';
import type { Layers } from './app';
import type { TextureSet } from './textures';
import { POWER_UP_COST, type PowerUpKind } from '../core';
import { canBuy, buy, type Wallet } from '../meta/wallet';
import { outBack, tween } from './tween';

const ITEMS: { kind: PowerUpKind; name: string; desc: string }[] = [
  { kind: 'demo', name: 'Demolition', desc: 'Blast one tile off the board' },
  { kind: 'wormhole', name: 'Wormhole', desc: 'Reshuffle the whole board' },
  { kind: 'tractor', name: 'Tractor Beam', desc: 'Pull adrift crew onto a tile' },
];

/**
 * Mid-game store: spend banked coins on power-up charges. Returns the updated
 * wallet for the caller to persist. Tapping an affordable item buys one; the
 * coin balance and owned counts update live.
 */
export function showStore(
  app: Application, layers: Layers, textures: TextureSet, wallet: Wallet,
): Promise<Wallet> {
  const W = app.screen.width, H = app.screen.height;
  const root = new Container();
  layers.hud.addChild(root);
  // interactive backdrop so taps never bleed through to the live board/HUD
  const backdrop = new Graphics().rect(0, 0, W, H).fill(new FillGradient({
    type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
    colorStops: [{ offset: 0, color: 0x1a1240 }, { offset: 1, color: 0x0a0c1e }], textureSpace: 'local',
  }));
  backdrop.eventMode = 'static';
  root.addChild(backdrop);

  let state = wallet;

  const title = new Text({ text: 'Store', style: { fill: 0xffe066, fontSize: W * 0.08, fontWeight: '900', fontFamily: 'system-ui, sans-serif' } });
  title.anchor.set(0.5); title.x = W / 2; title.y = H * 0.09; root.addChild(title);

  // coin balance (crystal icon + number)
  const purse = new Container();
  const coinIcon = new Sprite(textures.crystal); coinIcon.anchor.set(0.5); coinIcon.width = coinIcon.height = W * 0.06;
  const coins = new Text({ text: `${state.coins}`, style: { fill: 0xaef0e8, fontSize: W * 0.06, fontWeight: '800', fontFamily: 'system-ui, sans-serif' } });
  coins.anchor.set(0, 0.5); coins.x = W * 0.04;
  purse.addChild(coinIcon, coins); purse.x = W / 2 - coins.width * 0.5; purse.y = H * 0.17; root.addChild(purse);
  const refreshCoins = () => { coins.text = `${state.coins}`; };

  const icons = { demo: textures.iconDemo, wormhole: textures.iconWormhole, tractor: textures.iconTractor } as const;
  const cardH = H * 0.13, cardW = W * 0.84;

  ITEMS.forEach((item, i) => {
    const card = new Container();
    const bg = new Graphics();
    const owned = new Text({ text: '', style: { fill: 0x9fdc8a, fontSize: cardH * 0.2, fontWeight: '800', fontFamily: 'system-ui, sans-serif' } });
    const cost = new Text({ text: `${POWER_UP_COST[item.kind]}`, style: { fill: 0xffffff, fontSize: cardH * 0.26, fontWeight: '900', fontFamily: 'system-ui, sans-serif' } });

    const draw = () => {
      const affordable = canBuy(state, item.kind);
      bg.clear();
      bg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 18).fill({ color: 0x241d4e });
      bg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 18).stroke({ color: affordable ? 0x7dd45f : 0x3a3468, width: 3 });
      owned.text = `owned x${state.inventory[item.kind]}`;
      cost.style.fill = affordable ? 0xaef0e8 : 0x8a8fa8;
    };

    card.addChild(bg);
    const icon = new Sprite(icons[item.kind]); icon.anchor.set(0.5);
    icon.width = icon.height = cardH * 0.62; icon.x = -cardW / 2 + cardH * 0.55; card.addChild(icon);
    // name/desc across the top (scaled down if ever too wide), owned bottom-left,
    // price bottom-right — nothing can collide
    const textX = -cardW / 2 + cardH;
    const maxTextW = cardW / 2 - cardH * 0.2 - textX;
    const fit = (t: Text) => { if (t.width > maxTextW) t.scale.set(maxTextW / t.width); };
    const name = new Text({ text: item.name, style: { fill: 0xffffff, fontSize: cardH * 0.26, fontWeight: '800', fontFamily: 'system-ui, sans-serif' } });
    name.anchor.set(0, 0); name.x = textX; name.y = -cardH * 0.36; fit(name); card.addChild(name);
    const desc = new Text({ text: item.desc, style: { fill: 0xcfc8ff, fontSize: cardH * 0.17, fontFamily: 'system-ui, sans-serif' } });
    desc.anchor.set(0, 0); desc.x = textX; desc.y = -cardH * 0.06; fit(desc); card.addChild(desc);
    owned.anchor.set(0, 1); owned.x = textX; owned.y = cardH * 0.4; card.addChild(owned);
    cost.anchor.set(1, 1); cost.x = cardW / 2 - cardH * 0.24; cost.y = cardH * 0.4; card.addChild(cost);
    const coinPip = new Sprite(textures.crystal); coinPip.anchor.set(0.5); coinPip.width = coinPip.height = cardH * 0.28;
    coinPip.x = cardW / 2 - cardH * 0.24 - cost.width - cardH * 0.2; coinPip.y = cardH * 0.26; card.addChild(coinPip);

    draw();
    card.x = W / 2; card.y = H * 0.3 + i * cardH * 1.35;
    card.eventMode = 'static'; card.cursor = 'pointer';
    card.on('pointertap', () => {
      if (canBuy(state, item.kind)) {
        state = buy(state, item.kind);
        refreshCoins(); draw();
        void tween(card.scale, { x: 1.05, y: 1.05 }, 70, outBack).then(() => tween(card.scale, { x: 1, y: 1 }, 90));
      } else {
        const x0 = card.x;
        void tween(card, { x: x0 + 5 }, 45).then(() => tween(card, { x: x0 - 5 }, 60).then(() => tween(card, { x: x0 }, 45)));
      }
    });
    root.addChild(card);
  });

  // Close button
  const btn = new Container();
  const bw = W * 0.4, bh = H * 0.08;
  const bbg = new Graphics().roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2)
    .fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: 0x6fe06a }, { offset: 1, color: 0x3f9e3a }], textureSpace: 'local' }));
  const blabel = new Text({ text: 'Done', style: { fill: 0xffffff, fontSize: bh * 0.42, fontWeight: '900', fontFamily: 'system-ui, sans-serif' } });
  blabel.anchor.set(0.5); btn.addChild(bbg, blabel);
  btn.x = W / 2; btn.y = H * 0.9; btn.eventMode = 'static'; btn.cursor = 'pointer';
  root.addChild(btn);

  root.alpha = 0; void tween(root, { alpha: 1 }, 240);
  title.scale.set(0.8); void tween(title.scale, { x: 1, y: 1 }, 380, outBack);

  return new Promise<Wallet>((resolve) => {
    btn.on('pointertap', () => { void tween(root, { alpha: 0 }, 200).then(() => { root.destroy(); resolve(state); }); });
  });
}
