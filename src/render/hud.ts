import { Application, Container, FillGradient, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { POWER_UP_COST, type PowerUpKind } from '../core';
import type { Goal } from '../core/types';
import type { TextureSet } from './textures';
import { outBack, tween } from './tween';

/** Goal chip, points chip, purchasable power-up tray, and win/fail banners. */
export class Hud {
  private progressText!: Text;
  private chip!: Container;
  private pointsText!: Text;
  private pointsChip!: Container;
  private banner: Container | null = null;
  private tray = new Map<PowerUpKind, { root: Container; bg: Graphics; cost: Text; count: Text; badge: Graphics }>();
  private selected: PowerUpKind | null = null;
  /** Called when the player taps a power-up; the game layer decides buy vs use. */
  onPowerUpPick: (kind: PowerUpKind | null) => void = () => {};
  /** Called when the player taps the station button; opens the station screen. */
  onStationTap: () => void = () => {};
  /** Called when the player taps the store button; opens the store. */
  onStoreTap: () => void = () => {};
  private lastPoints = 0;
  private inventory: Record<PowerUpKind, number> = { demo: 0, wormhole: 0, tractor: 0 };
  private turnsChip: Container | null = null;
  private turnsText: Text | null = null;

  constructor(
    private app: Application,
    private layer: Container,
    private textures: TextureSet,
    private goal: Goal,
  ) {
    this.buildGoalChip();
    this.buildPointsChip();
    this.buildTray();
    // station + store as a pixel-art pair below the points chip, above the board
    this.buildIconButton(this.textures.iconStation, 0.80, 0.115, () => this.onStationTap());
    this.buildIconButton(this.textures.iconStore, 0.915, 0.115, () => this.onStoreTap());
  }

  /** A rounded chip button carrying a pixel-art icon (station / store). */
  private buildIconButton(tex: Texture | undefined, xFrac: number, yFrac: number, onTap: () => void): void {
    const size = this.app.screen.height * 0.052;
    const btn = new Container();
    const bg = new Graphics();
    bg.roundRect(-size / 2 + 1, -size / 2 + 2, size, size, size * 0.28).fill({ color: 0x05060f, alpha: 0.5 });
    bg.roundRect(-size / 2, -size / 2, size, size, size * 0.28).fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [{ offset: 0, color: 0x2b2856 }, { offset: 1, color: 0x141830 }], textureSpace: 'local',
    }));
    bg.roundRect(-size / 2, -size / 2, size, size, size * 0.28).stroke({ color: 0x8a7ae0, width: 2, alpha: 0.7 });
    btn.addChild(bg);
    if (tex) {
      const ic = new Sprite(tex);
      ic.anchor.set(0.5);
      ic.width = ic.height = size * 0.74;
      btn.addChild(ic);
    }
    btn.x = this.app.screen.width * xFrac;
    btn.y = this.app.screen.height * yFrac;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointertap', onTap);
    this.layer.addChild(btn);
  }

  private chipBase(w: number, h: number): Graphics {
    const bg = new Graphics();
    // drop shadow
    bg.roundRect(2, 3, w, h, h / 2).fill({ color: 0x05060f, alpha: 0.5 });
    // gradient body
    bg.roundRect(0, 0, w, h, h / 2).fill(new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 0x2b2856 },
        { offset: 1, color: 0x141830 },
      ],
      textureSpace: 'local',
    }));
    bg.roundRect(0, 0, w, h, h / 2).stroke({ color: 0x8a7ae0, width: 2, alpha: 0.7 });
    // top shine
    bg.roundRect(h * 0.25, h * 0.12, w - h * 0.5, h * 0.28, h * 0.14)
      .fill({ color: 0xffffff, alpha: 0.10 });
    return bg;
  }

  private goalIcon!: Sprite;
  private goalLabel!: Text;
  private levelText!: Text;

  private buildGoalChip(): void {
    const h = this.app.screen.height * 0.062;
    const w = h * 3.0;
    const chip = new Container();
    chip.addChild(this.chipBase(w, h));
    const icon = new Sprite(this.textures.survivor);
    icon.anchor.set(0.5);
    icon.scale.set((h * 0.78) / icon.texture.height);
    icon.x = h * 0.62; icon.y = h / 2;
    chip.addChild(icon);
    this.goalIcon = icon;
    const label = new Text({
      text: 'RESCUE',
      style: {
        fill: 0xe8c04a, fontSize: h * 0.24, fontWeight: '800',
        fontFamily: 'system-ui, sans-serif', letterSpacing: 1.5,
      },
    });
    label.anchor.set(0, 0.5);
    label.x = h * 1.15; label.y = h * 0.3;
    chip.addChild(label);
    this.goalLabel = label;
    this.progressText = new Text({
      text: `0/${this.goal.n}`,
      style: { fill: 0xffffff, fontSize: h * 0.42, fontWeight: '800', fontFamily: 'system-ui, sans-serif' },
    });
    this.progressText.anchor.set(0, 0.5);
    this.progressText.x = h * 1.15; this.progressText.y = h * 0.68;
    chip.addChild(this.progressText);
    chip.x = this.app.screen.width * 0.04;
    chip.y = this.app.screen.height * 0.03;
    this.layer.addChild(chip);
    this.chip = chip;

    // LEVEL n label, centered above the board
    this.levelText = new Text({
      text: 'LEVEL 1',
      style: { fill: 0xcfc8ff, fontSize: h * 0.34, fontWeight: '800', fontFamily: 'system-ui, sans-serif', letterSpacing: 1 },
    });
    this.levelText.anchor.set(0.5, 0.5);
    this.levelText.x = this.app.screen.width / 2;
    this.levelText.y = this.app.screen.height * 0.06;
    this.layer.addChild(this.levelText);
  }

  /** Reconfigure the goal chip for a new level's goal + reset progress. */
  setGoal(goal: Goal, levelIndex: number): void {
    this.goal = goal;
    this.levelText.text = `LEVEL ${levelIndex}`;
    this.goalLabel.text = goal.type === 'collectN' ? 'COLLECT' : 'RESCUE';
    const tex = goal.type === 'collectN'
      ? (this.textures.canisterOverlay ?? this.textures.survivor)
      : this.textures.survivor;
    this.goalIcon.texture = tex;
    const h = this.app.screen.height * 0.062;
    this.goalIcon.scale.set((h * 0.78) / tex.height);
    this.progressText.text = `0/${goal.n}`;
  }

  private buildPointsChip(): void {
    const h = this.app.screen.height * 0.052;
    const w = h * 3.4;
    const chip = new Container();
    chip.addChild(this.chipBase(w, h));
    const icon = new Sprite(this.textures.crystal);
    icon.anchor.set(0.5);
    icon.scale.set((h * 0.8) / icon.texture.height);
    icon.x = h * 0.62; icon.y = h / 2;
    chip.addChild(icon);
    this.pointsText = new Text({
      text: '0',
      style: { fill: 0xaef0e8, fontSize: h * 0.46, fontWeight: '700', fontFamily: 'system-ui, sans-serif' },
    });
    this.pointsText.anchor.set(0, 0.5);
    this.pointsText.x = h * 1.15; this.pointsText.y = h / 2;
    chip.addChild(this.pointsText);
    chip.x = this.app.screen.width * 0.96 - w;
    chip.y = this.app.screen.height * 0.03;
    this.layer.addChild(chip);
    this.pointsChip = chip;
  }

  private buildTray(): void {
    const size = this.app.screen.height * 0.066;
    const cy = this.app.screen.height * 0.935;
    const cx = this.app.screen.width / 2;
    const gap = size * 1.6;
    const kinds: PowerUpKind[] = ['demo', 'wormhole', 'tractor'];
    const icons = {
      demo: this.textures.iconDemo,
      wormhole: this.textures.iconWormhole,
      tractor: this.textures.iconTractor,
    } as const;
    kinds.forEach((kind, i) => {
      const root = new Container();
      const bg = new Graphics();
      root.addChild(bg);
      const icon = new Sprite(icons[kind]);
      icon.anchor.set(0.5);
      icon.scale.set((size * 0.78) / icon.texture.width);
      icon.y = -size * 0.06;
      root.addChild(icon);
      const cost = new Text({
        text: `${POWER_UP_COST[kind]}`,
        style: { fill: 0xaef0e8, fontSize: size * 0.26, fontWeight: '700', fontFamily: 'system-ui, sans-serif' },
      });
      cost.anchor.set(0.5);
      cost.y = size * 0.36;
      root.addChild(cost);
      // owned-count badge (top-right, like the original's inventory numbers)
      const badge = new Graphics();
      badge.circle(size * 0.42, -size * 0.42, size * 0.19).fill(0x5fae4a);
      badge.circle(size * 0.42, -size * 0.42, size * 0.19).stroke({ color: 0x2e5a24, width: 2 });
      root.addChild(badge);
      const count = new Text({
        text: '0',
        style: { fill: 0xffffff, fontSize: size * 0.24, fontWeight: '800', fontFamily: 'system-ui, sans-serif' },
      });
      count.anchor.set(0.5);
      count.x = size * 0.42; count.y = -size * 0.42;
      root.addChild(count);
      root.x = cx + (i - 1) * gap;
      root.y = cy;
      root.eventMode = 'static';
      root.cursor = 'pointer';
      root.on('pointertap', () => this.tapPowerUp(kind));
      this.layer.addChild(root);
      this.tray.set(kind, { root, bg, cost, count, badge });
    });
    this.redrawTray();
  }

  private tapPowerUp(kind: PowerUpKind): void {
    const next = this.selected === kind ? null : kind;
    this.onPowerUpPick(next);
  }

  /** Visually arm a power-up for target picking (or clear with null). */
  armSelection(kind: PowerUpKind | null): void {
    this.selected = kind;
    this.redrawTray();
  }

  /** Reject feedback: shake a slot. */
  shakeSlot(kind: PowerUpKind): void {
    const slot = this.tray.get(kind);
    if (!slot) return;
    const x0 = slot.root.x;
    void tween(slot.root, { x: x0 + 4 }, 40).then(() =>
      tween(slot.root, { x: x0 - 4 }, 60).then(() => tween(slot.root, { x: x0 }, 40)));
  }

  setInventory(inv: Record<PowerUpKind, number>): void {
    this.inventory = { ...inv };
    this.redrawTray();
  }

  /** Show/update the turns chip (move-limited levels); null hides it. */
  setTurns(movesLeft: number | null): void {
    if (movesLeft === null) {
      if (this.turnsChip) { this.turnsChip.destroy(); this.turnsChip = null; this.turnsText = null; }
      return;
    }
    if (!this.turnsChip) {
      const h = this.app.screen.height * 0.044;
      const w = h * 3.2;
      const chip = new Container();
      chip.addChild(this.chipBase(w, h));
      this.turnsText = new Text({
        text: '',
        style: { fill: 0xffd28a, fontSize: h * 0.46, fontWeight: '800', fontFamily: 'system-ui, sans-serif' },
      });
      this.turnsText.anchor.set(0.5);
      this.turnsText.x = w / 2; this.turnsText.y = h / 2;
      chip.addChild(this.turnsText);
      chip.x = this.app.screen.width * 0.04;
      chip.y = this.app.screen.height * 0.03 + this.app.screen.height * 0.062;
      this.layer.addChild(chip);
      this.turnsChip = chip;
    }
    if (this.turnsText) this.turnsText.text = `${movesLeft} TURNS`;
    if (movesLeft <= 3 && this.turnsText) this.turnsText.style.fill = 0xe05555;
  }

  /** Clear power-up selection (after use or cancel). */
  clearSelection(): void {
    this.selected = null;
    this.redrawTray();
  }

  private redrawTray(): void {
    const size = this.app.screen.height * 0.066;
    for (const [kind, slot] of this.tray) {
      const owned = this.inventory[kind] > 0;
      const buyable = this.lastPoints >= POWER_UP_COST[kind];
      const usable = owned || buyable;
      const sel = this.selected === kind;
      slot.bg.clear();
      // drop shadow
      slot.bg.roundRect(-size / 2 + 2, -size / 2 + 3, size, size, size * 0.24)
        .fill({ color: 0x05060f, alpha: 0.5 });
      // gradient candy button
      slot.bg.roundRect(-size / 2, -size / 2, size, size, size * 0.24)
        .fill(new FillGradient({
          type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
          colorStops: sel
            ? [{ offset: 0, color: 0x3f7a4a }, { offset: 1, color: 0x22452a }]
            : [{ offset: 0, color: 0x2b2856 }, { offset: 1, color: 0x161230 }],
          textureSpace: 'local',
        }));
      slot.bg.roundRect(-size / 2, -size / 2, size, size, size * 0.24)
        .stroke({ color: sel ? 0x7dd45f : owned ? 0x5fae4a : buyable ? 0x8a7ae0 : 0x2e3252, width: sel ? 3.5 : 2.5, alpha: 0.9 });
      // top shine
      slot.bg.roundRect(-size * 0.36, -size * 0.42, size * 0.72, size * 0.2, size * 0.1)
        .fill({ color: 0xffffff, alpha: 0.12 });
      slot.root.alpha = usable ? 1 : 0.45;
      slot.count.text = `${this.inventory[kind]}`;
      slot.badge.visible = owned;
      slot.count.visible = owned;
      // cost label doubles as the "buy" price when you own none
      slot.cost.text = owned ? `${this.inventory[kind]} owned` : `${POWER_UP_COST[kind]}`;
      slot.cost.style.fill = owned ? 0x9fdc8a : buyable ? 0xaef0e8 : 0x8a8fa8;
    }
  }

  setPoints(points: number): void {
    this.lastPoints = points;
    this.pointsText.text = `${points}`;
    void tween(this.pointsChip.scale, { x: 1.08, y: 1.08 }, 90, outBack)
      .then(() => tween(this.pointsChip.scale, { x: 1, y: 1 }, 110));
    this.redrawTray();
  }

  setProgress(rescued: number): void {
    this.progressText.text = `${rescued}/${this.goal.n}`;
    void tween(this.chip.scale, { x: 1.12, y: 1.12 }, 110, outBack)
      .then(() => tween(this.chip.scale, { x: 1, y: 1 }, 130));
  }

  showBanner(kind: 'won' | 'lost', onAction: () => void): void {
    if (this.banner) { this.banner.destroy(); this.banner = null; }
    const { width: W, height: H } = this.app.screen;
    const panel = new Container();
    const shade = new Graphics().rect(0, 0, W, H).fill({ color: 0x05060f, alpha: 0.55 });
    shade.eventMode = 'static'; // block board input beneath
    panel.addChild(shade);

    const pw = W * 0.78, ph = H * 0.26;
    const box = new Graphics().roundRect(0, 0, pw, ph, 24).fill({ color: 0x141830, alpha: 0.97 });
    box.roundRect(0, 0, pw, ph, 24).stroke({ color: kind === 'won' ? 0x7dd45f : 0x8f86d8, width: 3 });
    box.x = (W - pw) / 2; box.y = (H - ph) / 2;
    panel.addChild(box);

    const title = new Text({
      text: kind === 'won' ? 'Sector Rescued!' : 'They drifted away…',
      style: { fill: 0xffffff, fontSize: pw * 0.09, fontWeight: '800', fontFamily: 'system-ui, sans-serif' },
    });
    title.anchor.set(0.5);
    title.x = W / 2; title.y = box.y + ph * 0.3;
    panel.addChild(title);

    // Pepper bounds in to celebrate a rescue (tail-wag wobble)
    if (kind === 'won' && this.textures.pepper) {
      const pep = new Sprite(this.textures.pepper);
      pep.anchor.set(0.5, 1);
      pep.height = ph * 0.5; pep.width = pep.height * (this.textures.pepper.width / this.textures.pepper.height);
      pep.x = box.x + pw - ph * 0.28; pep.y = box.y + ph * 0.06;
      panel.addChild(pep);
      pep.y += ph * 0.5; pep.alpha = 0;
      void tween(pep, { y: box.y + ph * 0.06, alpha: 1 }, 320, outBack).then(async () => {
        for (let i = 0; i < 3; i++) {
          await tween(pep, { rotation: 0.12 }, 140);
          await tween(pep, { rotation: -0.08 }, 160);
        }
        await tween(pep, { rotation: 0 }, 120);
      });
    }

    const btnW = pw * 0.52, btnH = ph * 0.26;
    const btn = new Container();
    const bg = new Graphics().roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2)
      .fill(kind === 'won' ? 0x5fae4a : 0x6a6fb8);
    btn.addChild(bg);
    const label = new Text({
      text: kind === 'won' ? 'Next Level' : 'Try Again',
      style: { fill: 0xffffff, fontSize: btnH * 0.42, fontWeight: '700', fontFamily: 'system-ui, sans-serif' },
    });
    label.anchor.set(0.5);
    btn.addChild(label);
    btn.x = W / 2; btn.y = box.y + ph * 0.68;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointertap', () => {
      panel.destroy();
      this.banner = null;
      onAction();
    });
    panel.addChild(btn);

    panel.alpha = 0;
    this.layer.addChild(panel);
    this.banner = panel;
    void tween(panel, { alpha: 1 }, 220);
  }
}
