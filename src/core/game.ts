import { applyGravity } from './gravity';
import { resolveMatchesOnce } from './resolve';
import { ensureLegalMoves } from './shuffle';
import { doorCell } from './dome';
import { isLegalSwap } from './moves';
import type { GameEvent, PointReason } from './events';
import type { BoardState, Pos, Tier } from './types';

/** Points awarded per accomplishment (user-requested economy). */
export const POINTS: Record<PointReason, number> = {
  merge: 10,      // per tier of the merged result (x newTier)
  bigMerge: 20,   // bonus for joining 4+
  pod: 30,
  shuttle: 100,
  grounded: 50,
  rescued: 200,
  special: 40,
};

/** Scan a move's events and convert accomplishments into points events. */
function awardPoints(state: BoardState, events: GameEvent[]): void {
  const earned: GameEvent[] = [];
  for (const e of events) {
    if (e.type === 'merge') {
      earned.push({ type: 'points', amount: POINTS.merge * e.newTier, reason: 'merge', at: e.anchor });
      if (e.cells.length >= 4) {
        earned.push({ type: 'points', amount: POINTS.bigMerge, reason: 'bigMerge', at: e.anchor });
      }
    } else if (e.type === 'podCreated') {
      earned.push({ type: 'points', amount: POINTS.pod, reason: 'pod', at: e.at });
    } else if (e.type === 'domeCreated') {
      earned.push({ type: 'points', amount: POINTS.shuttle, reason: 'shuttle', at: e.at });
    } else if (e.type === 'survivorGrounded') {
      earned.push({ type: 'points', amount: POINTS.grounded, reason: 'grounded' });
    } else if (e.type === 'survivorHoused') {
      earned.push({ type: 'points', amount: POINTS.rescued, reason: 'rescued' });
    }
  }
  for (const e of earned) {
    if (e.type === 'points') state.points += e.amount;
    events.push(e);
  }
}

/**
 * Overlays react to the matches that just happened. A canister breaks when a
 * match lands on or orthogonally adjacent to its cell (multi-hp survives extra
 * hits); breaking one counts toward a collectN goal and awards points. (Crystal
 * damage is handled here too once that mechanic lands.)
 */
function damageOverlays(s: BoardState, events: GameEvent[]): void {
  const matched = new Set<string>();
  for (const e of events) {
    if (e.type === 'merge') for (const c of e.cells) matched.add(`${c.r},${c.c}`);
  }
  if (matched.size === 0) return;
  const nearMatch = (r: number, c: number) =>
    matched.has(`${r},${c}`) || matched.has(`${r - 1},${c}`) || matched.has(`${r + 1},${c}`) ||
    matched.has(`${r},${c - 1}`) || matched.has(`${r},${c + 1}`);
  // Each distinct merge this move counts as one "tile combination" of wear on a
  // box: a box takes 3 to break, and a big cascade can wear it faster.
  const merges: Set<string>[] = [];
  for (const e of events) {
    if (e.type === 'merge') {
      const set = new Set<string>();
      for (const cc of e.cells) set.add(`${cc.r},${cc.c}`);
      merges.push(set);
    }
  }
  const adjMergeCount = (r: number, c: number) => {
    const keys = [`${r},${c}`, `${r - 1},${c}`, `${r + 1},${c}`, `${r},${c - 1}`, `${r},${c + 1}`];
    return merges.reduce((n, m) => n + (keys.some((k) => m.has(k)) ? 1 : 0), 0);
  };
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const ov = s.overlays[r]![c];
      if (!ov || !nearMatch(r, c)) continue;
      if (ov.kind === 'canister') {
        ov.hp -= adjMergeCount(r, c);
        if (ov.hp <= 0) {
          s.overlays[r]![c] = null;
          s.collected++;
          events.push({ type: 'canisterBroken', at: { r, c } });
          events.push({ type: 'points', amount: POINTS.special, reason: 'special', at: { r, c } });
          s.points += POINTS.special;
        } else {
          events.push({ type: 'canisterHit', at: { r, c }, hp: ov.hp });
        }
      } else if (ov.kind === 'crystal') {
        ov.hp--;
        if (ov.hp <= 0) {
          s.overlays[r]![c] = null;
          events.push({ type: 'crystalCleared', at: { r, c } });
        } else {
          events.push({ type: 'crystalHit', at: { r, c }, hp: ov.hp });
        }
      } else if (ov.kind === 'reactor') {
        ov.hp--;
        if (ov.hp <= 0) {
          s.overlays[r]![c] = null;
          events.push({ type: 'reactorCleared', at: { r, c } });
        } else {
          events.push({ type: 'reactorHit', at: { r, c }, hp: ov.hp });
        }
      }
    }
  }
  // comets: a connected group shares one hp pool; one adjacent match damages the
  // whole group, and at 0 hp every cell of that comet frees together.
  const cometSeen = new Set<string>();
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (s.overlays[r]![c]?.kind !== 'comet' || cometSeen.has(`${r},${c}`)) continue;
      const group: Pos[] = [];
      const stack: Pos[] = [{ r, c }];
      while (stack.length) {
        const p = stack.pop()!;
        const key = `${p.r},${p.c}`;
        if (cometSeen.has(key)) continue;
        if (s.overlays[p.r]?.[p.c]?.kind !== 'comet') continue;
        cometSeen.add(key); group.push(p);
        stack.push({ r: p.r - 1, c: p.c }, { r: p.r + 1, c: p.c }, { r: p.r, c: p.c - 1 }, { r: p.r, c: p.c + 1 });
      }
      if (!group.some((p) => nearMatch(p.r, p.c))) continue;
      let hp = 0;
      for (const p of group) { const ov = s.overlays[p.r]![p.c]!; ov.hp--; hp = ov.hp; }
      if (hp <= 0) {
        for (const p of group) s.overlays[p.r]![p.c] = null;
        events.push({ type: 'cometFreed', cells: group });
      } else {
        events.push({ type: 'cometHit', cells: group, hp });
      }
    }
  }
}

