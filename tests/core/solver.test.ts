import { solve } from '../../src/core/solver';
import type { LevelDef } from '../../src/core/types';

const winnable: LevelDef = {
  id: 1,
  mask: ['####', '####', '####'],
  tiles: ['4D44', '3323', '1212'],
  survivors: [{ r: 0, c: 0 }],   // grounded next to dome -> housed on first legal move
  goal: { type: 'rescueN', n: 1 },
  seed: 3,
};

test('solver wins a trivially winnable level', () => {
  const res = solve(winnable, 10);
  expect(res.solved).toBe(true);
  expect(res.moves).toBeLessThanOrEqual(10);
});

test('solver reports failure within budget on an impossible goal', () => {
  const res = solve({ ...winnable, survivors: [], goal: { type: 'rescueN', n: 5 } }, 3);
  expect(res.solved).toBe(false);
});
