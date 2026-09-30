import { loadLevel } from '../../src/core/level';
import { hasLegalMove, ensureLegalMoves } from '../../src/core/shuffle';
import { findMatches } from '../../src/core/match';
import { trySwap } from '../../src/core/game';
import type { GameEvent } from '../../src/core/events';
import type { LevelDef } from '../../src/core/types';

function make(tiles: string[], over: Partial<LevelDef> = {}) {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = {
    id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 1 }, seed: 7, ...over,
  };
  return loadLevel(def);
}

// period-3 diagonal stripes: no matches and no swap can create one
const DEAD = ['1231', '2312', '3123', '1231'];
// a board with an obvious available move (swap (0,0)<->(1,0) lines up row of 1s)
const ALIVE = ['211', '134', '425'];

test('hasLegalMove detects live and dead boards', () => {
  expect(hasLegalMove(make(ALIVE))).toBe(true);
  expect(hasLegalMove(make(DEAD))).toBe(false);
});

test('ensureLegalMoves shuffles a dead board into a playable, match-free one', () => {
  const s = make(DEAD);
  const ev: GameEvent[] = [];
  ensureLegalMoves(s, ev);
  const shuffles = ev.filter((e) => e.type === 'shuffle');
  expect(shuffles).toHaveLength(1);
  expect(hasLegalMove(s)).toBe(true);
  expect(findMatches(s)).toHaveLength(0);
});

test('ensureLegalMoves leaves a live board untouched', () => {
  const s = make(ALIVE);
  const before = JSON.stringify(s.grid);
  const ev: GameEvent[] = [];
  ensureLegalMoves(s, ev);
  expect(ev).toHaveLength(0);
  expect(JSON.stringify(s.grid)).toBe(before);
});

test('points are awarded for merges and rescues during a move', () => {
  const s = make(['313', '132', '245'], { survivors: [{ r: 0, c: 2 }], needMoves: 20 });
  const res = trySwap(s, { r: 1, c: 1 }, { r: 0, c: 1 }); // merge under the swimmer
  expect(res.legal).toBe(true);
  expect(res.state.points).toBeGreaterThan(0);
  expect(res.events.some((e) => e.type === 'points')).toBe(true);
});
