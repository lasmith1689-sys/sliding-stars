import { Application, Container, FillGradient, Graphics, Sprite, Text } from 'pixi.js';
import type { Layers } from './app';
import type { TextureSet } from './textures';
import { stationDef } from '../meta/roster';
import { buildableModules, buildCost, canExpand, residentsOf, type StationState } from '../meta/station';
import { outBack, outQuad, tween } from './tween';

/**
 * The ship interior / station screen. Commander Zena and Pepper are always
 * present. In expansion mode Pepper scampers up beside Zena and asks what to
 * build; the promise resolves with the chosen module id (the caller docks it).
 * In view/intro mode it resolves null on dismiss.
 */
export function showStation(
  app: Application, layers: Layers, textures: TextureSet, station: StationState,
  opts: { expansion?: boolean; intro?: boolean; reducedMotion?: boolean } = {},
): Promise<string | null> {
  const W = app.screen.width, H = app.screen.height;
  const animate:typeof tween = (target,to,ms,ease) => opts.reducedMotion ? (Object.assign(target,to),Promise.resolve()) : tween(target,to,ms,ease);
  const def = stationDef(station.currentStation);
  const root = new Container();
  layers.hud.addChild(root);
  const fit = () => {
    const scale = Math.min(app.screen.width / W, app.screen.height / H);
    root.scale.set(scale);root.x = (app.screen.width - W * scale) / 2;root.y = (app.screen.height - H * scale) / 2;
  };
  app.renderer.on('resize', fit);

  // interior backdrop (optional art) over a soft gradient; the backdrop is
  // interactive so taps never bleed through to the board/HUD underneath
  const backdrop = new Graphics().rect(0, 0, W, H).fill(new FillGradient({
    type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
    colorStops: [{ offset: 0, color: 0x1a1c40 }, { offset: 1, color: 0x0a0c1e }], textureSpace: 'local',
  }));
  backdrop.eventMode = 'static';
  root.addChild(backdrop);
  if (textures.stationInterior) {
    const bg = new Sprite(textures.stationInterior);
    bg.anchor.set(0.5, 1); bg.width = W; bg.height = W * (textures.stationInterior.height / textures.stationInterior.width);
    bg.x = W / 2; bg.y = H; bg.alpha = 0.9; root.addChild(bg);
  }

  // header: station name + lifetime score + fleet size
  const title = new Text({
    text: opts.expansion ? 'Your station grew!' : def.name,
    style: { fill: 0xffe066, fontSize: W * 0.065, fontWeight: '900', fontFamily: 'system-ui, sans-serif' },
  });
  title.anchor.set(0.5); title.x = W / 2; title.y = H * 0.06; root.addChild(title);
  const sub = new Text({
    text: `★ ${station.totalRescued} crew home  ·  ${station.stationsCompleted} station${station.stationsCompleted === 1 ? '' : 's'} built`,
    style: { fill: 0xcfc8ff, fontSize: W * 0.036, fontWeight: '600', fontFamily: 'system-ui, sans-serif' },
  });
  sub.anchor.set(0.5); sub.x = W / 2; sub.y = H * 0.11; root.addChild(sub);

  // In look-around modes the screen says what to do next, so it never feels dead
  if (!opts.expansion) {
    const unbuilt = buildableModules(station);
    const hintText = canExpand(station)
      ? 'A new module is ready — let’s build it!'
      : unbuilt.length > 0
        ? `Rescue ${Math.max(0,buildCost(station) - station.stationRescued)} more crew to add the next module!`
        : 'Rescue ⭐ VIP crew to unlock new modules!';
    const hint = new Text({
      text: hintText,
      style: { fill: canExpand(station) ? 0xffe066 : 0x9fdc8a, fontSize: W * 0.036, fontWeight: '700', align: 'center', wordWrap: true, wordWrapWidth: W * 0.86, fontFamily: 'system-ui, sans-serif' },
    });
    hint.anchor.set(0.5, 0); hint.x = W / 2; hint.y = H * 0.145; root.addChild(hint);
  }

  // In view/intro modes, show the core hub + docked-module ring with resident faces.
  if (!opts.expansion) {
    if (textures.station.core) {
      const core = new Sprite(textures.station.core); core.anchor.set(0.5);
      core.width = core.height = W * 0.26; core.x = W / 2; core.y = H * 0.34; root.addChild(core);
    }
    const ring = W * 0.32;
    station.builtModules.forEach((id, i) => {
      const tex = textures.station.modules[id]; if (!tex) return;
      const ang = -Math.PI / 2 + (i / Math.max(1, station.builtModules.length)) * Math.PI * 2;
      const sp = new Sprite(tex); sp.anchor.set(0.5);
      sp.width = sp.height = W * 0.16;
      sp.x = W / 2 + Math.cos(ang) * ring; sp.y = H * 0.34 + Math.sin(ang) * ring * 0.7;
      root.addChild(sp);
      residentsOf(station, id).slice(0, 4).forEach((vid, j) => {
        const vt = textures.station.vips[vid]; if (!vt) return;
        const face = new Sprite(vt); face.anchor.set(0.5);
        face.width = face.height = W * 0.055;
        face.x = sp.x + (j - 1.5) * W * 0.05; face.y = sp.y + W * 0.1;
        root.addChild(face);
      });
    });
  }

  // Commander Zena, always present in the interior
  if (textures.commander) {
    const z = new Sprite(textures.commander);
    z.anchor.set(0.5, 1); z.height = H * 0.2;
    z.width = z.height * (textures.commander.width / textures.commander.height);
    z.x = W * 0.32; z.y = H * 0.99; root.addChild(z);
  }
  // Pepper: in expansion mode she starts off to the side and walks up beside Zena
  const pepper = textures.pepper ? new Sprite(textures.pepper) : null;
  if (pepper) {
    pepper.anchor.set(0.5, 1); pepper.height = H * 0.12;
    pepper.width = pepper.height * (textures.pepper!.width / textures.pepper!.height);
    pepper.y = H * 0.99; pepper.x = opts.expansion ? W * 1.1 : W * 0.5; root.addChild(pepper);
  }

  const buildable = opts.expansion ? buildableModules(station) : [];

  return new Promise<string | null>((resolve) => {
    let done = false;
    let chosen: string | null = null;
    const finish = () => {
      if (done) return; // idempotent: safe if fired by both a chip and the backdrop
      done = true;
      void animate(root, { alpha: 0 }, 220).then(() => { app.renderer.off('resize', fit);root.destroy(); resolve(chosen); });
    };

    // look-around modes (intro + HUD view): tap ANYWHERE to continue — no tap
    // is ever dead, and a returning player can never get stuck
    if (!opts.expansion) { root.eventMode = 'static'; root.on('pointertap', finish); }

    if (opts.expansion && buildable.length > 0) {
      // Pepper scampers up beside Zena and asks the question
      if (pepper) void animate(pepper, { x: W * 0.52 }, 520, outQuad);
      const bubble = new Container();
      const bw = W * 0.56, bh = H * 0.1;
      bubble.addChild(new Graphics().roundRect(0, 0, bw, bh, 16).fill(0xffffff).stroke({ color: 0xe0568c, width: 2 }));
      const q = new Text({
        text: 'What should we add next, Commander?',
        style: { fill: 0x1a1440, fontSize: W * 0.034, fontWeight: '700', wordWrap: true, wordWrapWidth: bw * 0.9, fontFamily: 'system-ui, sans-serif' },
      });
      q.x = bw * 0.05; q.y = bh * 0.16; bubble.addChild(q);
      bubble.x = W * 0.4; bubble.y = H * 0.62; bubble.alpha = 0; root.addChild(bubble);
      void animate(bubble, { alpha: 1 }, 320);

      // module choices (drawn from the CURRENT station's catalog)
      const chipH = buildable.length > 4 ? H * 0.07 : H * 0.085; // keep tall lists clear of the bubble
      buildable.forEach((id, i) => {
        const mod = def.modules.find((m) => m.id === id)!;
        const chip = new Container();
        const w = W * 0.5, h = chipH;
        const bg = new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2)
          .fill({ color: 0x2b2856 }).stroke({ color: 0x7dd45f, width: 3 });
        chip.addChild(bg);
        const tex = textures.station.modules[id];
        if (tex) { const ic = new Sprite(tex); ic.anchor.set(0.5); ic.width = ic.height = h * 0.8; ic.x = -w / 2 + h * 0.6; chip.addChild(ic); }
        const label = new Text({ text: mod.name, style: { fill: 0xffffff, fontSize: h * 0.34, fontWeight: '800', fontFamily: 'system-ui, sans-serif' } });
        label.anchor.set(0, 0.5); label.x = -w / 2 + h; chip.addChild(label);
        chip.x = W / 2; chip.y = H * 0.2 + i * h * 1.3;
        chip.eventMode = 'static'; chip.cursor = 'pointer';
        chip.on('pointertap', () => { chosen = id; finish(); });
        root.addChild(chip);
      });
      // escape hatch: she can think it over — the prompt returns after the next win
      const later = new Container();
      const lw = W * 0.3, lh = H * 0.06;
      later.addChild(new Graphics().roundRect(-lw / 2, -lh / 2, lw, lh, lh / 2)
        .fill({ color: 0x2b2856 }).stroke({ color: 0x8a7ae0, width: 2 }));
      const lt = new Text({ text: 'Later', style: { fill: 0xcfc8ff, fontSize: lh * 0.42, fontWeight: '800', fontFamily: 'system-ui, sans-serif' } });
      lt.anchor.set(0.5); later.addChild(lt);
      later.x = W * 0.8; later.y = H * 0.9;
      later.eventMode = 'static'; later.cursor = 'pointer';
      later.on('pointertap', finish); // chosen stays null -> nothing is built
      root.addChild(later);
    } else {
      const btn = new Container();
      const w = W * 0.4, h = H * 0.08;
      const bg = new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2)
        .fill(new FillGradient({
          type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
          colorStops: [{ offset: 0, color: 0x6fe06a }, { offset: 1, color: 0x3f9e3a }], textureSpace: 'local',
        }));
      const label = new Text({ text: opts.intro ? 'Continue' : 'Close', style: { fill: 0xffffff, fontSize: h * 0.42, fontWeight: '900', fontFamily: 'system-ui, sans-serif' } });
      label.anchor.set(0.5); btn.addChild(bg, label);
      btn.x = W * 0.72; btn.y = H * 0.9; btn.eventMode = 'static'; btn.cursor = 'pointer';
      btn.on('pointertap', finish); root.addChild(btn);
    }

    root.alpha = 0; void animate(root, { alpha: 1 }, 260);
    title.scale.set(0.8); void animate(title.scale, { x: 1, y: 1 }, 400, outBack);
  });
}