export interface MoveResult { state: BoardState; events: GameEvent[]; legal: boolean }

const clone = <T>(x: T): T => structuredClone(x);
const adjacent = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

export function trySwap(state: BoardState, a: Pos, b: Pos): MoveResult {
  const reject = (): MoveResult =>
    ({ state, events: [{ type: 'swapRejected', a, b }], legal: false });
  if (!isLegalSwap(state, a, b)) return reject();
  if (!state.mask[a.r]?.[a.c] || !state.mask[b.r]?.[b.c]) return reject();
  const pa = state.grid[a.r]?.[a.c], pb = state.grid[b.r]?.[b.c];
  if (!pa || !pb) return reject(); // empty cell (e.g. a standalone break-box)
  const blocked = (p: Pos) => {
    const k = state.overlays[p.r]?.[p.c]?.kind;
    return k === 'crystal' || k === 'reactor' || k === 'comet' || k === 'canister';
  };
  if (blocked(a) || blocked(b)) return reject();
  // a Space Station (dome / "house") can't merge, but it CAN be slid around, so a
  // swap involving one is a valid move even when it produces no match
  const domeSwap = pa.kind !== 'tile' || pb.kind !== 'tile';

  const s = clone(state);
  const events: GameEvent[] = [];
  // swap pieces; survivors ride their piece (a's riders go to b and vice versa)
  s.grid[a.r]![a.c] = pb;
  s.grid[b.r]![b.c] = pa;
  for (const sv of s.survivors) {
    if (sv.state === 'housed' || sv.state === 'lost') continue;
    if (sv.r === a.r && sv.c === a.c) { sv.r = b.r; sv.c = b.c; }
    else if (sv.r === b.r && sv.c === b.c) { sv.r = a.r; sv.c = a.c; }
  }
  events.push({ type: 'swap', a, b });

  // snap-back rule: a normal swap must produce a match (a dome slide is exempt)
  const matched = resolveMatchesOnce(s, b, events);
  if (!matched && !domeSwap) {
    return {
      state,
      events: [{ type: 'swap', a, b }, { type: 'swapRejected', a: b, b: a }],
      legal: false,
    };
  }
  applyGravity(s, events);
  while (resolveMatchesOnce(s, null, events)) applyGravity(s, events);

  settle(s, events, true);
  return { state: s, events, legal: true };
}

/**
 * Each real move, every active reactor's fuse ticks down. On expiry it erupts:
 * orthogonally adjacent tiles drop one tier toward danger, any survivor beside
 * it that lands on unsafe ground (tier ≤ 3) drifts again, and the fuse resets.
 */
