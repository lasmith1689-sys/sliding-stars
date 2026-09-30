import { loadLevel } from '../../src/core/level';
import type { LevelDef } from '../../src/core/types';

const def: LevelDef = {
  id: 1,
  mask: ['###', '###', '.##'],
  tiles: ['123', '45R', '.PD'],
  survivors: [{ r: 0, c: 0 }, { r: 1, c: 0 }],
  goal: { type: 'rescueN', n: 2 },
  seed: 9,
};

test('loads grid with tiers, pod, dome, and randoms', () => {
  const s = loadLevel(def);
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 1 });
  expect(s.grid[1]![1]).toEqual({ kind: 'tile', tier: 5 });
  expect(s.grid[2]![1]).toEqual({ kind: 'pod' });
  expect(s.grid[2]![2]).toMatchObject({ kind: 'dome' });
  expect(s.grid[2]![0]).toBeNull();
  const r = s.grid[1]![2]!;
  expect(r.kind).toBe('tile');
  if (r.kind === 'tile') expect(r.tier).toBeLessThanOrEqual(3);
});

test('survivor on water swims with rescue need; on land grounded with none', () => {
  const s = loadLevel(def);
  expect(s.survivors[0]).toMatchObject({ state: 'swimming', need: { type: 'rescue', movesLeft: 12 } });
  expect(s.survivors[1]).toMatchObject({ state: 'grounded', need: null });
});

test('rejects survivor outside mask', () => {
  expect(() => loadLevel({ ...def, survivors: [{ r: 2, c: 0 }] })).toThrow(/mask/i);
});
