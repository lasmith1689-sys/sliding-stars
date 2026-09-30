import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { BoardState, Piece, Survivor } from '../core/types';
import type { Layers } from './app';
import type { TextureSet } from './textures';
import { computeLayout, type Layout } from './layout';
import { NEED_URGENT } from './palette';

/** The oxygen warning only appears once a drifting survivor is this close to expiring. */
const OXYGEN_WARN_AT = 6;

/**
 * Renders a BoardState. `syncFrom` snaps the scene to match the model exactly —
 * used at load and as the safety net after every animation run.
 * Needs UI (bubbles/pips) is wired in Plan2/T6 via updateNeed.
 */
export class BoardView {
  layout: Layout;
  private pieceSprites = new Map<string, Sprite>();
  private overlaySprites = new Map<string, Sprite>();
  private domeDoors = new Map<string, Graphics>();
  private roverSprites = new Map<number, Sprite>();
  private survivorNodes = new Map<number, Container>();
  private bobT = 0;
  private needMoves = 12;
  private mask:boolean[][]=[];
  private overlayLabels=new Container();
  reducedMotion=false;

  constructor(
    private app: Application,
    readonly layers: Layers,
    private textures: TextureSet,
    state: BoardState,
  ) {
    this.layout = computeLayout(state.rows, state.cols, app.screen.width, app.screen.height);
    this.layers.actors.sortableChildren=true;
    this.overlayLabels.zIndex=50;
    this.layers.actors.addChild(this.overlayLabels);
    this.syncFrom(state);
    this.app.ticker.add((tk) => this.idle(tk.deltaMS));
  }

  /** Recompute layout for a (possibly different-sized) level and re-sync. */
  relayout(state: BoardState): void {
    for(const node of this.survivorNodes.values())node.destroy({children:true});
    this.survivorNodes.clear();
    this.layout = computeLayout(state.rows, state.cols, this.app.screen.width, this.app.screen.height);
    this.syncFrom(state);
  }

  posKey(r: number, c: number): string { return `${r},${c}`; }

  /** Top-left pixel position of cell (r,c). */
  cellXY(r: number, c: number): { x: number; y: number } {
    const { tileSize, gap, originX, originY } = this.layout;
    return { x: originX + c * (tileSize + gap), y: originY + r * (tileSize + gap) };
  }

  /** Nearest cell for a pointer position, or null when outside the grid. */
  cellAt(px: number, py: number): { r: number; c: number } | null {
    const { tileSize, gap, originX, originY } = this.layout;
    const step = tileSize + gap;
    const c = Math.floor((px - originX) / step);
    const r = Math.floor((py - originY) / step);
    if (r < 0 || c < 0 || !this.mask[r]?.[c]) return null;
    return { r, c };
  }

  pieceAt(r: number, c: number): Sprite | undefined {
    return this.pieceSprites.get(this.posKey(r, c));
  }

  /** Center pixel position of cell (r,c). */
  cellCenter(r: number, c: number): { x: number; y: number } {
    const { x, y } = this.cellXY(r, c);
    return { x: x + this.layout.tileSize / 2, y: y + this.layout.tileSize / 2 };
  }

  /** Re-key a sprite from one cell to another (does not move it visually). */
  moveKey(from: { r: number; c: number }, to: { r: number; c: number }): void {
    const a = this.posKey(from.r, from.c), b = this.posKey(to.r, to.c);
    const sa = this.pieceSprites.get(a);
    const sb = this.pieceSprites.get(b);
    if (sa) this.pieceSprites.set(b, sa); else this.pieceSprites.delete(b);
    if (sb && sa !== sb) this.pieceSprites.set(a, sb); else this.pieceSprites.delete(a);
  }

  /** Remove and destroy the sprite at a cell (if any). */
  removeAt(r: number, c: number): void {
    const key = this.posKey(r, c);
    const sp = this.pieceSprites.get(key);
    if (sp) { sp.destroy(); this.pieceSprites.delete(key); }
  }

