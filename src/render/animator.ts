import { Text, type Container } from 'pixi.js';
import type { BoardState, GameEvent, Tier } from '../core';
import type { BoardView } from './boardView';
import type { Layers } from './app';
import { TIER_ACCENT } from './palette';
import { burst, flash, glowRing, ripple } from './fx';
import { cancelTweens, delay, inQuad, outBack, outQuad, tween } from './tween';

/**
 * Plays a MoveResult's event stream as animations (Animation spec, design doc).
 * FIFO: play() calls queue — a second move animates after the first finishes.
 * After every run the view snaps to the final state as a safety net.
 */
export class Animator {
  private queue: Promise<void> = Promise.resolve();
  private generation=0;
  private finalState:BoardState|undefined;
  private release:(()=>void)|undefined;
  cancel():void {
    this.generation++;cancelTweens();this.release?.();this.release=undefined;this.queue=Promise.resolve();
    if(this.finalState)this.view.syncFrom(this.finalState);this.finalState=undefined;
    this.layers.pieces.x=0;this.layers.actors.x=0;
  }
  onNeedTick: (id: number, movesLeft: number) => void = () => { /* wired in T6 */ };
  onSurvivorBeat: (kind: 'grounded' | 'housed' | 'lost', id: number) => void = () => { /* T6 */ };
  onGameEnd: (kind: 'won' | 'lost') => void = () => { /* wired in T6 */ };
  onPoints: (amount: number) => void = () => { /* wired in main */ };

  constructor(private view: BoardView, private layers: Layers) {}

  play(events: GameEvent[], finalState: BoardState): Promise<void> {
    const token=this.generation;this.finalState=finalState;
    // never let an interrupted animation reject the shared queue (which would
    // surface as an unhandled promise rejection and stall later moves)
    this.queue = this.queue
      .then(() => token===this.generation?this.run(events, finalState,token):undefined)
      .catch((error:unknown) => { if(token===this.generation){console.warn('Animation recovered from interruption',error);this.view.syncFrom(finalState);} });
    return Promise.race([this.queue,new Promise<void>(resolve=>{this.release=resolve;})]);
  }

  get busy(): Promise<void> { return this.queue; }

  /** Survivor nodes currently sitting at a cell center (they ride tiles). */
  private ridersAt(r: number, c: number): Container[] {
    return this.view.ridersAt(r, c);
  }

