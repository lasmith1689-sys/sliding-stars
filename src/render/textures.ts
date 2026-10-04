import { Application, Assets, Container, FillGradient, Graphics, Texture } from 'pixi.js';
import {Capacitor} from '@capacitor/core';
import type { Tier } from '../core/types';
import { TIER_FILL } from './palette';
import { STATIONS } from '../meta/roster';
import { CAMPAIGN_ASSETS,type CampaignAssetId } from '../assets/campaign-manifest';

export type TextureSet = {
  campaign?: Partial<Record<CampaignAssetId,Texture>>;
  tile: Record<Tier, Texture>;
  pod: Texture;
  dome: Texture; // the rescue shuttle (safe zone)
  survivor: Texture;
  bubbleRescue: Texture;
  bubbleShelter: Texture;
  crystal: Texture;
  iconDemo: Texture;
  iconWormhole: Texture;
  iconTractor: Texture;
  // overlay objects (image-only; undefined until generated art loads)
  canisterOverlay?: Texture;
  canisterCracked?: Texture;    // box wear stage 2 (hp 2)
  canisterCrumbling?: Texture;  // box wear stage 1 (hp 1)
  crystalOverlay?: Texture;
  reactorOverlay?: Texture;
  cometOverlay?: Texture;
  roverOverlay?: Texture;
  iconStation?: Texture; // HUD button: open the station
  iconStore?: Texture;   // HUD button: open the store
  pawPrint?: Texture;    // Pepper's muddy paw print (finale)
  pepper?: Texture;      // Pepper the dog (celebrations)
  commander?: Texture;   // Commander Zena (title)
  stationInterior?: Texture; // ship-interior backdrop for the station screen
  // ever-expanding station: core hub + module pods + VIP crew (keyed by id)
  station: { core?: Texture; modules: Record<string, Texture>; vips: Record<string, Texture> };
};

/* --------------------------------------------------------------------- */
/* HD painterly rendering — premium mobile-game look: smooth gradients,   */
/* soft bevels, rounded organic detail. Painted in a 128-unit space.      */
/* --------------------------------------------------------------------- */

const U = 128;

function shade(color: number, f: number): number {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + f))));
  return (ch((color >> 16) & 0xff) << 16) | (ch((color >> 8) & 0xff) << 8) | ch(color & 0xff);
}

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vGrad(top: number, bottom: number, h = U): FillGradient {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: h / U },
    colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }],
    textureSpace: 'local',
  });
}

const R = 18;        // tile corner radius
const LIP = 16;      // front-face depth

/**
 * Premium tile block: gradient top face, thick darker front lip, soft inner
 * highlight, gentle ambient occlusion, clean dark outline.
 */
function blockBase(g: Graphics, base: number): void {
  const outline = shade(base, -0.55);
  // front lip (drawn first, peeking below the top face)
  g.roundRect(0, U - LIP - R, U, LIP + R, R).fill(vGrad(shade(base, -0.28), shade(base, -0.48), LIP + R));
  g.roundRect(0, U - LIP - R, U, LIP + R, R).stroke({ color: outline, width: 3, alignment: 1 });
  // top face
  g.roundRect(0, 0, U, U - LIP, R).fill(vGrad(shade(base, 0.2), shade(base, -0.06), U - LIP));
  g.roundRect(0, 0, U, U - LIP, R).stroke({ color: outline, width: 3, alignment: 1 });
  // inner top highlight
  g.roundRect(3, 3, U - 6, 14, R - 4).fill({ color: 0xffffff, alpha: 0.16 });
  // candy gloss: curved specular sweep across the upper-left
  g.moveTo(6, 26)
    .quadraticCurveTo(34, 6, U * 0.62, 8)
    .quadraticCurveTo(U * 0.4, 18, 16, 38)
    .closePath()
    .fill({ color: 0xffffff, alpha: 0.10 });
  // soft ambient occlusion near the lip
  g.roundRect(3, U - LIP - 16, U - 6, 13, 8).fill({ color: 0x000000, alpha: 0.10 });
}

/** Soft blob (rounded organic patch). */
function blob(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color, alpha });
}

/* ------------------------------- tiers ------------------------------- */

