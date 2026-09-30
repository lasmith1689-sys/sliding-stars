import { loadLevel } from '../../src/core/level';
import { trySwap } from '../../src/core/game';
import { findMatches } from '../../src/core/match';
import { applyGravity } from '../../src/core/gravity';
import type { GameEvent } from '../../src/core/events';
import type { LevelDef } from '../../src/core/types';

function make(tiles: string[], over: Partial<LevelDef> = {}) {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = {
    id: 0, mask, tiles, survivors: [], goal: { type: 'collectN', n: 1 }, seed: 3, ...over,
  };
  return loadLevel(def);
}

test('level parses overlay grid into canisters and crystals with hp', () => {
  const s = make(['123', '451', '231'], { overlays: ['C..', '.I.', '...'] });
  expect(s.overlays[0]![0]).toEqual({ kind: 'canister', hp: 3 });
  expect(s.overlays[1]![1]).toEqual({ kind: 'crystal', hp: 1 });
  expect(s.overlays[0]![1]).toBeNull();
});

test('overlay grid is one-char-per-cell; box hp 3, crystal hp 1', () => {
  const s = make(['12', '34'], { overlays: ['CI', '..'] });
  expect(s.overlays[0]![0]).toEqual({ kind: 'canister', hp: 3 });
  expect(s.overlays[0]![1]).toEqual({ kind: 'crystal', hp: 1 });
});

test('a fresh box starts at 3 wear and survives a single adjacent match', () => {
  const s = make(MATCH_COL0, { overlays: ['.C.', '...', '...'], goal: { type: 'collectN', n: 1 } });
  expect(s.overlays[0]![1]).toEqual({ kind: 'canister', hp: 3 });
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // one adjacent match
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![1]).toEqual({ kind: 'canister', hp: 2 });
  expect(res.state.collected).toBe(0);
  expect(res.events.some((e) => e.type === 'canisterHit')).toBe(true);
});

// Deterministic board: swapping (2,0)<->(2,1) makes col0 = 1,1,1 (a match).
// Matched cells: (0,0),(1,0),(2,0). No matches exist at load.
const MATCH_COL0: string[] = ['123', '132', '214'];

test('a standalone break-box has no terrain under it and breaks on an adjacent match', () => {
  const s = make(MATCH_COL0, { overlays: ['.C.', '...', '...'], goal: { type: 'collectN', n: 1 } });
  s.overlays[0]![1] = { kind: 'canister', hp: 1 }; // pre-worn: one match from breaking
  expect(s.grid[0]![1]).toBeNull(); // no tile beneath the box
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // col0 -> 1,1,1, adjacent to (0,1)
  expect(res.legal).toBe(true);
  expect(res.events.some((e) => e.type === 'canisterBroken')).toBe(true);
  expect(res.state.collected).toBe(1);
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.state.status).toBe('won');
});

test('a broken box fills its cell like any other tile (no lingering hole)', () => {
  const s = make(MATCH_COL0, { overlays: ['.C.', '...', '...'], goal: { type: 'collectN', n: 1 } });
  s.overlays[0]![1] = { kind: 'canister', hp: 1 }; // pre-worn: one match from breaking
  expect(s.grid[0]![1]).toBeNull(); // empty while the box is intact
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // col0 -> 1,1,1, breaks the box at (0,1)
  expect(res.legal).toBe(true);
  expect(res.events.some((e) => e.type === 'canisterBroken')).toBe(true);
  expect(res.state.overlays[0]![1]).toBeNull(); // overlay removed
  expect(res.state.grid[0]![1]).not.toBeNull(); // cell no longer a hole
  expect(res.state.grid[0]![1]!.kind).toBe('tile'); // filled with a normal, playable tile
});

test('a standalone break-box is a gravity barrier (its cell stays empty)', () => {
  const s = make(['1', '2', '3'], { overlays: ['C', '.', '.'] });
  expect(s.grid[0]![0]).toBeNull();
  const ev: GameEvent[] = [];
  applyGravity(s, ev);
  expect(s.grid[0]![0]).toBeNull(); // barrier: not refilled by gravity
});

test('a canister ADJACENT to a matched cell also breaks', () => {
  const s = make(MATCH_COL0, { overlays: ['.C.', '...', '...'], goal: { type: 'collectN', n: 2 } });
  s.overlays[0]![1] = { kind: 'canister', hp: 1 }; // pre-worn: one match from breaking
  // canister at (0,1) is orthogonally adjacent to matched (0,0)
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 });
  expect(res.legal).toBe(true);
  expect(res.state.collected).toBe(1);
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.state.status).toBe('playing'); // goal is 2, only 1 broken
});