function tickReactors(s: BoardState, events: GameEvent[]): void {
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const ov = s.overlays[r]![c];
      if (!ov || ov.kind !== 'reactor') continue;
      ov.fuse--;
      if (ov.fuse > 0) continue;
      ov.fuse = ov.period;
      events.push({ type: 'reactorErupted', at: { r, c } });
      const neighbors: Pos[] = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];
      for (const n of neighbors) {
        const piece = s.grid[n.r]?.[n.c];
        if (!piece || piece.kind !== 'tile' || piece.tier <= 1) continue;
        piece.tier = (piece.tier - 1) as Tier;
        for (const sv of s.survivors) {
          if (sv.state === 'housed' || sv.state === 'lost') continue;
          if (sv.r === n.r && sv.c === n.c && piece.tier <= 3 && sv.state !== 'swimming') {
            sv.state = 'swimming';
            sv.need = { type: 'rescue', movesLeft: s.needMoves };
          }
        }
      }
    }
  }
}

/** A cell a rover may occupy: in-mask, in-bounds, not a station, not a blocked overlay. */
function roverPassable(s: BoardState, r: number, c: number): boolean {
  if (r < 0 || c < 0 || r >= s.rows || c >= s.cols) return false;
  if (!s.mask[r]![c]) return false;
  if (s.grid[r]![c]?.kind === 'dome') return false;
  const k = s.overlays[r]![c]?.kind;
  return !k;
}

/**
 * Each real move, every rover steps one cell toward the nearest Space Station
 * (dome) over passable cells, carrying its rider. When no station exists yet it
 * idles. Reaching a cell adjacent to a station lets the settle rescue pass house
 * the rider — rovers are safe platforms, so their riders never drift.
 */
function advanceRovers(s: BoardState, events: GameEvent[]): void {
  // rovers ferry their rider to a station's DOOR cell (the only rescue spot)
  const targets: Pos[] = [];
  for (let r = 0; r < s.rows; r++)
    for (let c = 0; c < s.cols; c++) {
      const p = s.grid[r]![c];
      if (p?.kind === 'dome') targets.push(doorCell(r, c, p.facing));
    }
  if (targets.length === 0) return;
  for (const rv of s.rovers) {
    const rider = s.survivors.find((v) => v.id === rv.riderId);
    if (!rider || rider.state === 'housed' || rider.state === 'lost') continue;
    const goal = new Set(targets.filter(p=>roverPassable(s,p.r,p.c)).map(p=>`${p.r},${p.c}`));
    const queue: {at:Pos; first:Pos|null}[] = [{at:{r:rv.r,c:rv.c},first:null}];
    const seen = new Set([`${rv.r},${rv.c}`]);
    for(let i=0;i<queue.length;i++) {
      const {at,first}=queue[i]!;
      if(goal.has(`${at.r},${at.c}`)) {
        if(first) {
          rv.r=first.r; rv.c=first.c; rider.r=first.r; rider.c=first.c;
          events.push({type:'roverMoved',id:rv.id,riderId:rv.riderId,to:first});
        }
        break;
      }
      for(const nx of [{r:at.r-1,c:at.c},{r:at.r,c:at.c+1},{r:at.r+1,c:at.c},{r:at.r,c:at.c-1}]) {
        const key=`${nx.r},${nx.c}`;
        if(seen.has(key)||!roverPassable(s,nx.r,nx.c)) continue;
        seen.add(key); queue.push({at:nx,first:first??nx});
      }
    }
  }
}

/**
 * Shared post-resolution passes: survivor grounding, shuttle boarding,
 * (optional) need ticks, point awards, win/loss, dead-board shuffle.
 * Used by trySwap (tickNeeds) and power-ups (no ticks).
 */