function paintTier(g: Graphics, tier: Tier): void {
  const base = TIER_FILL[tier];
  blockBase(g, base);
  const H = U - LIP; // top-face height
  if (tier === 1) {
    // VOID: spiral galaxy (per the reference) + cross-sparkle stars
    const cx = 64, cy = 52;
    blob(g, cx, cy, 42, 32, shade(base, -0.2), 0.7);
    blob(g, cx, cy, 30, 22, 0x4a3d80, 0.5);
    // two spiral arms of overlapping soft blobs
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 22; i++) {
        const t = i / 22;
        const ang = arm * Math.PI + t * 3.6;
        const rad = 4 + t * 30;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad * 0.72;
        blob(g, x, y, 5.5 - t * 3, 4.5 - t * 2.6, shade(0x8a6fd8, 0.15 - t * 0.3), 0.4 - t * 0.18);
      }
    }
    blob(g, cx, cy, 6, 5, 0xc9b8f4, 0.85);   // bright core
    blob(g, cx, cy, 2.6, 2.2, 0xfff4ff);
    // cross-sparkle stars
    for (let i = 0; i < 6; i++) {
      const x = 12 + hash(i, 1, 2) * 104, y = 10 + hash(2, i, 3) * (H - 20);
      const s = 1.4 + hash(i, i, 4) * 2;
      g.rect(x - s * 2.2, y - s * 0.45, s * 4.4, s * 0.9).fill({ color: 0xffffff, alpha: 0.8 });
      g.rect(x - s * 0.45, y - s * 2.2, s * 0.9, s * 4.4).fill({ color: 0xffffff, alpha: 0.8 });
      blob(g, x, y, s * 0.8, s * 0.8, 0xffffff);
    }
    // tiny plain stars
    for (let i = 0; i < 8; i++) {
      const x = 10 + hash(i, 7, 8) * 108, y = 8 + hash(8, i, 9) * (H - 16);
      blob(g, x, y, 1.1, 1.1, 0xd8ccff, 0.8);
    }
  } else if (tier === 2) {
    // DEBRIS: soft-shaded rock clusters
    const rocks: Array<[number, number, number, number]> = [
      [34, 40, 20, 15], [86, 30, 17, 13], [62, 76, 23, 16], [100, 78, 13, 10], [20, 84, 11, 9],
    ];
    for (const [x, y, rx, ry] of rocks) {
      blob(g, x, y + ry * 0.45, rx * 1.05, ry * 0.5, 0x000000, 0.25);       // contact shadow
      blob(g, x, y, rx, ry, shade(0x5c6070, -0.15));                          // body
      blob(g, x - rx * 0.25, y - ry * 0.35, rx * 0.6, ry * 0.5, 0x767b8e);   // light plane
      blob(g, x - rx * 0.4, y - ry * 0.5, rx * 0.3, ry * 0.24, 0x8f95aa);    // top glint
    }
    // pebbles + glints
    for (let i = 0; i < 6; i++) {
      const x = 14 + hash(i, 5, 6) * 100, y = 16 + hash(6, i, 7) * (H - 30);
      blob(g, x, y, 3, 2.4, i % 2 ? 0x6a6f82 : 0x9a92d8, 0.8);
    }
  } else if (tier === 3) {
    // PLATFORM: beveled stone bricks
    const mortar = shade(base, -0.4);
    const brickW = 40, brickH = 26;
    for (let row = 0; row < 5; row++) {
      const y0 = 6 + row * brickH;
      if (y0 > H - 8) break;
      const off = row % 2 === 0 ? 0 : -brickW / 2;
      for (let col = -1; col < 4; col++) {
        const x0 = 6 + off + col * (brickW + 3);
        const w = Math.min(brickW, U - 8 - x0);
        if (x0 + 4 > U - 6 || w < 8) continue;
        const bx = Math.max(6, x0);
        const bw = w - (bx - x0);
        const bh = Math.min(brickH - 4, H - 8 - y0);
        if (bh < 8) continue;
        const tone = hash(row, col, 8);
        const bc = tone > 0.66 ? shade(base, 0.1) : tone < 0.3 ? shade(base, -0.12) : base;
        g.roundRect(bx, y0, bw, bh, 5).fill(vGrad(shade(bc, 0.14), shade(bc, -0.1), bh));
        g.roundRect(bx, y0, bw, bh, 5).stroke({ color: mortar, width: 2.5, alignment: 1 });
        g.roundRect(bx + 2, y0 + 2, bw - 4, 4, 3).fill({ color: 0xffffff, alpha: 0.12 });
        // occasional crack
        if (hash(col, row, 9) > 0.75) {
          g.moveTo(bx + bw * 0.6, y0 + 2).lineTo(bx + bw * 0.5, y0 + bh * 0.5)
            .lineTo(bx + bw * 0.58, y0 + bh - 2)
            .stroke({ color: mortar, width: 1.5, alpha: 0.7 });
        }
      }
    }
    // moss tufts
    blob(g, 22, 30, 7, 4, 0x6f9e44, 0.75);
    blob(g, 98, 82, 8, 4.5, 0x6f9e44, 0.7);
    blob(g, 96, 79, 4, 2.5, 0x8fbf5e, 0.8);
  } else if (tier === 4) {
    // BIOSPHERE: lush meadow — soft patches, tufts, flowers
    blob(g, 40, 36, 34, 22, shade(base, 0.16), 0.55);
    blob(g, 92, 74, 30, 20, shade(base, -0.14), 0.5);
    blob(g, 88, 30, 20, 13, shade(base, 0.1), 0.45);
    blob(g, 28, 82, 22, 14, shade(base, -0.1), 0.4);
    // grass tufts: soft three-blade sprigs
    for (let i = 0; i < 7; i++) {
      const x = 16 + hash(i, 3, 10) * 96, y = 22 + hash(4, i, 11) * (H - 36);
      const dark = hash(i, 9, 12) > 0.5;
      const c = dark ? shade(base, -0.26) : shade(base, 0.3);
      g.moveTo(x, y + 6).quadraticCurveTo(x - 3, y - 1, x - 4, y - 5)
        .stroke({ color: c, width: 3, cap: 'round', alpha: 0.9 });
      g.moveTo(x, y + 6).quadraticCurveTo(x, y - 2, x + 0.5, y - 7)
        .stroke({ color: c, width: 3.4, cap: 'round' });
      g.moveTo(x, y + 6).quadraticCurveTo(x + 3, y - 1, x + 4.5, y - 4)
        .stroke({ color: c, width: 3, cap: 'round', alpha: 0.9 });
    }
    // flowers: petals + center + tiny leaf
    const flowers: Array<[number, number, number]> = [[30, 56, 0xf2a0c0], [88, 44, 0xffffff], [60, 88, 0xf2d349]];
    for (const [x, y, col] of flowers) {
      blob(g, x, y + 4, 5, 2, 0x000000, 0.15);
      for (let pIdx = 0; pIdx < 5; pIdx++) {
        const a = (Math.PI * 2 * pIdx) / 5 - Math.PI / 2;
        blob(g, x + Math.cos(a) * 4.4, y + Math.sin(a) * 4.4, 3.4, 3.4, col);
      }
      blob(g, x, y, 2.8, 2.8, col === 0xf2d349 ? 0xc9862e : 0xf2d349);
      blob(g, x + 6, y + 5, 3, 1.6, 0x4a9e3d, 0.9);
    }
  } else {
    // SHELTER PAD (per reference): warm cream base, gold diamond trim, arched door
    const seam = shade(base, -0.22);
    // gold diamond trim band along the top
    for (let i = 0; i < 6; i++) {
      const x0 = 16 + i * 18;
      g.moveTo(x0, 10).lineTo(x0 + 6, 16).lineTo(x0, 22).lineTo(x0 - 6, 16).closePath()
        .fill({ color: i % 2 ? 0xe8c04a : 0xc9a15f, alpha: 0.9 });
    }
    // faint panel seams
    g.moveTo(8, 30).lineTo(U - 8, 30).stroke({ color: seam, width: 2, alpha: 0.6 });
    for (const x of [22, 106]) g.moveTo(x, 32).lineTo(x, H - 6).stroke({ color: seam, width: 1.6, alpha: 0.45 });
    // arched doorway
    const dw = 40, dx = 64 - dw / 2, dy = 46, dh = H - dy - 8;
    g.roundRect(dx - 5, dy - 5, dw + 10, dh + 10, 12).fill({ color: shade(base, -0.12) });
    g.moveTo(dx, dy + dh).lineTo(dx, dy + 14)
      .arc(64, dy + 14, dw / 2, Math.PI, 0)
      .lineTo(dx + dw, dy + dh).closePath()
      .fill(vGrad(0x6a5636, 0x4a3a24, dh));
    g.moveTo(dx, dy + dh).lineTo(dx, dy + 14)
      .arc(64, dy + 14, dw / 2, Math.PI, 0)
      .lineTo(dx + dw, dy + dh)
      .stroke({ color: shade(base, -0.4), width: 3 });
    // door planks + warm light seeping from under
    for (const px of [64 - 7, 64 + 7]) {
      g.moveTo(px, dy + 6).lineTo(px, dy + dh - 2).stroke({ color: 0x3a2d1c, width: 2, alpha: 0.7 });
    }
    blob(g, 64, dy + dh - 1, dw * 0.42, 4, 0xffd28a, 0.55);
    blob(g, 70, dy + dh * 0.55, 3, 3, 0xe8c04a); // handle
    // corner sparkle dots
    for (const [x, y] of [[14, 38], [114, 38], [14, 96], [114, 96]] as Array<[number, number]>) {
      blob(g, x, y, 2.2, 2.2, 0xfff4bb, 0.9);
    }
  }
}

