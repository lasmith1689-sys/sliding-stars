import { Application, Container, FillGradient, Graphics, Text } from 'pixi.js';
import type { Layers } from './app';
import type { BoardState } from '../core/types';
import { tween } from './tween';

type Tip = { key: string; emoji: string; title: string; text: string };

/** One short coaching card per mechanic, shown the first time it appears. */
const TIPS: Tip[] = [
  { key: 'boxes', emoji: '📦', title: 'Wear down the boxes!', text: 'Supply boxes take a few hits — match tiles right beside a box to crack it, then smash it open. Clear them all to win.' },
  { key: 'door', emoji: '🚪', title: 'Station doors', text: 'A station only lets crew in through its glowing door. Slide an astronaut onto the doorway to bring them home.' },
  { key: 'crystal', emoji: '❄️', title: 'Frozen tiles', text: 'Icy tiles are stuck fast. Make a match right beside one to melt it away.' },
  { key: 'reactor', emoji: '🌋', title: 'Reactor core', text: 'It overloads every few moves and damages nearby tiles. Match beside it to cool it before it blows!' },
  { key: 'comet', emoji: '☄️', title: 'Frozen comet', text: 'A big comet blocks the board. Keep matching next to it to shatter it free.' },
  { key: 'rover', emoji: '🚙', title: 'Rescue rover', text: 'This buggy carries a crew member — clear a path so it can reach a station door.' },
  { key: 'vip', emoji: '⭐', title: 'A VIP!', text: 'Special crew! Rescue them to add them to your growing space station.' },
  { key: 'newstation', emoji: '🛰️', title: 'A brand-new station!', text: 'You filled your last station — now start a fresh one. Rescue its new crew to build it out.' },
];
const KEY = (k: string) => `sliding-stars-tip-${k}`;

/** Which mechanics does this level contain? (priority order matches TIPS). */
function tipsInLevel(state: BoardState): Set<string> {
  const present = new Set<string>();
  if (state.goal.type === 'collectN') present.add('boxes');
  for (const row of state.overlays) for (const ov of row) {
    if (ov?.kind === 'canister') present.add('boxes');
    else if (ov?.kind === 'crystal') present.add('crystal');
    else if (ov?.kind === 'reactor') present.add('reactor');
    else if (ov?.kind === 'comet') present.add('comet');
  }
  if (state.rovers.length > 0) present.add('rover');
  if (state.survivors.some((s) => s.vip)) present.add('vip');
  return present;
}

/**
 * Show a one-time tip for the first not-yet-seen mechanic in this level.
 * Resolves immediately when there's nothing new to teach.
 */
export function showMechanicTip(app: Application, layers: Layers, state: BoardState): Promise<void> {
  const present = tipsInLevel(state);
  const tip = TIPS.find((t) => present.has(t.key) && !localStorage.getItem(KEY(t.key)));
  if (!tip) return Promise.resolve();
  return showTip(app, layers, tip);
}

/**
 * Show a specific one-time tip by key (for mechanics that appear mid-play rather
 * than at level load, e.g. the first station's door, or starting a new station).
 */
export function showTipByKey(app: Application, layers: Layers, key: string): Promise<void> {
  const tip = TIPS.find((t) => t.key === key);
  if (!tip || localStorage.getItem(KEY(tip.key))) return Promise.resolve();
  return showTip(app, layers, tip);
}

function showTip(app: Application, layers: Layers, tip: Tip): Promise<void> {
  const W = app.screen.width, H = app.screen.height;
  const root = new Container();
  layers.hud.addChild(root);
  const scrim = new Graphics().rect(0, 0, W, H).fill({ color: 0x05060f, alpha: 0.72 });
  scrim.eventMode = 'static';
  root.addChild(scrim);

  const cardW = W * 0.82, cardH = H * 0.42;
  const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2;
  const card = new Graphics()
    .roundRect(cardX, cardY, cardW, cardH, 26)
    .fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: 0x2b2856 }, { offset: 1, color: 0x161230 }], textureSpace: 'local',
    }));
  card.roundRect(cardX, cardY, cardW, cardH, 26).stroke({ color: 0x8a7ae0, width: 3 });
  root.addChild(card);

  const emoji = new Text({ text: tip.emoji, style: { fontSize: cardW * 0.2 } });
  emoji.anchor.set(0.5); emoji.x = W / 2; emoji.y = cardY + cardH * 0.24; root.addChild(emoji);
  const title = new Text({ text: tip.title, style: { fill: 0xffe066, fontSize: cardW * 0.08, fontWeight: '900', align: 'center', fontFamily: 'system-ui, sans-serif' } });
  title.anchor.set(0.5); title.x = W / 2; title.y = cardY + cardH * 0.46; root.addChild(title);
  const body = new Text({ text: tip.text, style: { fill: 0xffffff, fontSize: cardW * 0.05, fontWeight: '600', align: 'center', fontFamily: 'system-ui, sans-serif', wordWrap: true, wordWrapWidth: cardW * 0.82 } });
  body.anchor.set(0.5, 0); body.x = W / 2; body.y = cardY + cardH * 0.56; root.addChild(body);

  const btnW = cardW * 0.5, btnH = cardH * 0.16;
  const btn = new Container();
  const bg = new Graphics().roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2)
    .fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: 0x6fe06a }, { offset: 1, color: 0x3f9e3a }], textureSpace: 'local' }));
  const label = new Text({ text: 'Got it!', style: { fill: 0xffffff, fontSize: btnH * 0.44, fontWeight: '900', fontFamily: 'system-ui, sans-serif' } });
  label.anchor.set(0.5); btn.addChild(bg, label);
  btn.x = W / 2; btn.y = cardY + cardH * 0.9; btn.eventMode = 'static'; btn.cursor = 'pointer';
  root.addChild(btn);

  root.alpha = 0; void tween(root, { alpha: 1 }, 260);
  return new Promise<void>((resolve) => {
    btn.on('pointertap', () => {
      localStorage.setItem(KEY(tip.key), '1');
      void tween(root, { alpha: 0 }, 200).then(() => { root.destroy(); resolve(); });
    });
  });
}
