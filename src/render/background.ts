import { Application, Container, FillGradient, Graphics } from 'pixi.js';
import type { Layout } from './layout';

/**
 * Living scenic backdrop (what top casual games do instead of flat color):
 * deep-space gradient with a warm horizon glow, soft nebula clouds, a ringed
 * planet, three parallax star layers, drifting sparkle motes, the occasional
 * shooting star — and a vignette that focuses light on the play area.
 */
export function addBackground(app: Application, layer: Container, reducedMotion:()=>boolean=()=>false): void {
  const W = app.screen.width, H = app.screen.height;

  // sky: indigo -> deep violet -> teal-glow horizon
  const sky = new Graphics();
  sky.rect(0, 0, W, H).fill(new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: 0x0d1030 },
      { offset: 0.45, color: 0x1b1440 },
      { offset: 0.8, color: 0x2a1a55 },
      { offset: 1, color: 0x143a4e },
    ],
    textureSpace: 'local',
  }));
  layer.addChild(sky);

  // aurora glow band near the bottom (warm light source)
  const glow = new Graphics();
  glow.ellipse(W * 0.5, H * 1.04, W * 0.85, H * 0.22).fill({ color: 0x3fd4c0, alpha: 0.16 });
  glow.ellipse(W * 0.5, H * 1.06, W * 0.6, H * 0.16).fill({ color: 0x6fe8d8, alpha: 0.12 });
  layer.addChild(glow);

  // nebula clouds (stacked layers so rims stay soft)
  const nebula = new Graphics();
  const puff = (x: number, y: number, rx: number, ry: number, color: number, a: number) => {
    for (let i = 8; i >= 2; i--) {
      const f = i / 8;
      nebula.ellipse(x, y, rx * f, ry * f).fill({ color, alpha: a * 0.14 });
    }
  };
  puff(W * 0.18, H * 0.2, W * 0.35, H * 0.09, 0x6a4ab8, 0.16);
  puff(W * 0.85, H * 0.32, W * 0.3, H * 0.08, 0x9a5fc4, 0.12);
  puff(W * 0.3, H * 0.7, W * 0.4, H * 0.1, 0x4a5fd4, 0.10);
  puff(W * 0.75, H * 0.85, W * 0.35, H * 0.09, 0x5fb8d4, 0.10);
  layer.addChild(nebula);

  // layered clouds (soft purple banks, like the reference's sky)
  const clouds = new Graphics();
  const cloudBank = (cy: number, color: number, alpha: number, scale: number) => {
    for (let i = 0; i < 6; i++) {
      const x = (i / 5) * W + (i % 2 ? 20 : -14);
      clouds.ellipse(x, cy + (i % 3) * 8 * scale, (52 + (i % 3) * 22) * scale, (16 + (i % 2) * 7) * scale)
        .fill({ color, alpha });
    }
  };
  cloudBank(H * 0.3, 0x4a3a7a, 0.14, 1);
  cloudBank(H * 0.12, 0x5a4a92, 0.10, 0.75);
  cloudBank(H * 0.8, 0x6a4a9a, 0.14, 1.1);
  layer.addChild(clouds);

  // small distant moon
  const moon = new Graphics();
  moon.circle(W * 0.42, H * 0.09, W * 0.022).fill(0x3a3555);
  moon.circle(W * 0.415, H * 0.088, W * 0.007).fill({ color: 0x2a2540, alpha: 0.9 });
  moon.circle(W * 0.427, H * 0.094, W * 0.005).fill({ color: 0x2a2540, alpha: 0.9 });
  layer.addChild(moon);

  // ringed planet, top-right
  const planet = new Container();
  const pg = new Graphics();
  const pr = W * 0.09;
  pg.circle(0, 0, pr).fill(new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
    colorStops: [
      { offset: 0, color: 0xf2b06a },
      { offset: 0.55, color: 0xd4784a },
      { offset: 1, color: 0x8a4238 },
    ],
    textureSpace: 'local',
  }));
  // surface bands
  pg.ellipse(0, -pr * 0.35, pr * 0.9, pr * 0.14).fill({ color: 0xf7cf9a, alpha: 0.35 });
  pg.ellipse(0, pr * 0.15, pr * 0.97, pr * 0.12).fill({ color: 0xb85c40, alpha: 0.4 });
  pg.ellipse(0, pr * 0.5, pr * 0.85, pr * 0.1).fill({ color: 0x9a4a38, alpha: 0.4 });
  // ring
  pg.ellipse(0, pr * 0.1, pr * 1.7, pr * 0.42)
    .stroke({ color: 0xe8d8b0, width: pr * 0.16, alpha: 0.5 });
  pg.ellipse(0, pr * 0.1, pr * 1.7, pr * 0.42)
    .stroke({ color: 0xfff2cc, width: pr * 0.05, alpha: 0.7 });
  // soft halo
  pg.circle(0, 0, pr * 1.15).fill({ color: 0xf2b06a, alpha: 0.08 });
  planet.addChild(pg);
  planet.x = W * 0.84; planet.y = H * 0.115;
  layer.addChild(planet);

  // three parallax star layers
  type Star = { g: Graphics; base: number; period: number; phase: number; vx: number };
  const stars: Star[] = [];
  for (let band = 0; band < 3; band++) {
    for (let i = 0; i < 34; i++) {
      const r = band === 2 ? 1.6 : band === 1 ? 1.1 : 0.7;
      const base = 0.25 + Math.random() * 0.6;
      const g = new Graphics();
      if (band === 2 && i % 6 === 0) {
        // a few "plus" sparkle stars
        g.rect(-r * 2.2, -r * 0.5, r * 4.4, r).fill(0xffffff);
        g.rect(-r * 0.5, -r * 2.2, r, r * 4.4).fill(0xffffff);
      } else {
        g.circle(0, 0, r).fill(0xffffff);
      }
      g.x = Math.random() * W;
      g.y = Math.random() * H;
      g.alpha = base;
      layer.addChild(g);
      stars.push({ g, base, period: 2.5 + Math.random() * 5, phase: Math.random() * 6.28, vx: (band + 1) * 0.012 });
    }
  }

  // drifting sparkle motes (rise slowly, like dust in light)
  type Mote = { g: Graphics; vy: number; vx: number; life: number };
  const motes: Mote[] = [];
  for (let i = 0; i < 14; i++) {
    const g = new Graphics();
    const r = 1 + Math.random() * 2;
    g.circle(0, 0, r).fill({ color: 0xaef0e8, alpha: 0.5 });
    g.circle(0, 0, r * 2.4).fill({ color: 0xaef0e8, alpha: 0.12 });
    g.x = Math.random() * W;
    g.y = Math.random() * H;
    layer.addChild(g);
    motes.push({ g, vy: 0.1 + Math.random() * 0.22, vx: (Math.random() - 0.5) * 0.08, life: Math.random() });
  }

  // ---- foreground colony scene along the bottom (the reference's signature) ----
  const scene = new Graphics();
  const groundY = H * 0.955;
  // sunset lake strip + distant hills
  scene.rect(0, H * 0.9, W, H * 0.1).fill(new FillGradient({
    type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: 0x8a5a8c },
      { offset: 0.45, color: 0x5a3a6e },
      { offset: 1, color: 0x2a1a44 },
    ],
    textureSpace: 'local',
  }));
  scene.ellipse(W * 0.5, H * 0.905, W * 0.34, H * 0.012).fill({ color: 0xf2b06a, alpha: 0.35 }); // lake glint
  scene.ellipse(W * 0.18, H * 0.9, W * 0.2, H * 0.028).fill({ color: 0x3a2a58, alpha: 0.9 });    // hills
  scene.ellipse(W * 0.85, H * 0.895, W * 0.22, H * 0.033).fill({ color: 0x342450, alpha: 0.9 });
  // distant domes on the horizon (moveTo first — bare arc() leaks a path line)
  scene.moveTo(W * 0.62 - W * 0.035, H * 0.91)
    .arc(W * 0.62, H * 0.91, W * 0.035, Math.PI, 0).closePath().fill({ color: 0x4a3a68 });
  scene.moveTo(W * 0.68 - W * 0.02, H * 0.912)
    .arc(W * 0.68, H * 0.912, W * 0.02, Math.PI, 0).closePath().fill({ color: 0x42325e });
  scene.circle(W * 0.62, H * 0.895, 1.6).fill(0xffd28a);
  // observatory dome, bottom-left
  const dx = W * 0.09;
  scene.ellipse(dx, groundY, W * 0.14, W * 0.02).fill({ color: 0x1a1230, alpha: 0.8 }); // base shadow
  scene.moveTo(dx - W * 0.13, groundY)
    .arc(dx, groundY, W * 0.13, Math.PI, 0).closePath().fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
      colorStops: [{ offset: 0, color: 0x5a4a86 }, { offset: 1, color: 0x342a54 }],
      textureSpace: 'local',
    }));
  // dome rim highlight
  const rimR = W * 0.115, a0 = Math.PI * 1.15;
  scene.moveTo(dx + Math.cos(a0) * rimR, groundY + Math.sin(a0) * rimR)
    .arc(dx, groundY, rimR, a0, Math.PI * 1.5)
    .stroke({ color: 0x8a7ae0, width: 3, alpha: 0.35, cap: 'round' });
  // glowing arched door + windows
  scene.moveTo(dx - W * 0.02, groundY).lineTo(dx - W * 0.02, groundY - W * 0.038)
    .arc(dx, groundY - W * 0.038, W * 0.02, Math.PI, 0)
    .lineTo(dx + W * 0.02, groundY).closePath().fill(0xffca6a);
  scene.circle(dx, groundY - W * 0.038, W * 0.026).fill({ color: 0xffca6a, alpha: 0.18 });
  scene.roundRect(dx - W * 0.085, groundY - W * 0.05, W * 0.022, W * 0.016, 3).fill({ color: 0x8ad4f0, alpha: 0.9 });
  scene.roundRect(dx + W * 0.062, groundY - W * 0.05, W * 0.022, W * 0.016, 3).fill({ color: 0x8ad4f0, alpha: 0.9 });
  // lamp post, bottom-right
  const lx = W * 0.9;
  scene.rect(lx - 2.5, groundY - W * 0.12, 5, W * 0.12).fill(0x2a2044);
  scene.roundRect(lx - W * 0.02, groundY - W * 0.145, W * 0.04, W * 0.032, 6).fill(0x2a2044);
  scene.roundRect(lx - W * 0.013, groundY - W * 0.138, W * 0.026, W * 0.02, 4).fill(0xffca6a);
  scene.circle(lx, groundY - W * 0.128, W * 0.035).fill({ color: 0xffca6a, alpha: 0.16 });
  // plants + flowers along the ground
  for (let i = 0; i < 7; i++) {
    const px = W * (0.22 + i * 0.1) + (i % 2 ? 8 : -6);
    const s = 6 + (i % 3) * 3;
    scene.ellipse(px, groundY - s * 0.4, s, s * 0.8).fill({ color: i % 2 ? 0x2f5a3a : 0x3a6e46, alpha: 0.95 });
    if (i % 2 === 0) scene.circle(px + s * 0.3, groundY - s, 2.2).fill(0xe88bb1);
    else scene.circle(px - s * 0.3, groundY - s * 0.9, 2).fill(0xf2d349);
  }
  // ground strip
  scene.rect(0, groundY, W, H - groundY).fill(0x241a40);
  scene.rect(0, groundY, W, 3).fill({ color: 0x8a7ae0, alpha: 0.25 });
  layer.addChild(scene);

  // shooting star (fires every ~9s)
  const shooter = new Graphics();
  shooter.moveTo(0, 0).lineTo(-46, 10).stroke({ color: 0xffffff, width: 2, alpha: 0.8, cap: 'round' });
  shooter.circle(0, 0, 2).fill(0xffffff);
  shooter.visible = false;
  layer.addChild(shooter);
  let shootT = 4;

  let t = 0;
  app.ticker.add((tk) => {
    if(reducedMotion())return;
    const dt = tk.deltaMS / 1000;
    t += dt;
    for (const s of stars) {
      s.g.alpha = s.base * (0.7 + 0.3 * Math.sin((t / s.period) * 6.28 + s.phase));
      s.g.x += s.vx * tk.deltaMS / 16;
      if (s.g.x > W + 4) s.g.x = -4;
    }
    for (const m of motes) {
      m.g.y -= m.vy * tk.deltaMS / 16;
      m.g.x += m.vx * tk.deltaMS / 16;
      m.life += dt * 0.3;
      m.g.alpha = 0.35 + 0.3 * Math.sin(m.life * 6.28);
      if (m.g.y < -6) { m.g.y = H + 6; m.g.x = Math.random() * W; }
    }
    planet.y = H * 0.115 + Math.sin(t * 0.4) * 4; // gentle planet bob
    shootT -= dt;
    if (shootT <= 0) {
      shooter.visible = true;
      shooter.x = W * (0.2 + Math.random() * 0.6);
      shooter.y = H * (0.06 + Math.random() * 0.15);
      shootT = 7 + Math.random() * 6;
    }
    if (shooter.visible) {
      shooter.x += 5.5 * tk.deltaMS / 16;
      shooter.y -= 1.2 * tk.deltaMS / 16;
      shooter.alpha = Math.max(0, shooter.alpha - dt * 1.6);
      if (shooter.alpha <= 0) { shooter.visible = false; shooter.alpha = 0.9; }
    }
  });
}