/* --------------------------- structures/actors --------------------------- */

function paintShuttle(g: Graphics): void {
  paintTier(g, 5);
  const outline = 0x35304a;
  // soft contact shadow
  blob(g, 64, 102, 34, 8, 0x000000, 0.3);
  // legs
  g.moveTo(42, 84).lineTo(32, 102).stroke({ color: 0x8a8a9c, width: 5, cap: 'round' });
  g.moveTo(86, 84).lineTo(96, 102).stroke({ color: 0x8a8a9c, width: 5, cap: 'round' });
  blob(g, 31, 103, 6, 3, 0x6f6f80);
  blob(g, 97, 103, 6, 3, 0x6f6f80);
  // fins
  g.moveTo(40, 62).quadraticCurveTo(24, 74, 28, 94).lineTo(44, 86).closePath()
    .fill(vGrad(0xf08a5f, 0xc9502e, 94));
  g.moveTo(88, 62).quadraticCurveTo(104, 74, 100, 94).lineTo(84, 86).closePath()
    .fill(vGrad(0xf08a5f, 0xc9502e, 94));
  // body: rounded rocket
  g.moveTo(64, 8)
    .bezierCurveTo(88, 14, 92, 44, 90, 70)
    .quadraticCurveTo(89, 92, 64, 94)
    .quadraticCurveTo(39, 92, 38, 70)
    .bezierCurveTo(36, 44, 40, 14, 64, 8)
    .fill(vGrad(0xfafafe, 0xd2d3e2, 94));
  g.moveTo(64, 8)
    .bezierCurveTo(88, 14, 92, 44, 90, 70)
    .quadraticCurveTo(89, 92, 64, 94)
    .quadraticCurveTo(39, 92, 38, 70)
    .bezierCurveTo(36, 44, 40, 14, 64, 8)
    .stroke({ color: outline, width: 3 });
  // left sheen
  blob(g, 50, 40, 8, 26, 0xffffff, 0.35);
  // nose cap
  g.moveTo(64, 8).bezierCurveTo(76, 11, 82, 20, 84, 30)
    .quadraticCurveTo(74, 24, 64, 23).quadraticCurveTo(54, 24, 44, 30)
    .bezierCurveTo(46, 20, 52, 11, 64, 8)
    .fill(vGrad(0xf08a5f, 0xd45f38, 30));
  // stripe band
  g.roundRect(40, 64, 48, 11, 5).fill(vGrad(0xf08a5f, 0xd45f38, 11));
  // porthole
  blob(g, 64, 44, 15, 15, 0x9aa0b8);
  blob(g, 64, 44, 12, 12, 0x35507a);
  blob(g, 64, 44, 11, 11, 0x4a7fb8);
  blob(g, 59, 39, 4.5, 3.5, 0xcfe6f8, 0.95);
  // hatch glow
  g.roundRect(56, 80, 16, 10, 4).fill(0xb8bfd0);
  g.roundRect(58, 82, 12, 6, 3).fill({ color: 0xffe066, alpha: 0.95 });
  blob(g, 64, 85, 12, 6, 0xffe066, 0.3);
}