  /** Create a sprite for a piece at cell (r,c), optionally starting at a pixel y. */
  addPiece(piece: Piece, r: number, c: number, startY?: number): Sprite {
    this.removeAt(r, c);
    const sp = new Sprite(this.textureFor(piece));
    sp.anchor.set(0.5);
    const { x, y } = this.cellCenter(r, c);
    sp.x = x;
    sp.y = startY ?? y;
    sp.width = this.layout.tileSize;
    sp.height = this.layout.tileSize;
    this.layers.pieces.addChild(sp);
    this.pieceSprites.set(this.posKey(r, c), sp);
    return sp;
  }

  /** Retexture the sprite at (r,c) for a new piece, keeping position. */
  retexture(r: number, c: number, piece: Piece): void {
    const sp = this.pieceAt(r, c);
    if (sp) {
      sp.texture = this.textureFor(piece);
      sp.width = this.layout.tileSize;
      sp.height = this.layout.tileSize;
    }
  }

  texturesRef(): TextureSet { return this.textures; }

  survivorNode(id: number): Container | undefined {
    return this.survivorNodes.get(id);
  }

  /** Survivor nodes currently sitting at a cell center (they ride tiles). */
  ridersAt(r: number, c: number): Container[] {
    const { x, y } = this.cellCenter(r, c);
    const out: Container[] = [];
    for (const node of this.survivorNodes.values()) {
      if (!(node as Container & {_rover?:boolean})._rover&&Math.abs(node.x - x) < 1 && Math.abs(node.y - y) < 1) out.push(node);
    }
    return out;
  }

  textureFor(p: Piece) {
    if (p.kind === 'pod') return this.textures.pod;
    if (p.kind === 'dome') return this.textures.dome;
    return this.textures.tile[p.tier];
  }

