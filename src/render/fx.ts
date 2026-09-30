import { Container, Graphics } from 'pixi.js';
import { outQuad, tween } from './tween';

/** Quick white flash disc that expands and fades. */
export function flash(layer: Container, x: number, y: number, size: number, strength = 1): void {
  const g = new Graphics().circle(0, 0, size * 0.5).fill({ color: 0xffffff, alpha: 0.85 * strength });
  g.x = x; g.y = y;
  g.scale.set(0.4);
  layer.addChild(g);
  void tween(g.scale, { x: 1.4, y: 1.4 }, 200).then(() => g.destroy());
  void tween(g, { alpha: 0 }, 200);
}

/** Expanding tier-colored ring. */
export function glowRing(layer: Container, x: number, y: number, size: number, color: number): void {
  const g = new Graphics().circle(0, 0, size * 0.5)
    .stroke({ color, width: Math.max(2, size * 0.06), alpha: 0.9 });
  g.x = x; g.y = y;
  g.scale.set(0.5);
  layer.addChild(g);
  void tween(g.scale, { x: 1.6, y: 1.6 }, 320).then(() => g.destroy());
  void tween(g, { alpha: 0 }, 320);
}

/** Radial particle burst. */
export function burst(layer: Container, x: number, y: number, size: number, color: number, count = 12): void {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = size * (0.6 + Math.random() * 0.7);
    const p = new Graphics().circle(0, 0, size * (0.04 + Math.random() * 0.04)).fill(color);
    p.x = x; p.y = y;
    layer.addChild(p);
    void tween(p, { x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist, alpha: 0 }, 380, outQuad)
      .then(() => p.destroy());
  }
}

/** Soft ripple ellipse for splashes. */
export function ripple(layer: Container, x: number, y: number, size: number): void {
  const g = new Graphics().ellipse(0, 0, size * 0.35, size * 0.14)
    .stroke({ color: 0xffffff, width: Math.max(1.5, size * 0.03), alpha: 0.7 });
  g.x = x; g.y = y;
  g.scale.set(0.5);
  layer.addChild(g);
  void tween(g.scale, { x: 1.5, y: 1.5 }, 400).then(() => g.destroy());
  void tween(g, { alpha: 0 }, 400);
}