function paintPod(g: Graphics): void {
  paintTier(g, 1);
  blob(g, 64, 104, 28, 7, 0x000000, 0.3);
  // capsule
  g.moveTo(64, 14)
    .bezierCurveTo(90, 18, 94, 52, 90, 76)
    .quadraticCurveTo(86, 100, 64, 102)
    .quadraticCurveTo(42, 100, 38, 76)
    .bezierCurveTo(34, 52, 38, 18, 64, 14)
    .fill(vGrad(0xf4f4fa, 0xc4c5d8, 102));
  g.moveTo(64, 14)
    .bezierCurveTo(90, 18, 94, 52, 90, 76)
    .quadraticCurveTo(86, 100, 64, 102)
    .quadraticCurveTo(42, 100, 38, 76)
    .bezierCurveTo(34, 52, 38, 18, 64, 14)
    .stroke({ color: 0x35304a, width: 3 });
  blob(g, 50, 44, 7, 22, 0xffffff, 0.4);
  // nose stripe
  g.moveTo(64, 14).bezierCurveTo(78, 16, 84, 26, 86, 34)
    .quadraticCurveTo(75, 28, 64, 27).quadraticCurveTo(53, 28, 42, 34)
    .bezierCurveTo(44, 26, 50, 16, 64, 14)
    .fill(vGrad(0xf08a5f, 0xd45f38, 34));
  // big window
  blob(g, 64, 54, 17, 15, 0x9aa0b8);
  blob(g, 64, 54, 14, 12, 0x35507a);
  blob(g, 64, 54, 13, 11, 0x4a7fb8);
  blob(g, 58, 48, 5, 3.6, 0xcfe6f8, 0.95);
  // side thrusters
  g.roundRect(28, 56, 9, 22, 4).fill(vGrad(0xd2d3e2, 0xa8a9c0, 22));
  g.roundRect(91, 56, 9, 22, 4).fill(vGrad(0xd2d3e2, 0xa8a9c0, 22));
  // thruster glow
  blob(g, 64, 100, 10, 4, 0xf2a949, 0.8);
  blob(g, 64, 102, 6, 2.6, 0xffd28a);
}

