import { loadLevel } from '../../src/core/level';
import { usePowerUp, POWER_UP_COST } from '../../src/core/powerups';
import type { LevelDef } from '../../src/core/types';

function make(tiles: string[], over: Partial<LevelDef> = {}) {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = {
    id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 5 }, seed: 3, ...over,
  };
  return loadLevel(def);
}

test('wormhole shuffles the board (charging happens at purchase, not use)', () => {
  const s = make(['1231', '2312', '3123', '1231']);
  s.points = 500;
  const before = JSON.stringify(s.grid);
  const res = usePowerUp(s, 'wormhole');
  expect(res.legal).toBe(true);
  expect(res.state.points).toBe(500); // use is free — buyPowerUp charges
  expect(res.events.some((e) => e.type === 'shuffle')).toBe(true);
  expect(JSON.stringify(res.state.grid)).not.toBe(before);
});

test('demo charge destroys the target tile and the board refills', () => {
  const s = make(['123', '231', '312']);
  s.points = 500;
  const res = usePowerUp(s, 'demo', { r: 2, c: 1 });
  expect(res.legal).toBe(true);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      expect(res.state.grid[r]![c]).not.toBeNull();
});

test('tractor beam pulls an adjacent drifter onto land and grounds them', () => {
  const s = make(['123', '341', '312'], { survivors: [{ r: 0, c: 1 }] }); // swimmer on tier 2
  s.points = 500;
  const res = usePowerUp(s, 'tractor', { r: 1, c: 1 }); // tier-4 land target below them
  expect(res.legal).toBe(true);
  const sv = res.state.survivors[0]!;
  // pulled onto solid land (tier 4) -> safe on land (grounded), needs a station
  const shuffle=res.events.find(e=>e.type==='shuffle');
  const destination=shuffle?.moves.find(m=>m.from.r===1&&m.from.c===1)?.to??{r:1,c:1};
  expect({r:sv.r,c:sv.c}).toEqual(destination);
  expect(res.state.grid[sv.r]![sv.c]).toEqual({kind:'tile',tier:4});
  expect(sv.state).toBe('grounded');
  expect(res.events.some((e) => e.type === 'survivorPulled')).toBe(true);
});

test('power-ups never tick need timers', () => {
  const s = make(['1231', '2312', '3123', '1231'], { survivors: [{ r: 0, c: 0 }], needMoves: 5 });
  s.points = 500;
  const res = usePowerUp(s, 'wormhole');
  expect(res.state.survivors[0]!.need).toEqual({ type: 'rescue', movesLeft: 5 });
});

test('a power-up aimed at a standalone box cell is rejected, not a crash', () => {
  const s = make(['123', '231', '312'], { overlays: ['.C.', '...', '...'] });
  s.points = 500;
  expect(usePowerUp(s, 'demo', { r: 0, c: 1 }).legal).toBe(false);
  expect(usePowerUp(s, 'tractor', { r: 0, c: 1 }).legal).toBe(false);
});

test('demo cannot blast the tile out from under a crystal', () => {
  const s = make(['123', '231', '312'], { overlays: ['.I.', '...', '...'] });
  s.points = 500;
  const res = usePowerUp(s, 'demo', { r: 0, c: 1 });
  expect(res.legal).toBe(false);
  expect(s.grid[0]![1]).not.toBeNull(); // tile still there under the crystal
});
