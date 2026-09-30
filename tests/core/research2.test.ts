import { loadLevel } from '../../src/core/level';
import { trySwap } from '../../src/core/game';
import { findHint } from '../../src/core/shuffle';
import { buyPowerUp, usePowerUp, POWER_UP_COST } from '../../src/core/powerups';
import type { LevelDef } from '../../src/core/types';

function make(tiles: string[], over: Partial<LevelDef> = {}) {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = {
    id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 5 }, seed: 3, ...over,
  };
  return loadLevel(def);
}

/* ---------------------------- move limits ---------------------------- */

test('move-limited level counts down and fails at zero', () => {
  const s = make(['211', '134', '425'], { moveLimit: 1 });
  expect(s.movesLeft).toBe(1);
  const res = trySwap(s, { r: 0, c: 0 }, { r: 1, c: 0 }); // makes row of 1s
  expect(res.legal).toBe(true);
  expect(res.state.movesLeft).toBe(0);
  expect(res.state.status).toBe('lost'); // goal unmet, out of turns
  expect(res.events.some((e) => e.type === 'lost')).toBe(true);
});

test('rejected swaps do not consume turns; unlimited levels have null movesLeft', () => {
  const s = make(['211', '134', '425'], { moveLimit: 5 });
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // no match
  expect(res.legal).toBe(false);
  expect(res.state.movesLeft).toBe(5);
  expect(make(['211', '134', '425']).movesLeft).toBeNull();
});

/* ------------------------------- hints ------------------------------- */

test('findHint returns a swap that produces a match', () => {
  const s = make(['211', '134', '425']);
  const hint = findHint(s);
  expect(hint).not.toBeNull();
  const res = trySwap(s, hint![0], hint![1]);
  expect(res.legal).toBe(true);
});

test('findHint returns null on a dead board', () => {
  const s = make(['1231', '2312', '3123', '1231']);
  expect(findHint(s)).toBeNull();
});

/* ----------------------- power-up inventory model ----------------------- */

test('buyPowerUp deducts crystals; usePowerUp no longer charges', () => {
  const s = make(['1231', '2312', '3123', '1231']);
  s.points = 500;
  const buy = buyPowerUp(s, 'wormhole');
  expect(buy.legal).toBe(true);
  expect(buy.state.points).toBe(500 - POWER_UP_COST.wormhole);
  // using is free (inventory consumption is the UI's job)
  const use = usePowerUp(buy.state, 'wormhole');
  expect(use.legal).toBe(true);
  expect(use.state.points).toBe(500 - POWER_UP_COST.wormhole);
});

test('buyPowerUp rejects when unaffordable', () => {
  const s = make(['1231', '2312', '3123', '1231']);
  s.points = 10;
  expect(buyPowerUp(s, 'demo').legal).toBe(false);
});
