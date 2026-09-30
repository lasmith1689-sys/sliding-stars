import { loadLevel } from '../../src/core/level';
import { findMatches, findJunctions } from '../../src/core/match';
import type { LevelDef } from '../../src/core/types';

function level(tiles: string[]): ReturnType<typeof loadLevel> {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = { id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 0 }, seed: 1 };
  return loadLevel(def);
}

test('finds a horizontal run of 3', () => {
  const m = findMatches(level(['111', '234', '345']));
  expect(m).toHaveLength(1);
  expect(m[0]).toMatchObject({ tier: 1, dir: 'h' });
  expect(m[0]!.cells).toEqual([{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }]);
});

test('finds maximal vertical run of 4, not two overlapping 3s', () => {
  const m = findMatches(level(['21', '22', '23', '24']));
  const vert = m.filter((x) => x.dir === 'v');
  expect(vert).toHaveLength(1);
  expect(vert[0]!.cells).toHaveLength(4);
});

test('pods and domes never match; different tiers never match', () => {
  expect(findMatches(level(['PPP', 'DDD', '123']))).toHaveLength(0);
});

test('no match across mask holes', () => {
  const s = loadLevel({
    id: 0, mask: ['#.#', '###'], tiles: ['1.1', '111'],
    survivors: [], goal: { type: 'rescueN', n: 0 }, seed: 1,
  });
  const m = findMatches(s);
  expect(m).toHaveLength(1);
  expect(m[0]!.dir).toBe('h');
});

test('L shape (shared corner) is one junction with pivot at the corner', () => {
  const s = level(['222', '235', '245']);
  const js = findJunctions(findMatches(s), { r: 0, c: 0 });
  expect(js).toHaveLength(1);
  expect(js[0]!.tier).toBe(2);
  expect(js[0]!.pivot).toEqual({ r: 0, c: 0 });
  expect(js[0]!.cells).toHaveLength(5); // 3 + 3 - 1 shared
});

test('T shape junction; pivot prefers the moved cell', () => {
  const s = level(['333', '131', '131']);
  const js = findJunctions(findMatches(s), { r: 0, c: 1 });
  expect(js).toHaveLength(1);
  expect(js[0]!.pivot).toEqual({ r: 0, c: 1 });
  expect(js[0]!.cells).toHaveLength(5);
});

test('a straight run with no perpendicular partner is NOT a junction', () => {
  const s = level(['111', '234', '235']);
  expect(findJunctions(findMatches(s), { r: 0, c: 0 })).toHaveLength(0);
});