function paintSurvivor(g: Graphics): void {
  const outline = 0x35304a;
  blob(g, 64, 116, 26, 6, 0x000000, 0.25);
  // legs
  g.roundRect(46, 88, 15, 26, 7).fill(vGrad(0xf4f4fa, 0xc9cade, 26));
  g.roundRect(67, 88, 15, 26, 7).fill(vGrad(0xf4f4fa, 0xc9cade, 26));
  g.roundRect(44, 106, 19, 10, 5).fill(0xb8b9cc);   // boots
  g.roundRect(65, 106, 19, 10, 5).fill(0xb8b9cc);
  // backpack
  g.roundRect(26, 52, 14, 30, 6).fill(vGrad(0xc9cade, 0xa4a5bc, 30));
  g.roundRect(26, 52, 14, 30, 6).stroke({ color: outline, width: 2.5 });
  // torso
  g.roundRect(38, 48, 52, 46, 16).fill(vGrad(0xfafafe, 0xd2d3e2, 46));
  g.roundRect(38, 48, 52, 46, 16).stroke({ color: outline, width: 3 });
  // chest stripe
  g.roundRect(38, 62, 52, 10, 5).fill(vGrad(0xf08a5f, 0xd45f38, 10));
  // chest panel
  g.roundRect(52, 76, 24, 12, 4).fill(0xb8b9cc);
  blob(g, 58, 82, 2.4, 2.4, 0x7fae4a);
  blob(g, 66, 82, 2.4, 2.4, 0xe8c04a);
  // arms
  g.roundRect(30, 52, 12, 30, 6).fill(vGrad(0xf4f4fa, 0xc9cade, 30));
  g.roundRect(86, 52, 12, 30, 6).fill(vGrad(0xf4f4fa, 0xc9cade, 30));
  g.roundRect(30, 76, 12, 8, 4).fill(0xb8b9cc);
  g.roundRect(86, 76, 12, 8, 4).fill(0xb8b9cc);
  // helmet — big and round
  blob(g, 64, 30, 27, 25, 0xfafafe);
  g.ellipse(64, 30, 27, 25).stroke({ color: outline, width: 3 });
  blob(g, 52, 18, 8, 6, 0xffffff, 0.75); // gloss
  // visor
  g.roundRect(46, 20, 38, 22, 11).fill(vGrad(0x5a86c4, 0x2c4468, 22));
  g.roundRect(46, 20, 38, 22, 11).stroke({ color: 0x9aa0b8, width: 2 });
  blob(g, 55, 26, 6, 4, 0xcfe6f8, 0.9);
  blob(g, 62, 24, 2.6, 2, 0xffffff, 0.85);
}