test('multi-hp break-box survives one adjacent hit, breaks on the second', () => {
  const s = make(MATCH_COL0, { overlays: ['.C.', '...', '...'], goal: { type: 'collectN', n: 1 } });
  s.overlays[0]![1] = { kind: 'canister', hp: 2 }; // tougher box set directly
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // col0 match adjacent to (0,1)
  expect(res.legal).toBe(true);
  // one match hit -> hp 2->1, not yet broken
  expect(res.state.overlays[0]![1]).toEqual({ kind: 'canister', hp: 1 });
  expect(res.state.collected).toBe(0);
  expect(res.events.some((e) => e.type === 'canisterHit')).toBe(true);
});

test('a match far from a canister leaves it intact', () => {
  const s = make(MATCH_COL0, { overlays: ['..C', '...', '...'], goal: { type: 'collectN', n: 1 } });
  // canister at (0,2) is not adjacent to any matched col0 cell
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 });
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![2]).toEqual({ kind: 'canister', hp: 3 });
  expect(res.state.collected).toBe(0);
});

test('a crystal cell cannot be swapped', () => {
  const s = make(['123', '451', '231'], { overlays: ['I..', '...', '...'] });
  const res = trySwap(s, { r: 0, c: 0 }, { r: 0, c: 1 });
  expect(res.legal).toBe(false);
});

test('a crystal thaws when a match lands orthogonally adjacent', () => {
  const s = make(MATCH_COL0, { overlays: ['.I.', '...', '...'], goal: { type: 'rescueN', n: 0 } });
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 });
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.events.some((e) => e.type === 'crystalCleared')).toBe(true);
});

test('a frozen (crystal) tile does not participate in matches', () => {
  const s = make(['111', '234', '235'], { overlays: ['.I.', '...', '...'] });
  // row 0 would be a tier-1 3-run, but the middle is frozen -> no match
  expect(findMatches(s)).toHaveLength(0);
});

test('a crystal is an immovable barrier for gravity', () => {
  const s = make(['1', '2', '3'], { overlays: ['I', '.', '.'] });
  s.grid[1]![0] = null; s.grid[2]![0] = null;
  const ev: GameEvent[] = [];
  applyGravity(s, ev);
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 1 });
});

test('level parses V into a reactor with fuse and hp', () => {
  const s = make(['123', '451', '231'], { overlays: ['V..', '...', '...'] });
  expect(s.overlays[0]![0]).toMatchObject({ kind: 'reactor', hp: 2, fuse: 4, period: 4 });
});

test('a reactor is unswappable and neutralizes on adjacent match', () => {
  const s = make(MATCH_COL0, { overlays: ['.V.', '...', '...'], goal: { type: 'rescueN', n: 0 } });
  s.overlays[0]![1] = { kind: 'reactor', hp: 1, fuse: 4, period: 4 };
  expect(trySwap(s, { r: 0, c: 1 }, { r: 0, c: 2 }).legal).toBe(false); // unswappable
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // match col0, adjacent to (0,1)
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.events.some((e) => e.type === 'reactorCleared')).toBe(true);
});

test('a reactor erupts on fuse expiry, downgrading a neighbor tile', () => {
  // reactor at (1,2) so it is NOT in the col0 match (a reactor cell is inert)
  const s = make(MATCH_COL0, { overlays: ['...', '..V', '...'], goal: { type: 'rescueN', n: 0 } });
  s.overlays[1]![2] = { kind: 'reactor', hp: 5, fuse: 1, period: 4 };
  const before = (s.grid[1]![1] as { tier: number }).tier; // west neighbor of the reactor
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // a legal move ticks the fuse
  expect(res.legal).toBe(true);
  expect(res.events.some((e) => e.type === 'reactorErupted')).toBe(true);
  expect((res.state.overlays[1]![2] as { fuse: number }).fuse).toBe(4); // reset to period
  expect((res.state.grid[1]![1] as { tier: number }).tier).toBe(before - 1); // knocked down
});

test('level parses W into a comet segment with shared hp', () => {
  const s = make(['123', '451', '231'], { overlays: ['WW.', '...', '...'] });
  expect(s.overlays[0]![0]).toMatchObject({ kind: 'comet', hp: 3 });
  expect(s.overlays[0]![1]).toMatchObject({ kind: 'comet', hp: 3 });
});

test('a comet takes shared damage from an adjacent match and frees together', () => {
  const s = make(MATCH_COL0, { overlays: ['.W.', '.W.', '...'], goal: { type: 'rescueN', n: 0 } });
  s.overlays[0]![1] = { kind: 'comet', hp: 1 };
  s.overlays[1]![1] = { kind: 'comet', hp: 1 };
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // col0 match adjacent to (0,1)&(1,1)
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.state.overlays[1]![1]).toBeNull();
  expect(res.events.some((e) => e.type === 'cometFreed')).toBe(true);
});
