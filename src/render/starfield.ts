import { Application, Container, Graphics } from 'pixi.js';

type Star = { g: Graphics; base: number; period: number; phase: number };

export function addStarfield(app: Application, layer: Container): void {
  const stars: Star[] = [];
  const w = app.screen.width, h = app.screen.height;
  for (let i = 0; i < 120; i++) {
    const band = i % 3; // 3 parallax/brightness bands
    const radius = 0.5 + Math.random() * (band === 2 ? 1.0 : 0.6);
    const base = 0.2 + Math.random() * 0.6;
    const g = new Graphics().circle(0, 0, radius).fill({ color: 0xffffff, alpha: 1 });
    g.x = Math.random() * w;
    g.y = Math.random() * h;
    g.alpha = base;
    layer.addChild(g);
    stars.push({ g, base, period: 3 + Math.random() * 4, phase: Math.random() * Math.PI * 2 });
  }
  let t = 0;
  app.ticker.add((ticker) => {
    t += ticker.deltaMS / 1000;
    for (const s of stars) {
      s.g.alpha = s.base * (0.7 + 0.3 * Math.sin((t / s.period) * Math.PI * 2 + s.phase));
    }
  });
}