function paintBubble(g: Graphics, kind: 'rescue' | 'shelter'): void {
  // soft white bubble with tail
  g.roundRect(14, 4, 100, 68, 22).fill(vGrad(0xffffff, 0xeceef8, 68));
  g.roundRect(14, 4, 100, 68, 22).stroke({ color: 0xaab0cc, width: 3.5 });
  g.moveTo(56, 70).lineTo(64, 86).lineTo(74, 70).closePath().fill(0xeceef8);
  g.moveTo(56, 71).lineTo(64, 86).lineTo(74, 71).stroke({ color: 0xaab0cc, width: 3 });
  if (kind === 'rescue') {
    // oxygen tank — reads as "running low on air" (tinted red when urgent)
    const cx = 64;
    g.roundRect(cx - 15, 22, 30, 40, 13).fill(vGrad(0x9fe8de, 0x3aa99e, 40));
    g.roundRect(cx - 15, 22, 30, 40, 13).stroke({ color: 0x246f66, width: 3 });
    // valve + cap
    g.roundRect(cx - 7, 12, 14, 12, 4).fill(0xd6dbe6);
    g.roundRect(cx - 7, 12, 14, 12, 4).stroke({ color: 0x8a90a8, width: 2.5 });
    g.rect(cx - 3, 7, 6, 7).fill(0x9aa0b6);
    // pressure gauge with a low-pointing needle
    g.circle(cx + 7, 33, 5.5).fill(0xffffff);
    g.circle(cx + 7, 33, 5.5).stroke({ color: 0x246f66, width: 2 });
    g.moveTo(cx + 7, 33).lineTo(cx + 9.6, 30).stroke({ color: 0xe05555, width: 1.6, cap: 'round' });
    // label band + highlight
    g.roundRect(cx - 11, 44, 22, 12, 3).fill({ color: 0xffffff, alpha: 0.9 });
    blob(g, cx - 7, 30, 3.2, 9, 0xffffff, 0.55);
  } else {
    // mini shuttle
    g.moveTo(64, 12).bezierCurveTo(78, 16, 80, 34, 78, 46)
      .quadraticCurveTo(76, 58, 64, 60).quadraticCurveTo(52, 58, 50, 46)
      .bezierCurveTo(48, 34, 50, 16, 64, 12).fill(0xd9dae6);
    g.moveTo(58, 44).lineTo(48, 58).lineTo(58, 54).closePath().fill(0xe0704a);
    g.moveTo(70, 44).lineTo(80, 58).lineTo(70, 54).closePath().fill(0xe0704a);
    blob(g, 64, 32, 7, 7, 0x4a7fb8);
    blob(g, 61, 29, 2.6, 2, 0xcfe6f8);
    g.roundRect(58, 58, 12, 5, 2.5).fill(0xf2a949);
  }
}

function paintCrystal(g: Graphics): void {
  const glow = 0x5fd4c8;
  blob(g, 64, 66, 44, 44, glow, 0.12);
  blob(g, 64, 66, 30, 32, glow, 0.10);
  // gem silhouette
  const pts: Array<[number, number]> = [[64, 12], [98, 44], [86, 104], [42, 104], [30, 44]];
  g.poly(pts.flat()).fill(vGrad(0x7fe8dc, 0x2f9a8e, 116));
  g.poly(pts.flat()).stroke({ color: 0x1f6b62, width: 3.5 });
  // facets
  g.moveTo(64, 12).lineTo(64, 104).stroke({ color: 0x2f9a8e, width: 2, alpha: 0.7 });
  g.moveTo(30, 44).lineTo(64, 58).lineTo(98, 44).stroke({ color: 0x2f9a8e, width: 2, alpha: 0.7 });
  g.moveTo(64, 12).lineTo(48, 46).lineTo(42, 102).stroke({ color: 0xa8f0e8, width: 2, alpha: 0.5 });
  // sparkle
  blob(g, 48, 34, 6, 10, 0xffffff, 0.65);
  blob(g, 44, 30, 2.6, 2.6, 0xffffff, 0.95);
}

