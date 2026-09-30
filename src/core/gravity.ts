import { createRng } from './rng';
import type { GameEvent } from './events';
import type { BoardState, Tier } from './types';

/** Would placing `tier` at (r,c) complete a 3-run with already-present tiles? */
function wouldMatch(state: BoardState, r: number, c: number, tier: Tier): boolean {
  const t = (rr: number, cc: number): number => {
    const p = state.grid[rr]?.[cc];
    return p && p.kind === 'tile' ? p.tier : -1;
  };
  // horizontal neighbors
  if (t(r, c - 1) === tier && t(r, c - 2) === tier) return true;
  if (t(r, c + 1) === tier && t(r, c + 2) === tier) return true;
  if (t(r, c - 1) === tier && t(r, c + 1) === tier) return true;
  // vertical (below only — above is still empty during refill)
  if (t(r + 1, c) === tier && t(r + 2, c) === tier) return true;
  return false;
}

export function applyGravity(state: BoardState, events: GameEvent[]): void {
  for (let c = 0; c < state.cols; c++) {
    // A cell is a barrier (splits the column, nothing falls through it) if it is
    // out of the mask OR holds a fixed space station (dome) — stations are
    // permanent fixtures, like Sliding Seas huts, so they never fall.
    const barrierOverlay = (r: number) => {
      const k = state.overlays[r]![c]?.kind;
      return k === 'crystal' || k === 'reactor' || k === 'comet' || k === 'canister';
    };
    const isBarrier = (r: number) =>
      r >= state.rows || state.mask[r]![c] !== true ||
      state.grid[r]![c]?.kind === 'dome' || barrierOverlay(r);
    let segStart = -1;
    const segments: Array<[number, number]> = [];
    for (let r = 0; r <= state.rows; r++) {
      const open = !isBarrier(r);
      if (open && segStart === -1) segStart = r;
      if (!open && segStart !== -1) { segments.push([segStart, r - 1]); segStart = -1; }
    }
    segments.forEach(([top, bottom]) => {
      let write = bottom;
      for (let r = bottom; r >= top; r--) {
        const piece = state.grid[r]![c] ?? null;
        if (piece !== null) {
          if (write !== r) {
            state.grid[write]![c] = piece;
            state.grid[r]![c] = null;
            for (const s of state.survivors) {
              if (s.r === r && s.c === c && s.state !== 'housed' && s.state !== 'lost') s.r = write;
            }
            events.push({ type: 'fall', from: { r, c }, to: { r: write, c } });
          }
          write--;
        }
      }
      // every segment refills from its own top edge — in-mask cells are never
      // left empty (the "blank" cells of a level are its out-of-mask holes);
      // spawned tiles are shallow (tier 1-2), picked to avoid instant re-matches
      {
        const rng = createRng(state.rngState);
        for (let r = write; r >= top; r--) {
          let tier: Tier = rng.next() < 0.75 ? 1 : 2;
          if (wouldMatch(state, r, c, tier)) tier = tier === 1 ? 2 : 1;
          if (wouldMatch(state, r, c, tier)) tier = 3; // both clash (rare)
          state.grid[r]![c] = { kind: 'tile', tier };
          events.push({ type: 'spawn', at: { r, c }, tier });
        }
        state.rngState = rng.state();
      }
    });
  }
}