/** Framed tray behind the board — makes the grid feel designed, not floating. */
export function addBoardTray(
  layer: Container,
  x: number, y: number, w: number, h: number, radius: number,
): void {
  const tray = new Graphics();
  // outer glow
  tray.roundRect(x - 14, y - 14, w + 28, h + 28, radius + 14)
    .fill({ color: 0x8a7ae0, alpha: 0.10 });
  // drop shadow
  tray.roundRect(x - 6, y + 2, w + 12, h + 12, radius + 8)
    .fill({ color: 0x05060f, alpha: 0.45 });
  // panel (translucent so the scene glows through)
  tray.roundRect(x - 10, y - 10, w + 20, h + 20, radius + 10)
    .fill({ color: 0x191538, alpha: 0.62 });
  tray.roundRect(x - 10, y - 10, w + 20, h + 20, radius + 10)
    .stroke({ color: 0x8a7ae0, width: 2.5, alpha: 0.55 });
  // inner top light
  tray.roundRect(x - 6, y - 6, w + 12, 10, radius)
    .fill({ color: 0xffffff, alpha: 0.06 });
  layer.addChild(tray);
}

/**
 * Recessed backing behind each in-mask cell plus a soft outer frame. Holes
 * (out-of-mask cells) get no backing, so they read as open space. Redrawn per
 * level because board size varies. `container` is cleared first.
 */
