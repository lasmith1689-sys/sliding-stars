import { loadLevel } from '../../src/core/level';
import { applyGravity } from '../../src/core/gravity';
import type { GameEvent } from '../../src/core/events';
import type { LevelDef } from '../../src/core/types';

function make(mask: string[], tiles: string[], survivors: { r: number; c: number }[] = []) {
  const def: LevelDef = { id: 0, mask, tiles, survivors, goal: { type: 'rescueN', n: 0 }, seed: 1 };
  return loadLevel(def);
}

test('pieces fall into holes and new tier-1 tiles spawn at top', () => {
  const s = make(['#', '#', '#'], ['4', '1', '1']);
  s.grid[1]![0] = null; // simulate a merge hole in the middle
  const ev: GameEvent[] = [];
  applyGravity(s, ev);
  expect(s.grid[2]![0]).toEqual({ kind: 'tile', tier: 1 });
  expect(s.grid[1]![0]).toEqual({ kind: 'tile', tier: 4 });
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 1 }); // fresh spawn
  expect(ev.filter((e) => e.type === 'fall')).toHaveLength(1);
  expect(ev.filter((e) => e.type === 'spawn')).toHaveLength(1);
});

test('mask holes block falling; lower segment keeps its own pieces', () => {
  const s = make(['#', '.', '#'], ['3', '.', '2']);
  s.grid[0]![0] = null;
  const ev: GameEvent[] = [];
  applyGravity(s, ev);
  expect(s.grid[2]![0]).toEqual({ kind: 'tile', tier: 2 }); // unchanged below hole
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 1 }); // spawn fills top segment
});

test('survivor rides falling tile', () => {
  const s = make(['#', '#'], ['4', '1'], [{ r: 0, c: 0 }]);
  s.grid[1]![0] = null;
  applyGravity(s, []);
  expect(s.survivors[0]!.r).toBe(1);
});

test('segments below mask holes also refill from their own top', () => {
  const s = make(['#', '.', '#', '#'], ['3', '.', '2', '1']);
  s.grid[2]![0] = null; // merge hole inside the lower segment
  const ev: GameEvent[] = [];
  applyGravity(s, ev);
  expect(s.grid[2]![0]).not.toBeNull(); // refilled — in-mask cells never stay empty
  expect(s.grid[3]![0]).toEqual({ kind: 'tile', tier: 1 }); // untouched below
});

test('refill avoids completing an instant match (bumps tier 1 -> 2)', () => {
  // row0 will refill at (0,2); (0,0) and (0,1) are tier 1 — spawning tier 1
  // there would instantly re-match, so the spawner must pick tier 2
  const s = make(['###', '###'], ['113', '345']);
  s.grid[0]![2] = null;
  const ev: GameEvent[] = [];
  applyGravity(s, ev);
  const p = s.grid[0]![2]!;
  expect(p.kind).toBe('tile');
  if (p.kind === 'tile') expect(p.tier).toBe(2);
});