  /** Snap the whole scene to the model. Destroys and rebuilds mismatched nodes. */
  syncFrom(state: BoardState): void {
    this.mask=state.mask;
    const { tileSize } = this.layout;
    const seen = new Set<string>();
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const piece = state.grid[r]![c];
        const key = this.posKey(r, c);
        if (!piece) {
          const old = this.pieceSprites.get(key);
          if (old) { old.destroy(); this.pieceSprites.delete(key); }
          continue;
        }
        seen.add(key);
        let sp = this.pieceSprites.get(key);
        if (!sp) {
          sp = new Sprite(this.textureFor(piece));
          sp.anchor.set(0.5);
          this.layers.pieces.addChild(sp);
          this.pieceSprites.set(key, sp);
        } else {
          sp.texture = this.textureFor(piece);
        }
        const { x, y } = this.cellXY(r, c);
        sp.x = x + tileSize / 2;
        sp.y = y + tileSize / 2;
        sp.width = tileSize;
        sp.height = tileSize;
        sp.rotation = 0;
        sp.alpha = 1;
      }
    }
    for (const [key, sp] of this.pieceSprites) {
      if (!seen.has(key)) { sp.destroy(); this.pieceSprites.delete(key); }
    }
    this.syncOverlays(state);
    this.syncDomeDoors(state);
    this.syncRovers(state);
    this.syncSurvivors(state);
  }

  /** A lit doorway on each station's facing side — the only cell that rescues. */
  private syncDomeDoors(state: BoardState): void {
    const { tileSize } = this.layout;
    const seen = new Set<string>();
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const p = state.grid[r]![c];
        if (p?.kind !== 'dome') continue;
        const key = this.posKey(r, c);
        seen.add(key);
        let g = this.domeDoors.get(key);
        if (!g) { g = new Graphics(); this.layers.actors.addChild(g); this.domeDoors.set(key, g); }
        const { x, y } = this.cellCenter(r, c);
        const dir = p.facing === 'left' ? -1 : 1;
        const dw = tileSize * 0.2, dh = tileSize * 0.46;
        const cx = x + dir * (tileSize * 0.5 - dw * 0.4);
        g.clear();
        g.roundRect(cx - dw / 2, y - dh / 2, dw, dh, 4).fill({ color: 0x0a1830 }).stroke({ color: 0x8fe3ff, width: 2, alpha: 0.95 });
        g.roundRect(cx - dw / 2, y - dh / 2, dw, dh, 4).fill({ color: 0x8fe3ff, alpha: 0.18 }); // soft glow
        const doorC=c+dir;
        if(state.mask[r]?.[doorC]){
          const entry=this.cellXY(r,doorC);
          g.roundRect(entry.x+2,entry.y+2,tileSize-4,tileSize-4,8).stroke({color:0x94ffe5,width:2,alpha:.85});
          const tipX=cx+dir*tileSize*.22;
          g.moveTo(tipX+dir*6,y-5).lineTo(tipX,y).lineTo(tipX+dir*6,y+5).stroke({color:0xffffff,width:3});
        }
      }
    }
    for (const [key, g] of this.domeDoors) {
      if (!seen.has(key)) { g.destroy(); this.domeDoors.delete(key); }
    }
  }

  /** Draw rescue rovers under their rider (entity layer). */
  private syncRovers(state: BoardState): void {
    const { tileSize } = this.layout;
    const tex = this.textures.roverOverlay;
    const seen = new Set<number>();
    if (tex) {
      for (const rv of state.rovers) {
        seen.add(rv.id);
        let sp = this.roverSprites.get(rv.id);
        if (!sp) {
          sp = new Sprite(tex); sp.anchor.set(0.5);
          this.layers.actors.addChild(sp);
          this.roverSprites.set(rv.id, sp);
        }
        const { x, y } = this.cellCenter(rv.r, rv.c);
        sp.x = x; sp.y = y + tileSize * 0.14; // sit low so the rider shows on top
        sp.width = tileSize * 0.92; sp.height = tileSize * 0.92;
      }
    }
    for (const [id, sp] of this.roverSprites) {
      if (!seen.has(id)) { sp.destroy(); this.roverSprites.delete(id); }
    }
  }

  /** Draw canister/crystal overlays above their tile. */
  private syncOverlays(state: BoardState): void {
    for(const child of this.overlayLabels.removeChildren())child.destroy();
    const { tileSize } = this.layout;
    const seen = new Set<string>();
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const ov = state.overlays[r]![c];
        const key = this.posKey(r, c);
        // a box shows visible wear as its hp drops (dedicated art if present)
        const boxTex = ov?.kind === 'canister'
          ? (ov.hp <= 1 ? this.textures.canisterCrumbling : ov.hp === 2 ? this.textures.canisterCracked : undefined) ?? this.textures.canisterOverlay
          : undefined;
        const tex = ov?.kind === 'canister' ? boxTex
          : ov?.kind === 'crystal' ? this.textures.crystalOverlay
          : ov?.kind === 'reactor' ? this.textures.reactorOverlay
          : ov?.kind === 'comet' ? this.textures.cometOverlay : undefined;
        if (!ov || !tex) {
          const old = this.overlaySprites.get(key);
          if (old) { old.destroy(); this.overlaySprites.delete(key); }
          continue;
        }
        seen.add(key);
        let sp = this.overlaySprites.get(key);
        if (!sp) {
          sp = new Sprite(tex);
          sp.anchor.set(0.5);
          this.layers.actors.addChild(sp);
          this.overlaySprites.set(key, sp);
        } else {
          sp.texture = tex;
        }
        // if no dedicated wear art, tint the box dirtier/darker as it wears
        if (ov.kind === 'canister' && !this.textures.canisterCracked) {
          sp.tint = ov.hp <= 1 ? 0xbf7a55 : ov.hp === 2 ? 0xdcb08c : 0xffffff;
        } else {
          sp.tint = 0xffffff;
        }
        const { x, y } = this.cellCenter(r, c);
        sp.x = x; sp.y = y;
        sp.width = tileSize * 0.82;
        sp.height = tileSize * 0.82;
        const label=new Text({text:ov.kind==='reactor'?`⚡ ${ov.fuse} · ${ov.hp}♥`:`${ov.hp} hit${ov.hp===1?'':'s'}`,style:{fontFamily:'system-ui',fontSize:Math.max(10,tileSize*.18),fontWeight:'800',fill:0xffffff,stroke:{color:0x111832,width:4}}});
        label.anchor.set(.5);label.position.set(x,y+tileSize*.33);this.overlayLabels.addChild(label);
      }
    }
    for (const [key, sp] of this.overlaySprites) {
      if (!seen.has(key)) { sp.destroy(); this.overlaySprites.delete(key); }
    }
  }

  /** Overlay sprite at a cell (for break animation). */
  overlayAt(r: number, c: number): Sprite | undefined {
    return this.overlaySprites.get(this.posKey(r, c));
  }
  roverAt(id:number):Sprite|undefined {return this.roverSprites.get(id);}

  removeOverlayAt(r: number, c: number): void {
    const key = this.posKey(r, c);
    const sp = this.overlaySprites.get(key);
    if (sp) { sp.destroy(); this.overlaySprites.delete(key); }
  }

  private syncSurvivors(state: BoardState): void {
    const { tileSize } = this.layout;
    this.needMoves = state.needMoves;
    const seen = new Set<number>();
    // group visible survivors by cell so a shared tile can shrink + spread them
    const atCell = new Map<string, number[]>();
    for (const sv of state.survivors) {
      if (sv.state === 'housed' || sv.state === 'lost') continue;
      const k = `${sv.r},${sv.c}`;
      const list = atCell.get(k);
      if (list) list.push(sv.id); else atCell.set(k, [sv.id]);
    }
    for (const sv of state.survivors) {
      if (sv.state === 'housed' || sv.state === 'lost') {
        const old = this.survivorNodes.get(sv.id);
        if (old) { old.destroy(); this.survivorNodes.delete(sv.id); }
        continue;
      }
      seen.add(sv.id);
      let node = this.survivorNodes.get(sv.id);
      if (!node) {
        node = this.makeSurvivorNode(sv, tileSize);
        this.layers.actors.addChild(node);
        this.survivorNodes.set(sv.id, node);
      }
      const { x, y } = this.cellXY(sv.r, sv.c);
      // when several crew share a tile, shrink them and spread them in a small grid
      const group = atCell.get(`${sv.r},${sv.c}`) ?? [sv.id];
      const n = group.length, idx = Math.max(0, group.indexOf(sv.id));
      const clusterScale = n <= 1 ? 1 : n === 2 ? 0.62 : n <= 4 ? 0.52 : 0.44;
      const cols = n <= 1 ? 1 : n === 2 ? 2 : Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const spread = tileSize * 0.32;
      const ox = n <= 1 ? 0 : ((idx % cols) - (cols - 1) / 2) * spread;
      const oy = n <= 1 ? 0 : (Math.floor(idx / cols) - (rows - 1) / 2) * spread;
      node.x = x + tileSize / 2;
      node.y = y + tileSize / 2;
      node.pivot.x=-ox/clusterScale;
      (node as Container & {_clusterY?:number;_rover?:boolean})._clusterY=-oy/clusterScale;
      (node as Container & {_rover?:boolean})._rover=state.rovers.some(r=>r.riderId===sv.id);
      node.scale.set(clusterScale);
      const swimming = sv.state === 'swimming';
      (node.getChildByLabel('safe') as Text).visible=!swimming;
      const body = node.getChildByLabel('body') as Sprite;
      // VIP survivors wear their own sprite so the player can tell they're special
      const vipTex = sv.vip ? this.textures.station.vips[sv.vip] : undefined;
      body.texture = vipTex ?? this.textures.survivor;
      body.scale.set(((swimming ? 0.52 : 0.62) * tileSize) / body.texture.width);
      (node.getChildByLabel('ripple') as Graphics).visible = swimming;
      // the oxygen warning only appears once a survivor is low on air (updateNeed gates it)
      const bubble = node.getChildByLabel('bubble') as Sprite;
      bubble.texture = sv.need?.type === 'shelter' ? this.textures.bubbleShelter : this.textures.bubbleRescue;
      if (sv.need) {
        this.updateNeed(sv.id, sv.need.movesLeft);
      } else {
        bubble.visible = false;
        (node.getChildByLabel('bar') as Graphics).visible = false;
        (node.getChildByLabel('count') as Text).visible = false;
        (node.getChildByLabel('oxygen-plate') as Graphics).visible = false;
        (node as unknown as { _urgent?: boolean })._urgent = false;
      }
    }
    for (const [id, node] of this.survivorNodes) {
      if (!seen.has(id)) { node.destroy(); this.survivorNodes.delete(id); }
    }
  }

  private makeSurvivorNode(sv: Survivor, tileSize: number): Container {
    const node = new Container();
    const ripple = new Graphics();
    ripple.label = 'ripple';
    ripple.ellipse(0, tileSize * 0.34, tileSize * 0.26, tileSize * 0.08)
      .stroke({ color: 0xffffff, width: Math.max(1.5, tileSize * 0.02), alpha: 0.4 });
    node.addChild(ripple);
    const body = new Sprite(this.textures.survivor);
    body.label = 'body';
    body.anchor.set(0.5);
    node.addChild(body);
    const bubble = new Sprite(sv.need?.type === 'shelter' ? this.textures.bubbleShelter : this.textures.bubbleRescue);
    bubble.label = 'bubble';
    bubble.anchor.set(0.5, 1);
    bubble.scale.set((tileSize * 0.52) / bubble.texture.width);
    bubble.y = -tileSize * 0.42;
    node.addChild(bubble);
    const plate=new Graphics();plate.label='oxygen-plate';node.addChild(plate);
    const bar = new Graphics();
    bar.label = 'bar';
    bar.y = -tileSize * 0.38;
    node.addChild(bar);
    const count = new Text({
      text: '',
      style: { fill: 0xffffff, fontSize: Math.max(10, tileSize * 0.18), fontWeight: '800', fontFamily: 'system-ui, sans-serif' },
    });
    count.label = 'count';
    count.anchor.set(0.5);
    count.y = -tileSize * 0.54;
    node.addChild(count);
    const safe=new Text({text:'SAFE',style:{fill:0xbdffda,fontSize:Math.max(9,tileSize*.14),fontWeight:'800',fontFamily:'system-ui',stroke:{color:0x17332e,width:3}}});
    safe.label='safe';safe.anchor.set(.5);safe.y=tileSize*.35;node.addChild(safe);
    return node;
  }

  /** Show/redraw the oxygen warning — only when a survivor is low on air. */
  updateNeed(id: number, movesLeft: number): void {
    const node = this.survivorNodes.get(id);
    if (!node) return;
    const bar = node.getChildByLabel('bar') as Graphics | null;
    const bubble = node.getChildByLabel('bubble') as Sprite | null;
    const count = node.getChildByLabel('count') as Text | null;
    const warn = true;
    const urgent = movesLeft <= 3;
    if (bubble) bubble.visible = false;
    if (count) count.visible = warn;
    if (bar) bar.visible = warn;
    (node as unknown as { _urgent?: boolean })._urgent = warn && urgent;
    if (!warn) return;
    const color = urgent ? NEED_URGENT : movesLeft<=6?0xffd28a:0xa8f4e5;
    if (count) { count.text = `O₂ ${Math.max(0, movesLeft)}`; count.tint = 0xffffff; }
    if (bubble) bubble.tint = color;
    if (!bar) return;
    const ts = this.layout.tileSize;
    const plate=node.getChildByLabel('oxygen-plate') as Graphics;
    plate.visible=true;plate.clear().roundRect(-ts*.32,-ts*.54-10,ts*.64,20,7).fill(0x122338).stroke({color,width:1.5});
    const frac = Math.max(0, Math.min(1, movesLeft / this.needMoves));
    const w = ts * 0.6, h = Math.max(2.5, ts * 0.05);
    bar.clear();
    bar.roundRect(-w / 2, 0, w, h, h / 2).fill({ color: 0x0c0f20, alpha: 0.8 });
    bar.roundRect(-w / 2, 0, w * frac, h, h / 2).fill(urgent ? NEED_URGENT : 0xf0c040);
  }

  private idle(deltaMS: number): void {
    this.bobT += deltaMS / 1000;
    let i = 0;
    for (const node of this.survivorNodes.values()) {
      node.pivot.y = ((node as Container & {_clusterY?:number})._clusterY??0)+(this.reducedMotion?0:Math.sin(this.bobT * 2.2 + i * 1.7) * this.layout.tileSize * 0.03);
      // pulse the oxygen warning when a survivor is critically low (<=3 turns)
      const bubble = node.getChildByLabel('bubble') as Sprite | null;
      if (bubble && bubble.visible) {
        const base = (this.layout.tileSize * 0.52) / bubble.texture.width;
        const urgent = (node as unknown as { _urgent?: boolean })._urgent;
        bubble.scale.set(urgent ? base * (1 + 0.16 * (0.5 + 0.5 * Math.sin(this.bobT * 7))) : base);
      }
      i++;
    }
  }
}
