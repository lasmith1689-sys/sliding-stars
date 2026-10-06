import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { trySwap, type BoardState, type MoveResult, type Pos } from '../core';
import {canSlide} from '../core/moves';
import type { BoardView } from '../render/boardView';

/**
 * Drag state machine: idle -> armed -> dragging -> released.
 * The grabbed tile lifts and follows the finger clamped to +-1 cell along the
 * locked axis; the displaced neighbor mirrors it (swap preview). Release at
 * >=50% displacement commits through trySwap; otherwise both snap back.
 * Commits queue FIFO while animations are in flight — never dropped.
 */
export function attachDrag(
  app: Application,
  view: BoardView,
  getState: () => BoardState,
  onMove: (a:Pos,b:Pos) => void,
  isLocked: () => boolean = () => false,
  preview: (a:Pos|null,b:Pos|null)=>void = ()=>{},
): ()=>void {
  const DIR_LOCK = 0.12;   // fraction of tileSize before direction locks
  const COMMIT_AT = 0.5;   // fraction of tileSize to commit on release

  type Drag = {
    from: Pos;
    to: Pos | null;         // locked neighbor
    startX: number; startY: number;
    axis: 'h' | 'v' | null;
    riders: Container[];       // survivors standing on the dragged tile
    toRiders: Container[];     // survivors on the current preview neighbor
  };
  let drag: Drag | null = null;

  const stage = app.stage;
  stage.eventMode = 'static';
  stage.hitArea = app.screen;

  const tileCenter = (p: Pos) => {
    const { x, y } = view.cellXY(p.r, p.c);
    return { x: x + view.layout.tileSize / 2, y: y + view.layout.tileSize / 2 };
  };

  const liftedZ = (p: Pos, lifted: boolean) => {
    const sp = view.pieceAt(p.r, p.c);
    if (!sp) return;
    sp.zIndex = lifted ? 100 : 0;
    sp.scale.set((view.layout.tileSize / sp.texture.width) * (lifted ? 1.06 : 1));
  };

  const resetSprites = (d: Drag) => {
    const home = tileCenter(d.from);
    const sp = view.pieceAt(d.from.r, d.from.c);
    if (sp) { sp.x = home.x; sp.y = home.y; }
    for (const rd of d.riders) { rd.x = home.x; rd.y = home.y; }
    liftedZ(d.from, false);
    if (d.to) {
      const nb = tileCenter(d.to);
      const nsp = view.pieceAt(d.to.r, d.to.c);
      if (nsp) { nsp.x = nb.x; nsp.y = nb.y; }
      for (const rd of d.toRiders) { rd.x = nb.x; rd.y = nb.y; }
    }
  };

  const swappable = canSlide;

  stage.on('pointerdown', (e: FederatedPointerEvent) => {
    if (drag || isLocked()) return;
    const state = getState();
    if (state.status !== 'playing') return;
    const cell = view.cellAt(e.globalX, e.globalY);
    if (!cell || !swappable(state, cell)) return;
    drag = {
      from: cell, to: null, startX: e.globalX, startY: e.globalY, axis: null,
      riders: view.ridersAt(cell.r, cell.c), toRiders: [],
    };
    view.layers.pieces.sortableChildren = true;
    liftedZ(cell, true);
  });

  stage.on('pointermove', (e: FederatedPointerEvent) => {
    if (!drag) return;
    const state = getState();
    const ts = view.layout.tileSize;
    const dx = e.globalX - drag.startX;
    const dy = e.globalY - drag.startY;

    if (!drag.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < ts * DIR_LOCK) return;
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
    }
    // choose neighbor by current sign along locked axis
    const delta = drag.axis === 'h' ? dx : dy;
    const sign = delta >= 0 ? 1 : -1;
    const to: Pos = drag.axis === 'h'
      ? { r: drag.from.r, c: drag.from.c + sign }
      : { r: drag.from.r + sign, c: drag.from.c };
    if (drag.to && (drag.to.r !== to.r || drag.to.c !== to.c)) {
      // direction flipped: restore previous neighbor and its riders
      const nb = tileCenter(drag.to);
      const nsp = view.pieceAt(drag.to.r, drag.to.c);
      if (nsp) { nsp.x = nb.x; nsp.y = nb.y; }
      for (const rd of drag.toRiders) { rd.x = nb.x; rd.y = nb.y; }
      drag.toRiders = [];
    }
    const newTo = swappable(state, to) ? to : null;
    if (newTo && (!drag.to || drag.to.r !== newTo.r || drag.to.c !== newTo.c)) {
      drag.toRiders = view.ridersAt(newTo.r, newTo.c);
    } else if (!newTo) {
      drag.toRiders = [];
    }
    drag.to = newTo;
    preview(drag.from,newTo);

    const clamped = Math.max(-ts, Math.min(ts, delta));
    const allowed = drag.to ? clamped : clamped * 0.15; // rubber-band against walls
    const home = tileCenter(drag.from);
    const ox = drag.axis === 'h' ? allowed : 0;
    const oy = drag.axis === 'v' ? allowed : 0;
    const sp = view.pieceAt(drag.from.r, drag.from.c);
    if (sp) { sp.x = home.x + ox; sp.y = home.y + oy; }
    // survivors are attached to their tile — they move with it in real time
    for (const rd of drag.riders) { rd.x = home.x + ox; rd.y = home.y + oy; }
    if (drag.to) {
      const nb = tileCenter(drag.to);
      const nsp = view.pieceAt(drag.to.r, drag.to.c);
      if (nsp) { nsp.x = nb.x - ox; nsp.y = nb.y - oy; }
      for (const rd of drag.toRiders) { rd.x = nb.x - ox; rd.y = nb.y - oy; }
    }
  });

  const finish = (e: FederatedPointerEvent) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    const ts = view.layout.tileSize;
    const delta = d.axis === 'h' ? e.globalX - d.startX : e.globalY - d.startY;
    const commit = d.to !== null && d.axis !== null && Math.abs(delta) >= ts * COMMIT_AT;
    resetSprites(d);
    preview(null,null);
    if (commit && d.to && !isLocked()) onMove(d.from,d.to);
    else view.syncFrom(getState());
  };

  stage.on('pointerup', finish);
  stage.on('pointerupoutside', finish);
  const cancel=()=>{if(drag)resetSprites(drag);drag=null;preview(null,null);view.syncFrom(getState());};
  stage.on('pointercancel',cancel);
  return cancel;
}