function paintIconDemo(g: Graphics): void {
  blob(g, 64, 118, 30, 6, 0x000000, 0.25);
  blob(g, 64, 76, 38, 38, 0x454a5e);
  g.circle(64, 76, 38).stroke({ color: 0x2c2f3d, width: 3.5 });
  blob(g, 50, 60, 12, 9, 0x6a7086, 0.9);
  blob(g, 46, 56, 5, 4, 0x8a90a8, 0.9);
  // cap + fuse
  g.roundRect(52, 30, 24, 14, 5).fill(vGrad(0xa87548, 0x7d5433, 14));
  g.moveTo(64, 30).quadraticCurveTo(72, 18, 84, 16).stroke({ color: 0xc9a15f, width: 4, cap: 'round' });
  // spark
  blob(g, 88, 14, 9, 9, 0xffe066, 0.4);
  blob(g, 88, 14, 4.4, 4.4, 0xfff4bb);
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5;
    blob(g, 88 + Math.cos(a) * 9, 14 + Math.sin(a) * 9, 1.8, 1.8, 0xf2a949);
  }
}

function paintIconWormhole(g: Graphics): void {
  blob(g, 64, 64, 52, 52, 0x8a5fd4, 0.15);
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const ang = t * Math.PI * 3.6;
    const rad = 6 + t * 44;
    const x = 64 + Math.cos(ang) * rad;
    const y = 64 + Math.sin(ang) * rad * 0.9;
    blob(g, x, y, 9 - t * 6, 8 - t * 5.4, shade(0x8a5fd4, 0.35 - t * 0.55), 0.85 - t * 0.4);
  }
  blob(g, 64, 64, 9, 8, 0x120a24);
  blob(g, 61, 61, 2.6, 2.2, 0xd8ccff, 0.8);
}

function paintIconTractor(g: Graphics): void {
  // beam
  g.moveTo(52, 34).lineTo(24, 116).lineTo(104, 116).lineTo(76, 34).closePath()
    .fill(vGrad(0xffe066, 0xffe066, 116));
  g.moveTo(52, 34).lineTo(24, 116).lineTo(104, 116).lineTo(76, 34).closePath()
    .fill({ color: 0x0b0e1d, alpha: 0 }); // keep path; gradient alpha below
  blob(g, 64, 100, 34, 14, 0xffe066, 0.25);
  // saucer
  blob(g, 64, 30, 34, 12, 0xd2d3e2);
  g.ellipse(64, 30, 34, 12).stroke({ color: 0x35304a, width: 3 });
  blob(g, 64, 20, 15, 10, 0xeceef8);
  blob(g, 64, 19, 8, 5, 0x4a7fb8);
  blob(g, 61, 17, 2.6, 1.8, 0xcfe6f8);
  // little astronaut in the beam
  blob(g, 64, 88, 8, 9, 0xf4f4fa);
  blob(g, 64, 80, 6, 5.5, 0xfafafe);
  blob(g, 64, 80, 4, 3, 0x4a7fb8);
}

/* ------------------------------ assembly ------------------------------ */

export function buildTextures(app: Application, tileSize: number): TextureSet {
  const paint = (fn: (g: Graphics) => void): Texture => {
    const g = new Graphics();
    fn(g);
    const c = new Container();
    c.addChild(g);
    c.scale.set(tileSize / U);
    return app.renderer.generateTexture({ target: c, resolution: 1 });
  };
  const tile = {} as Record<Tier, Texture>;
  ([1, 2, 3, 4, 5] as Tier[]).forEach((t) => { tile[t] = paint((g) => paintTier(g, t)); });
  return {
    tile,
    pod: paint(paintPod),
    dome: paint(paintShuttle),
    survivor: paint(paintSurvivor),
    bubbleRescue: paint((g) => paintBubble(g, 'rescue')),
    bubbleShelter: paint((g) => paintBubble(g, 'shelter')),
    crystal: paint(paintCrystal),
    iconDemo: paint(paintIconDemo),
    iconWormhole: paint(paintIconWormhole),
    iconTractor: paint(paintIconTractor),
    station: { modules: {}, vips: {} },
  };
}

