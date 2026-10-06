import { loadLevel } from './level';
import { trySwap, type MoveResult } from './game';
import type { BoardState, LevelDef, Pos } from './types';
import {doorCell} from './dome';

export type SolveResult = { solved: boolean; moves: number };

function score(res: MoveResult): number {
  if (res.state.status === 'won') return Number.POSITIVE_INFINITY;
  if (res.state.status === 'lost') return Number.NEGATIVE_INFINITY;
  let sc = 0;
  for (const e of res.events) {
    if (e.type === 'survivorHoused') sc += 1500;
    else if (e.type === 'domeCreated') sc += 700; // building a station is progress
    else if (e.type === 'podCreated') sc += 180;
    else if (e.type === 'survivorGrounded') sc += 400;
    else if (e.type === 'canisterBroken') sc += 900; // pursue collectN goals
    else if (e.type === 'canisterHit') sc += 300;
    else if (e.type === 'crystalCleared') sc += 250; // unblock frozen tiles
    else if (e.type === 'cometFreed') sc += 300;
    else if (e.type === 'cometHit') sc += 120;
    else if (e.type === 'reactorCleared') sc += 350;
    else if (e.type === 'reactorHit') sc += 150;
    else if (e.type === 'reactorErupted') sc -= 250;
    else if (e.type === 'merge') sc += 50 * e.newTier;
  }
  if (res.state.survivors.some((s) => s.need && s.need.movesLeft <= 2)) sc -= 200;
  const st = res.state;
  const tierAt = (r: number, c: number): number => {
    const p = st.grid[r]?.[c];
    return p?.kind === 'tile' ? p.tier : p?.kind === 'pod' ? 3.5 : p?.kind === 'dome' ? 6 : 0;
  };
  // collect stations, and steer un-rescued survivors toward them (or, if none
  // exist yet, reward building the ground under them up toward living land)
  const stations: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < st.rows; r++)
    for (let c = 0; c < st.cols; c++)
      {const piece=st.grid[r]![c];if(piece?.kind==='dome')stations.push(doorCell(r,c,piece.facing));}
  for (const sv of st.survivors) {
    if (sv.state === 'housed' || sv.state === 'lost') continue;
    sc += 40 * tierAt(sv.r, sv.c); // higher ground under them = closer to a station
    if (stations.length > 0) {
      const d = Math.min(...stations.map((p) => Math.abs(p.r - sv.r) + Math.abs(p.c - sv.c)));
      sc -= 80 * d; // reward being near a station
    }
  }
  // steer matches toward remaining canisters (for collectN goals)
  if (st.goal.type === 'collectN') {
    let left = 0;
    for (let r = 0; r < st.rows; r++)
      for (let c = 0; c < st.cols; c++)
        if (st.overlays[r]![c]?.kind === 'canister') left++;
    sc -= 60 * left;
  }
  return sc;
}

function* legalPairs(state: BoardState): Generator<[Pos, Pos]> {
  for (let r = 0; r < state.rows; r++)
    for (let c = 0; c < state.cols; c++) {
      if (!state.mask[r]![c]) continue;
      if (state.mask[r]?.[c + 1]) yield [{ r, c }, { r, c: c + 1 }];
      if (state.mask[r + 1]?.[c]) yield [{ r, c }, { r: r + 1, c }];
    }
}

export function solve(def: LevelDef, maxMoves: number): SolveResult {
  let state = loadLevel(def);
  const positionKey=(s:BoardState)=>JSON.stringify({grid:s.grid,overlays:s.overlays,survivors:s.survivors.map(v=>({id:v.id,r:v.r,c:v.c,state:v.state})),rovers:s.rovers,collected:s.collected});
  const visited=new Set([positionKey(state)]);
  for (let mv = 1; mv <= maxMoves; mv++) {
    let best: MoveResult | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const [a, b] of legalPairs(state)) {
      const res = trySwap(state, a, b);
      if (!res.legal) continue;
      if(res.state.status!=='won'&&visited.has(positionKey(res.state)))continue;
      const sc = score(res);
      if (sc > bestScore) { bestScore = sc; best = res; }
    }
    if (!best) return { solved: false, moves: mv - 1 }; // no legal moves at all
    state = best.state;
    visited.add(positionKey(state));
    if (state.status === 'won') return { solved: true, moves: mv };
    if (state.status === 'lost') return { solved: false, moves: mv };
  }
  return { solved: false, moves: maxMoves };
}