export function settle(s: BoardState, events: GameEvent[], tickNeeds: boolean): void {
  // rover riders ride the rover (entity layer), not the tile — undo any merge/
  // gravity displacement so a rider is always locked to its rover
  for (const rv of s.rovers) {
    const rider = s.survivors.find((v) => v.id === rv.riderId);
    if (rider && rider.state !== 'housed' && rider.state !== 'lost') { rider.r = rv.r; rider.c = rv.c; }
  }
  // rovers step toward their station first, on real moves only
  if (tickNeeds) advanceRovers(s, events);
  // overlay objects react to the matches that just resolved (from merge events)
  const collectedBefore = s.collected;
  damageOverlays(s, events);
  // A broken canister ("box") stands alone with no terrain beneath it, so once it
  // is gone its cell is genuinely empty. Collapse tiles into that gap and refill
  // from the top so the freed cell fills like any other tile, instead of lingering
  // as a hole until the next move. (Only canisters bump `collected`.)
  if (s.collected > collectedBefore) {
    applyGravity(s, events);
    while (resolveMatchesOnce(s, null, events)) applyGravity(s, events);
  }
  // Re-evaluate every survivor against the tile they are now on:
  //  - a space station (dome): RESCUED (they're home)
  //  - solid living land (tier >= 4) or a raft/pod: safe, timer paused, but NOT
  //    rescued yet — they still need a station (like Sliding Seas' huts)
  //  - a dangerous space tile (1-3): drifting, rescue timer runs
  for (const sv of s.survivors) {
    if (sv.state === 'housed' || sv.state === 'lost') continue;
    if (s.rovers.some((rv) => rv.riderId === sv.id)) continue; // safe aboard a rover
    const p = s.grid[sv.r]![sv.c];
    if (!p) continue;
    if (p.kind === 'dome') {
      sv.state = 'housed'; sv.need = null; s.rescued++;
      events.push({ type: 'survivorHoused', id: sv.id });
    } else if (p.kind === 'pod') {
      if (sv.state === 'swimming') events.push({ type: 'survivorGrounded', id: sv.id });
      sv.state = 'inPod'; sv.need = null;
    } else if (p.kind === 'tile' && p.tier >= 4) {
      if (sv.state === 'swimming') events.push({ type: 'survivorGrounded', id: sv.id });
      sv.state = 'grounded'; sv.need = null; // safe on land, waiting for a station
    } else {
      if (sv.state !== 'swimming') sv.state = 'swimming';
      if (!sv.need) sv.need = { type: 'rescue', movesLeft: s.needMoves };
    }
  }
  // Rescue happens only at a station's DOOR cell. A survivor standing on the
  // station tile itself was already housed in the loop above (p.kind === 'dome'),
  // which keeps a survivor fused into the house from being stranded there.
  const doorAt = new Set<string>();
  for (let r = 0; r < s.rows; r++)
    for (let c = 0; c < s.cols; c++) {
      const p = s.grid[r]![c];
      if (p?.kind === 'dome') { const d = doorCell(r, c, p.facing); doorAt.add(`${d.r},${d.c}`); }
    }
  for (const sv of s.survivors) {
    if (sv.state === 'housed' || sv.state === 'lost') continue;
    // rover riders included: a rover delivers its rider onto a station's door cell
    if (doorAt.has(`${sv.r},${sv.c}`)) {
      sv.state = 'housed'; sv.need = null; s.rescued++;
      events.push({ type: 'survivorHoused', id: sv.id });
    }
  }
  // retire rovers whose rider has made it home (or was lost)
  s.rovers = s.rovers.filter((rv) => {
    const rider = s.survivors.find((v) => v.id === rv.riderId);
    return rider !== undefined && rider.state !== 'housed' && rider.state !== 'lost';
  });
  if (tickNeeds) {
    tickReactors(s, events);
    for (const sv of s.survivors) {
      if (!sv.need || sv.state === 'lost') continue;
      sv.need.movesLeft--;
      events.push({ type: 'needTick', id: sv.id, movesLeft: sv.need.movesLeft });
      if (sv.need.movesLeft <= 0) {
        sv.state = 'lost'; sv.need = null;
        events.push({ type: 'survivorLost', id: sv.id });
      }
    }
  }
  // turn budget (only real moves consume turns; power-ups don't)
  if (tickNeeds && s.movesLeft !== null) s.movesLeft--;
  awardPoints(s, events);
  const goalMet = s.goal.type === 'collectN' ? s.collected >= s.goal.n : s.rescued >= s.goal.n;
  if (s.survivors.some((sv) => sv.state === 'lost')) {
    s.status = 'lost'; events.push({ type: 'lost' });
  } else if (goalMet) {
    s.status = 'won'; events.push({ type: 'won' });
  } else if (s.movesLeft !== null && s.movesLeft <= 0) {
    s.status = 'lost'; events.push({ type: 'lost' }); // out of turns
  }
  // never leave the player staring at a dead board
  if (s.status === 'playing') ensureLegalMoves(s, events);
}