export function drawBoardFrame(container: Container, mask: boolean[][], layout: Layout): void {
  for(const child of container.removeChildren())child.destroy();
  const { tileSize, gap, originX, originY } = layout;
  const rows = mask.length, cols = mask[0]?.length ?? 0;
  const radius = tileSize * 0.18;
  const w = cols * tileSize + (cols - 1) * gap;
  const h = rows * tileSize + (rows - 1) * gap;
  const g = new Graphics();
  g.roundRect(originX - 10, originY - 10, w + 20, h + 20, radius + 10).fill({ color: 0x191538, alpha: 0.5 });
  g.roundRect(originX - 10, originY - 10, w + 20, h + 20, radius + 10).stroke({ color: 0x8a7ae0, width: 2, alpha: 0.45 });
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!mask[r]![c]) continue;
      const x = originX + c * (tileSize + gap), y = originY + r * (tileSize + gap);
      g.roundRect(x, y, tileSize, tileSize, radius).fill({ color: 0x05060f, alpha: 0.35 });
      g.roundRect(x + 2, y + 2, tileSize - 4, tileSize - 4, radius * 0.85).stroke({ color: 0x8a7ae0, width: 1, alpha: 0.14 });
    }
  container.addChild(g);
}

/** Corner vignette focusing light on the play area (soft stacked shadows). */
export function addVignette(app: Application, layer: Container): void {
  const W = app.screen.width, H = app.screen.height;
  const v = new Graphics();
  const r = Math.max(W, H) * 0.42;
  for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]] as Array<[number, number]>) {
    v.ellipse(cx, cy, r, r).fill({ color: 0x05060f, alpha: 0.05 });
    v.ellipse(cx, cy, r * 0.72, r * 0.72).fill({ color: 0x05060f, alpha: 0.06 });
    v.ellipse(cx, cy, r * 0.45, r * 0.45).fill({ color: 0x05060f, alpha: 0.07 });
  }
  layer.addChild(v);
}
