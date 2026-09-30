import { findMatches, findJunctions } from './match';
import { createRng } from './rng';
import { chooseFacing } from './dome';
import type { GameEvent } from './events';
import type { BoardState, Piece, Pos, Tier } from './types';
import { MAX_TIER } from './types';

export function resolveMatchesOnce(
  state: BoardState, movedCell: Pos | null, events: GameEvent[],
): boolean {
  const matches = findMatches(state);
  const junctions = findJunctions(matches, movedCell);
  let any = false;
  // a door pointing at an overlay-held cell (crystal/box/reactor/comet) is
  // useless until that object clears — steer new stations away from them
  const overlayAt = (rr: number, cc: number) => !!state.overlays[rr]?.[cc];

  // Junctions (L/T/+) resolve first: a single merged result at the shared pivot.
  for (const j of junctions) {
    const live = j.cells.filter((p) => {
      const piece = state.grid[p.r]![p.c];
      return piece?.kind === 'tile' && piece.tier === j.tier;
    });
    if (live.length < 5) continue; // both arms must survive (3 + 3 - 1 shared)
    any = true;
    let result: Piece;
    if (j.tier >= 4) {
      const jr = createRng(state.rngState);
      result = { kind: 'dome', facing: chooseFacing(state.mask, state.rows, state.cols, j.pivot.r, j.pivot.c, jr.next(), overlayAt) };
      state.rngState = jr.state();
      events.push({ type: 'merge', cells: live, anchor: j.pivot, newTier: MAX_TIER });
      events.push({ type: 'domeCreated', at: j.pivot });
    } else {
      result = { kind: 'pod' };
      events.push({ type: 'merge', cells: live, anchor: j.pivot, newTier: (j.tier + 1) as Tier });
      events.push({ type: 'podCreated', at: j.pivot });
    }
    for (const p of live) state.grid[p.r]![p.c] = null;
    state.grid[j.pivot.r]![j.pivot.c] = result;
    for (const sv of state.survivors) {
      if (sv.state === 'housed' || sv.state === 'lost') continue;
      if (live.some((p) => p.r === sv.r && p.c === sv.c)) { sv.r = j.pivot.r; sv.c = j.pivot.c; }
    }
  }

  for (const m of matches) {
    // skip cells another match in this pass already cleared or replaced
    const live = m.cells.filter((p) => {
      const piece = state.grid[p.r]![p.c];
      return piece?.kind === 'tile' && piece.tier === m.tier;
    });
    if (live.length < 3) continue;
    any = true;
    const inMatch = (p: Pos | null) =>
      p !== null && live.some((q) => q.r === p.r && q.c === p.c);
    const anchor = inMatch(movedCell) ? movedCell! : live[Math.floor(live.length / 2)]!;
    let result: Piece;
    if (m.tier === MAX_TIER || (m.tier >= 4 && live.length >= 4)) {
      // matching living land builds a SPACE STATION (the rescue home) — a
      // survivor on its door cell is rescued in the settle pass
      const mr = createRng(state.rngState);
      result = { kind: 'dome', facing: chooseFacing(state.mask, state.rows, state.cols, anchor.r, anchor.c, mr.next(), overlayAt) };
      state.rngState = mr.state();
      events.push({ type: 'merge', cells: live, anchor, newTier: MAX_TIER });
      events.push({ type: 'domeCreated', at: anchor });
    } else {
      const newTier = (m.tier + 1) as Tier;
      result = live.length >= 4 ? { kind: 'pod' } : { kind: 'tile', tier: newTier };
      events.push({ type: 'merge', cells: live, anchor, newTier });
      if (result.kind === 'pod') events.push({ type: 'podCreated', at: anchor });
    }
    for (const p of live) state.grid[p.r]![p.c] = null;
    state.grid[anchor.r]![anchor.c] = result;
    // survivors standing on matched cells are swept onto the merged tile
    for (const sv of state.survivors) {
      if (sv.state === 'housed' || sv.state === 'lost') continue;
      if (live.some((p) => p.r === sv.r && p.c === sv.c)) { sv.r = anchor.r; sv.c = anchor.c; }
    }
  }
  return any;
}