  private async run(events: GameEvent[], finalState: BoardState,token:number): Promise<void> {
    const check=()=>{if(token!==this.generation)throw Error('Presentation cancelled');};
    const animate=async(...args:Parameters<typeof tween>)=>{check();await tween(...args);check();};
    const pause=async(ms:number)=>{check();await delay(ms);check();};
    const v = this.view;
    const ts = v.layout.tileSize;
    let cascadeDepth = 0;

    for (let i = 0; i < events.length; i++) {
      check();
      const e = events[i]!;
      switch (e.type) {
        case 'swap': {
          const sa = v.pieceAt(e.a.r, e.a.c);
          const sb = v.pieceAt(e.b.r, e.b.c);
          const ca = v.cellCenter(e.a.r, e.a.c);
          const cb = v.cellCenter(e.b.r, e.b.c);
          const moves: Promise<void>[] = [];
          if (sa) moves.push(animate(sa, { x: cb.x, y: cb.y }, 140, outQuad));
          if (sb) moves.push(animate(sb, { x: ca.x, y: ca.y }, 140, outQuad));
          // survivors ride their swapping tiles
          for (const rd of this.ridersAt(e.a.r, e.a.c)) moves.push(animate(rd, { x: cb.x, y: cb.y }, 140, outQuad));
          for (const rd of this.ridersAt(e.b.r, e.b.c)) moves.push(animate(rd, { x: ca.x, y: ca.y }, 140, outQuad));
          await Promise.all(moves);
          v.moveKey(e.a, e.b);
          break;
        }
        case 'swapRejected': {
          // sprites are already home (drag resets); tiny shake for feedback
          const sp = v.pieceAt(e.a.r, e.a.c);
          if (sp) {
            const x0 = sp.x;
            await animate(sp, { x: x0 + ts * 0.05 }, 45, outQuad);
            await animate(sp, { x: x0 - ts * 0.05 }, 70, outQuad);
            await animate(sp, { x: x0 }, 45, outQuad);
          }
          break;
        }
        case 'merge': {
          const anchor = v.cellCenter(e.anchor.r, e.anchor.c);
          // anticipation: matched tiles puff up together
          const puff: Promise<void>[] = [];
          for (const cell of e.cells) {
            const sp = v.pieceAt(cell.r, cell.c);
            if (sp) puff.push(animate(sp, { width: ts * 1.1, height: ts * 1.1 }, 70, outQuad));
          }
          await Promise.all(puff);
          // dive into the anchor with a slight tumble
          const converge: Promise<void>[] = [];
          for (const cell of e.cells) {
            // survivors standing on merging tiles visibly ride them in
            for (const rider of this.ridersAt(cell.r, cell.c)) {
              converge.push(animate(rider, { x: anchor.x, y: anchor.y }, 110, inQuad));
            }
            if (cell.r === e.anchor.r && cell.c === e.anchor.c) continue;
            const sp = v.pieceAt(cell.r, cell.c);
            if (!sp) continue;
            const spin = (cell.c + cell.r) % 2 === 0 ? 0.16 : -0.16;
            converge.push(
              Promise.all([
                animate(sp, { x: anchor.x, y: anchor.y, width: ts * 0.55, height: ts * 0.55 }, 110, inQuad),
                animate(sp, { rotation: spin }, 110, inQuad),
              ]).then(() => { v.removeAt(cell.r, cell.c); }),
            );
          }
          await Promise.all(converge);
          // result piece: peek ahead for pod/dome at this anchor
          const next = events[i + 1];
          const resultTier: Tier = e.newTier;
          let shuttleLanding = false;
          if (next?.type === 'podCreated' && next.at.r === e.anchor.r && next.at.c === e.anchor.c) {
            v.retexture(e.anchor.r, e.anchor.c, { kind: 'pod' });
            i++; // consume
          } else if (next?.type === 'domeCreated' && next.at.r === e.anchor.r && next.at.c === e.anchor.c) {
            const dp = finalState.grid[e.anchor.r]?.[e.anchor.c];
            v.retexture(e.anchor.r, e.anchor.c, dp?.kind === 'dome' ? dp : { kind: 'dome', facing: 'right' });
            shuttleLanding = true;
            i++;
          } else {
            v.retexture(e.anchor.r, e.anchor.c, { kind: 'tile', tier: resultTier });
          }
          const strength = 1 + cascadeDepth * 0.4;
          flash(this.layers.fx, anchor.x, anchor.y, ts, strength);
          glowRing(this.layers.fx, anchor.x, anchor.y, ts * 1.1, TIER_ACCENT[resultTier]);
          glowRing(this.layers.fx, anchor.x, anchor.y, ts * 0.7, 0xffffff); // shockwave
          burst(this.layers.fx, anchor.x, anchor.y, ts, TIER_ACCENT[resultTier],
            Math.round(12 * strength));
          if (shuttleLanding || cascadeDepth >= 2) void this.shake(shuttleLanding ? 4 : 2.5);
          const sp = v.pieceAt(e.anchor.r, e.anchor.c);
          if (sp && shuttleLanding) {
            // the rescue shuttle LANDS: drops in from above with a dust burst
            const home = anchor.y;
            sp.y = home - ts * 2.2;
            sp.alpha = 0.6;
            await Promise.all([
              animate(sp, { y: home, alpha: 1 }, 300, inQuad),
            ]);
            sp.height = ts * 0.85;
            burst(this.layers.fx, anchor.x, anchor.y + ts * 0.3, ts, 0xd9d0b8, 16);
            await animate(sp, { height: ts }, 100, outBack);
          } else if (sp) {
            sp.width = ts * 0.4; sp.height = ts * 0.4;
            await animate(sp, { width: ts * 1.15, height: ts * 1.15 }, 120, outQuad);
            await animate(sp, { width: ts, height: ts }, 60, outBack);
          }
          break;
        }
        case 'fall': {
          // batch consecutive falls
          const batch: Extract<GameEvent, { type: 'fall' }>[] = [e];
          while (events[i + 1]?.type === 'fall') { batch.push(events[++i] as any); }
          cascadeDepth++;
          await Promise.all(batch.map(async (f) => {
            const sp = v.pieceAt(f.from.r, f.from.c);
            const riders = this.ridersAt(f.from.r, f.from.c);
            v.moveKey(f.from, f.to);
            if (!sp) return;
            const dst = v.cellCenter(f.to.r, f.to.c);
            const cells = Math.abs(f.to.r - f.from.r);
            const ms = Math.max(60, 60 * cells);
            // survivors ride their falling tile
            await Promise.all([
              animate(sp, { y: dst.y }, ms, inQuad),
              ...riders.map((rd) => animate(rd, { y: dst.y }, ms, inQuad)),
            ]);
            // landing squash
            sp.height = ts * 0.86;
            await animate(sp, { height: ts }, 80, outQuad);
          }));
          break;
        }
        case 'spawn': {
          const batch: Extract<GameEvent, { type: 'spawn' }>[] = [e];
          while (events[i + 1]?.type === 'spawn') { batch.push(events[++i] as any); }
          await Promise.all(batch.map(async (s) => {
            const startY = v.cellCenter(s.at.r, s.at.c).y - ts * 1.4;
            const sp = v.addPiece({ kind: 'tile', tier: s.tier }, s.at.r, s.at.c, startY);
            sp.alpha = 0.4;
            const dst = v.cellCenter(s.at.r, s.at.c);
            await Promise.all([
              animate(sp, { y: dst.y }, 160, outQuad),
              animate(sp, { alpha: 1 }, 160, outQuad),
            ]);
          }));
          break;
        }
        case 'survivorGrounded': {
          const node = v.survivorNode(e.id);
          if (node) {
            ripple(this.layers.fx, node.x, node.y + ts * 0.2, ts);
            await animate(node, { y: node.y - ts * 0.18 }, 120, outQuad);
            await animate(node, { y: node.y + ts * 0.18 }, 120, inQuad);
          }
          this.onSurvivorBeat('grounded', e.id);
          break;
        }
        case 'survivorHoused': {
          const node = v.survivorNode(e.id);
          if (node) {
            // boarding: walk to the nearest shuttle, shrink into the hatch, hatch flash
            let target: { x: number; y: number } | null = null;
            let best = Infinity;
            for (let r = 0; r < finalState.rows; r++)
              for (let c = 0; c < finalState.cols; c++)
                if (finalState.grid[r]![c]?.kind === 'dome') {
                  const p = v.cellCenter(r, c);
                  const d = Math.abs(p.x - node.x) + Math.abs(p.y - node.y);
                  if (d < best) { best = d; target = p; }
                }
            if (target) {
              await animate(node, { x: target.x, y: target.y + ts * 0.15 }, 260, outQuad);
              await animate(node.scale, { x: 0.1, y: 0.1 }, 180, inQuad);
              flash(this.layers.fx, target.x, target.y, ts * 0.7);
              burst(this.layers.fx, target.x, target.y - ts * 0.2, ts * 0.7, 0xffe066, 10);
              // shuttle acknowledges: happy hop
              const shuttleSp = v.pieceAt(
                Math.round((target.y - v.layout.originY - ts / 2) / (ts + v.layout.gap)),
                Math.round((target.x - v.layout.originX - ts / 2) / (ts + v.layout.gap)),
              );
              if (shuttleSp) {
                await animate(shuttleSp, { y: shuttleSp.y - ts * 0.1 }, 90, outQuad);
                await animate(shuttleSp, { y: shuttleSp.y + ts * 0.1 }, 110, inQuad);
              }
            } else {
              await animate(node, { alpha: 0 }, 250, outQuad);
            }
            // do NOT destroy here — syncFrom(finalState) removes housed survivors
            // (destroying twice throws a Pixi error)
          }
          this.onSurvivorBeat('housed', e.id);
          break;
        }
        case 'survivorLost': {
          const node = v.survivorNode(e.id);
          if (node) {
            await animate(node, { alpha: 0 }, 400, outQuad);
            // syncFrom removes lost survivors; don't double-destroy
          }
          this.onSurvivorBeat('lost', e.id);
          break;
        }
        case 'needTick': {
          v.updateNeed(e.id, e.movesLeft);
          this.onNeedTick(e.id, e.movesLeft);
          break;
        }
        case 'won':
        case 'lost': {
          await pause(250);
          this.onGameEnd(e.type);
          break;
        }
        case 'podCreated':
        case 'domeCreated':
          // normally consumed by the preceding merge; standalone: just fx
          flash(this.layers.fx, v.cellCenter(e.at.r, e.at.c).x, v.cellCenter(e.at.r, e.at.c).y, ts);
          break;
        case 'shuffle': {
          // gather all moving sprites first (simultaneous permutation), then glide
          const movers = e.moves
            .map((m) => ({ m, sp: v.pieceAt(m.from.r, m.from.c),riders:v.ridersAt(m.from.r,m.from.c) }))
            .filter((x) => !!x.sp);
          // keys are fixed up by the final syncFrom (shuffle ends the event run)
          await Promise.all(movers.map(async ({ m, sp,riders }) => {
            const dst = v.cellCenter(m.to.r, m.to.c);
            sp!.zIndex = 50;
            await Promise.all([animate(sp!, { x: dst.x, y: dst.y }, 380, outQuad),...riders.map(rd=>animate(rd,{x:dst.x,y:dst.y},380,outQuad))]);
            sp!.zIndex = 0;
          }));
          break;
        }
        case 'powerUp': {
          if (e.at) {
            const c = v.cellCenter(e.at.r, e.at.c);
            flash(this.layers.fx, c.x, c.y, ts * 1.3, 1.2);
            burst(this.layers.fx, c.x, c.y, ts * 1.2, 0xffe066, 14);
          } else {
            // wormhole: whole-board pulse
            flash(this.layers.fx, v.layout.originX + ts * 2.5,
              v.layout.originY + ts * 3, ts * 4, 0.6);
          }
          break;
        }
        case 'survivorPulled': {
          const node = v.survivorNode(e.id);
          if (node) {
            const dst = v.cellCenter(e.to.r, e.to.c);
            glowRing(this.layers.fx, dst.x, dst.y, ts, 0xffe066);
            await animate(node, { x: dst.x, y: dst.y }, 280, outQuad);
          }
          break;
        }
        case 'crystalHit':
        case 'reactorHit':
        case 'canisterHit': {
          const sp = v.overlayAt(e.at.r, e.at.c);
          if (sp) { const x0 = sp.x; await animate(sp, { x: x0 + ts * 0.05 }, 50); await animate(sp, { x: x0 }, 60); }
          break;
        }
        case 'crystalCleared':
        case 'reactorCleared':
        case 'canisterBroken': {
          const c = v.cellCenter(e.at.r, e.at.c);
          const sp = v.overlayAt(e.at.r, e.at.c);
          burst(this.layers.fx, c.x, c.y, ts, 0xffca6a, 14);
          flash(this.layers.fx, c.x, c.y, ts * 0.9);
          if (sp) { await animate(sp, { width: ts * 1.2, height: ts * 1.2, alpha: 0 }, 200, outQuad); }
          v.removeOverlayAt(e.at.r, e.at.c);
          break;
        }
        case 'reactorErupted': {
          const p=v.cellCenter(e.at.r,e.at.c);burst(this.layers.fx,p.x,p.y,ts*1.8,0xff6655,20);
          this.floatText('Overload!',p.x,p.y,ts);await pause(180);break;
        }
        case 'cometHit':
        case 'cometFreed': {
          for(const cell of e.cells){const p=v.cellCenter(cell.r,cell.c);burst(this.layers.fx,p.x,p.y,ts,0x99e7ff,8);if(e.type==='cometFreed')v.removeOverlayAt(cell.r,cell.c);}
          await pause(150);break;
        }
        case 'roverMoved': {
          const rover=v.roverAt(e.id),rider=v.survivorNode(e.riderId),p=v.cellCenter(e.to.r,e.to.c);
          await Promise.all([...(rover?[animate(rover,{x:p.x,y:p.y+ts*.14},200,outQuad)]:[]),...(rider?[animate(rider,{x:p.x,y:p.y},200,outQuad)]:[])]);break;
        }
        case 'points': {
          this.onPoints(e.amount);
          if (e.at) {
            const c = v.cellCenter(e.at.r, e.at.c);
            this.floatText(`+${e.amount}`, c.x, c.y - ts * 0.3, ts);
          }
          break;
        }
      }
    }
    check();this.view.syncFrom(finalState);this.finalState=undefined; // safety net
  }

  /** Quick board micro-shake for heavy impacts. */
  private async shake(intensity: number): Promise<void> {
    const token=this.generation;
    const targets = [this.layers.pieces, this.layers.actors];
    for (let i = 0; i < 4; i++) {
      if(token!==this.generation)return;
      const dx = (i % 2 === 0 ? 1 : -1) * intensity * (1 - i / 4);
      for (const t of targets) t.x = dx;
      await delay(30);
    }
    if(token===this.generation)for (const t of targets) t.x = 0;
  }

  private floatText(text: string, x: number, y: number, ts: number): void {
    const t = new Text({
      text,
      style: {
        fill: 0xaef0e8, fontSize: Math.max(11, ts * 0.26), fontWeight: '800',
        fontFamily: 'system-ui, sans-serif',
        stroke: { color: 0x0b0e1d, width: 3 },
      },
    });
    t.anchor.set(0.5);
    t.x = x; t.y = y;
    this.layers.fx.addChild(t);
    void tween(t, { y: y - ts * 0.7, alpha: 0 }, 650, outQuad).then(() => t.destroy());
  }
}
