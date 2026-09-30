import { loadLevel } from '../../src/core/level';
import { resolveMatchesOnce } from '../../src/core/resolve';
import type { GameEvent } from '../../src/core/events';
import type { LevelDef } from '../../src/core/types';

function level(tiles: string[]): ReturnType<typeof loadLevel> {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = { id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 0 }, seed: 1 };
  return loadLevel(def);
}

test('3-match merges to next tier at moved cell, others become holes', () => {
  const s = level(['111', '234']);
  const ev: GameEvent[] = [];
  expect(resolveMatchesOnce(s, { r: 0, c: 2 }, ev)).toBe(true);
  expect(s.grid[0]![2]).toEqual({ kind: 'tile', tier: 2 });
  expect(s.grid[0]![0]).toBeNull();
  expect(s.grid[0]![1]).toBeNull();
  expect(ev[0]).toMatchObject({ type: 'merge', newTier: 2, anchor: { r: 0, c: 2 } });
});

test('anchor falls back to middle cell when moved cell not in match', () => {
  const s = level(['333', '124']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 1, c: 0 }, ev);
  expect(s.grid[0]![1]).toEqual({ kind: 'tile', tier: 4 });
});

test('a 4-match of danger terrain creates a safe pod', () => {
  const s = level(['2222', '1345']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 0, c: 0 }, ev);
  expect(s.grid[0]![0]).toEqual({ kind: 'pod' });
  expect(ev.some((e) => e.type === 'podCreated')).toBe(true);
});

test('matching living land (tier 5) builds a space station', () => {
  const s = level(['555', '124']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 0, c: 1 }, ev);
  expect(s.grid[0]![1]).toMatchObject({ kind: 'dome' }); // dome = space station
  expect(ev.some((e) => e.type === 'domeCreated')).toBe(true);
});

test('cascade 4-match also creates a pod at its middle anchor', () => {
  const s = level(['2222', '1345']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, null, ev);
  expect(ev.some((e) => e.type === 'podCreated')).toBe(true);
  expect(s.grid[0]![2]).toEqual({ kind: 'pod' });
});

test('survivor standing on a matched cell is swept to the anchor', () => {
  const s = loadLevel({
    id: 0, mask: ['###', '###'], tiles: ['333', '124'],
    survivors: [{ r: 0, c: 0 }], goal: { type: 'rescueN', n: 1 }, seed: 1,
  });
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, null, ev); // anchor = middle cell (0,1)
  expect(s.survivors[0]).toMatchObject({ r: 0, c: 1 });
});

test('returns false when nothing matches', () => {
  const s = level(['123', '452']);
  expect(resolveMatchesOnce(s, null, [])).toBe(false);
});

test('L junction of danger tiles creates a pod at the pivot', () => {
  const s = level(['222', '235', '245']);
  const ev: GameEvent[] = [];
  expect(resolveMatchesOnce(s, { r: 0, c: 0 }, ev)).toBe(true);
  expect(s.grid[0]![0]).toEqual({ kind: 'pod' });
  expect(s.grid[0]![1]).toBeNull();
  expect(s.grid[2]![0]).toBeNull();
  expect(ev.some((e) => e.type === 'merge' && e.anchor.r === 0 && e.anchor.c === 0)).toBe(true);
});

test('tier-5 junction builds a space station at the pivot', () => {
  const s = level(['555', '512', '534']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 0, c: 0 }, ev);
  expect(s.grid[0]![0]).toMatchObject({ kind: 'dome' });
  expect(ev.some((e) => e.type === 'domeCreated')).toBe(true);
});

test('survivor on a junction arm is swept to the pivot', () => {
  const s = loadLevel({
    id: 0, mask: ['###', '###', '###'], tiles: ['222', '235', '245'],
    survivors: [{ r: 2, c: 0 }], goal: { type: 'rescueN', n: 1 }, seed: 1,
  });
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 0, c: 0 }, ev);
  expect(s.survivors[0]).toMatchObject({ r: 0, c: 0 });
});

test('a new station faces away from a crystal so its door is usable', () => {
  // col-1 vertical 5-match -> dome at the middle (1,1); crystal freezes (1,0)
  const s = loadLevel({
    id: 0, mask: ['###', '###', '###'], tiles: ['252', '354', '251'],
    survivors: [], goal: { type: 'rescueN', n: 1 }, seed: 1,
    overlays: ['...', 'I..', '...'],
  });
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, null, ev);
  const dome = s.grid[1]![1]!;
  expect(dome).toMatchObject({ kind: 'dome', facing: 'right' }); // away from the crystal
});