/**
 * Map of generated-art files (in public/art) to the TextureSet slot they fill.
 * Any missing file simply keeps the procedural fallback, so the game always
 * renders even before art is generated.
 */
const IMAGE_ASSETS: Array<{ file: string; apply: (set: TextureSet, tex: Texture) => void }> = [
  { file: 'tile-1-void', apply: (s, t) => { s.tile[1] = t; } },
  { file: 'tile-2-debris', apply: (s, t) => { s.tile[2] = t; } },
  { file: 'tile-3-platform', apply: (s, t) => { s.tile[3] = t; } },
  { file: 'tile-4-biosphere', apply: (s, t) => { s.tile[4] = t; } },
  { file: 'tile-5-pad', apply: (s, t) => { s.tile[5] = t; } },
  { file: 'home', apply: (s, t) => { s.dome = t; } }, // rescue destination = a HOME, not a rocket
  { file: 'rescue-shuttle', apply: (s, t) => { s.pod = t; } },
  { file: 'astronaut', apply: (s, t) => { s.survivor = t; } },
  { file: 'canister', apply: (s, t) => { s.canisterOverlay = t; } },
  { file: 'canister-cracked', apply: (s, t) => { s.canisterCracked = t; } },
  { file: 'canister-crumbling', apply: (s, t) => { s.canisterCrumbling = t; } },
  { file: 'crystal', apply: (s, t) => { s.crystalOverlay = t; } },
  { file: 'reactor', apply: (s, t) => { s.reactorOverlay = t; } },
  { file: 'comet', apply: (s, t) => { s.cometOverlay = t; } },
  { file: 'rover', apply: (s, t) => { s.roverOverlay = t; } },
  { file: 'icon-station', apply: (s, t) => { s.iconStation = t; } },
  { file: 'icon-store', apply: (s, t) => { s.iconStore = t; } },
  { file: 'paw-print', apply: (s, t) => { s.pawPrint = t; } },
  { file: 'pepper', apply: (s, t) => { s.pepper = t; } },
  { file: 'commander', apply: (s, t) => { s.commander = t; } },
  { file: 'station-interior', apply: (s, t) => { s.stationInterior = t; } },
];

/**
 * Build the procedural set, then overlay any generated PNGs that exist.
 * Returns the merged set. Image loads that fail (missing file) are ignored.
 */
export async function loadTextures(app: Application, tileSize: number, campaign=false): Promise<TextureSet> {
  // WKWebView serves bundled files through capacitor://. The worker bitmap
  // capability probe can stall on that scheme before any board/UI appears.
  // Native image elements decode the same local artwork without that probe.
  if(Capacitor.isNativePlatform())Assets.setPreferences({preferWorkers:false,preferCreateImageBitmap:false});
  const set = buildTextures(app, tileSize);
  set.campaign={};
  if(campaign)await Promise.all(CAMPAIGN_ASSETS.map(async asset=>{set.campaign![asset.id]=await Assets.load<Texture>(asset.deliveryPath);}));
  await Promise.all(IMAGE_ASSETS.map(async ({ file, apply }) => {
    try {
      const tex = await Assets.load<Texture>(`optimized/${file}.webp`);
      if (tex) apply(set, tex);
    } catch {
      /* keep procedural fallback */
    }
  }));
  // station art (core hub + module pods + VIP crew), keyed by roster id
  const loadInto = async (file: string, put: (t: Texture) => void) => {
    try { const t = await Assets.load<Texture>(`optimized/${file}.webp`); if (t) put(t); } catch { /* optional */ }
  };
  await Promise.all([
    loadInto('station-core', (t) => { set.station.core = t; }),
    ...STATIONS.flatMap((st) => st.modules).map((m) => loadInto(`module-${m.id}`, (t) => { set.station.modules[m.id] = t; })),
    ...STATIONS.flatMap((st) => st.vips).map((v) => loadInto(`vip-${v.id}`, (t) => { set.station.vips[v.id] = t; })),
  ]);
  return set;
}
