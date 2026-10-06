import { loadLevel } from '../../src/core/level';
import { trySwap } from '../../src/core/game';
import type { LevelDef } from '../../src/core/types';

function make(over: Partial<LevelDef> = {}) {
  const def: LevelDef = {
    id: 0,
    mask: ['###', '###', '###'],
    tiles: ['121', '211', '345'],
    survivors: [],
    goal: { type: 'rescueN', n: 1 },
    seed: 5,
    ...over,
  };
  return loadLevel(def);
}

test('legal swap resolves and the in-mask board is always full afterwards', () => {
  const s = make({ tiles: ['121', '211', '345'] });
  const res = trySwap(s, { r: 1, c: 0 }, { r: 0, c: 0 }); // row1 becomes 1,1,1
  expect(res.legal).toBe(true);
  for (let r = 0; r < res.state.rows; r++)
    for (let c = 0; c < res.state.cols; c++)
      if (res.state.mask[r]![c]) expect(res.state.grid[r]![c]).not.toBeNull();
});

test('no-match swap snaps back and is not legal', () => {
  const s = make({ tiles: ['123', '451', '234'] });
  const before = JSON.stringify(s.grid);
  const res = trySwap(s, { r: 0, c: 0 }, { r: 0, c: 1 });
  expect(res.legal).toBe(false);
  expect(JSON.stringify(res.state.grid)).toBe(before);
  expect(res.events.some((e) => e.type === 'swapRejected')).toBe(true);
});

test('swimmer whose tile merges up to solid land becomes grounded (safe, not yet rescued)', () => {
  // survivor swims at (0,2) on tier 3; swap makes row0 = 3,3,3 -> merges to tier 4
  // at anchor (0,1); the survivor rides onto solid land — safe, but needs a station
  const s = make({ tiles: ['313', '132', '245'], survivors: [{ r: 0, c: 2 }], needMoves: 10 });
  const res = trySwap(s, { r: 1, c: 1 }, { r: 0, c: 1 });
  expect(res.legal).toBe(true);
  const sv = res.state.survivors[0]!;
  expect(sv.state).toBe('grounded');       // safe on land, waiting for a station
  expect(res.state.rescued).toBe(0);
  expect(res.state.status).toBe('playing');
  expect(res.events.some((e) => e.type === 'survivorGrounded')).toBe(true);
});

test('a survivor riding a living-land match onto the new station is rescued', () => {
  // survivor on living land (tier 5) at (0,0); swap (2,0)<->(2,1) makes col0 =
  // 5,5,5 -> a station is built and the survivor rides onto it, rescued
  const s = make({ tiles: ['512', '534', '251'], survivors: [{ r: 0, c: 0 }] });
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 });
  expect(res.legal).toBe(true);
  expect(res.events.some((e) => e.type === 'domeCreated')).toBe(true);
  const sv = res.state.survivors[0]!;
  expect(res.state.grid[sv.r]![sv.c]).toMatchObject({ kind: 'dome' }); // they're on the station
  expect(sv.state).toBe('housed');
  expect(res.state.rescued).toBe(1);
  expect(res.state.status).toBe('won');
});


test('needs tick down on legal moves and lose the level at 0', () => {
  const s = make({
    tiles: ['313', '132', '245'],
    survivors: [{ r: 2, c: 0 }],
    needMoves: 1,
  });
  const res = trySwap(s, { r: 1, c: 1 }, { r: 0, c: 1 }); // legal merge elsewhere
  expect(res.state.survivors[0]!.state).toBe('lost');
  expect(res.state.status).toBe('lost');
  expect(res.events.some((e) => e.type === 'lost')).toBe(true);
});

test('a survivor grounded on a fixed station door cell is rescued', () => {
  // station (D) at (2,0) is at the left edge, so its door faces RIGHT -> door
  // cell (2,1). A survivor on tier-4 at (2,1) sits on the door; swap (1,2)<->(2,2)
  // makes row1 = 3,3,3, and settle houses the survivor at the door.
  const s = make({
    mask: ['###', '###', '###'],
    tiles: ['121', '331', 'D43'],
    survivors: [{ r: 2, c: 1 }],
  });
  const res = trySwap(s, { r: 1, c: 2 }, { r: 2, c: 2 });
  expect(res.legal).toBe(true);
  expect(res.state.survivors[0]!.state).toBe('housed');
  expect(res.state.rescued).toBe(1);
  expect(res.state.status).toBe('won');
});

test('a Space Station stays fixed for swaps in both directions', () => {
  const s = make({ tiles: ['4D3', '132', '245'] });
  const before=structuredClone(s);
  for(const [from,to] of [[{r:0,c:1},{r:0,c:0}],[{r:0,c:0},{r:0,c:1}]]){
    const res=trySwap(s,from!,to!);
    expect(res.legal).toBe(false);expect(res.events).toEqual([{type:'swapRejected',a:from,b:to}]);expect(res.state).toBe(s);
  }
  expect(s).toEqual(before);
});
