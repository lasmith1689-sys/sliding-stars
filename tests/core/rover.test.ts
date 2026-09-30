import { loadLevel } from '../../src/core/level';
import { settle } from '../../src/core/game';
import type { LevelDef } from '../../src/core/types';

function make(tiles: string[], over: Partial<LevelDef> = {}) {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = { id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 1 }, seed: 3, ...over };
  return loadLevel(def);
}

test('a rover spawns a grounded rider at its cell', () => {
  const s = make(['123', '451', '231'], { rovers: [{ r: 2, c: 2 }] });
  expect(s.rovers).toHaveLength(1);
  const rover = s.rovers[0]!;
  expect(rover).toMatchObject({ r: 2, c: 2 });
  const rider = s.survivors.find((v) => v.id === rover.riderId)!;
  expect(rider).toMatchObject({ r: 2, c: 2, state: 'grounded', need: null });
});

test('a rover steps toward the nearest station and rescues its rider', () => {
  // dome at (0,0); rover+rider at (0,2). One move: rover steps to (0,1),
  // which is adjacent to the station, so the settle rescue pass houses the rider.
  const s = loadLevel({
    id: 0, mask: ['###', '###', '###'], tiles: ['D12', '345', '123'],
    survivors: [], rovers: [{ r: 0, c: 2 }], goal: { type: 'rescueN', n: 1 }, seed: 3,
  });
  const rider = s.survivors[0]!;
  settle(s, [], true);
  expect(rider.state).toBe('housed');
  expect(s.rovers).toHaveLength(0); // pruned after the rider is home
});

test('a rover rider stays locked to its rover after tile ops displace it', () => {
  const s = loadLevel({
    id: 0, mask: ['###', '###'], tiles: ['121', '234'],
    survivors: [], rovers: [{ r: 1, c: 1 }], goal: { type: 'rescueN', n: 1 }, seed: 3,
  });
  const rider = s.survivors[0]!;
  rider.r = 0; rider.c = 0; // pretend a merge/gravity dragged the rider off its rover
  settle(s, [], true);
  expect(rider.r).toBe(s.rovers[0]!.r);
  expect(rider.c).toBe(s.rovers[0]!.c); // snapped back onto the rover
  expect(rider.state).toBe('grounded');
});

test('a rover idles with no station yet, keeping its rider safe on a danger tile', () => {
  // no dome; rover sits on a tier-1 (danger) tile — a normal survivor would drift
  const s = loadLevel({
    id: 0, mask: ['###', '###'], tiles: ['121', '234'],
    survivors: [], rovers: [{ r: 0, c: 0 }], goal: { type: 'rescueN', n: 1 }, seed: 3,
  });
  const rider = s.survivors[0]!;
  settle(s, [], true);
  expect(s.rovers[0]).toMatchObject({ r: 0, c: 0 }); // didn't move
  expect(rider.state).toBe('grounded'); // safe aboard despite the tier-1 tile
  expect(rider.need).toBeNull();
});
