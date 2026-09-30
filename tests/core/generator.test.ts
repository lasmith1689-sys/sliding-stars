import { makeSolvableLevel, paramsForLevel, generateLevel } from '../../src/core/generator';
import { solve } from '../../src/core/solver';
import { loadLevel } from '../../src/core/level';
import { findMatches } from '../../src/core/match';

test('difficulty params: size ramps by band, goals rotate, counts scale', () => {
  expect(paramsForLevel(1).rows).toBe(6);
  expect(paramsForLevel(1).cols).toBe(5);
  expect(paramsForLevel(30).rows).toBe(9);
  expect(paramsForLevel(30).cols).toBe(7);
  expect(paramsForLevel(4).goal).toBe('collectN'); // every 4th level collects canisters
  expect(paramsForLevel(1).goal).toBe('rescueN');
  expect(paramsForLevel(1).cornerCut).toBe(0);
  expect(paramsForLevel(12).cornerCut).toBe(2); // harder levels get more organic masks
});

test('generated levels never start with a match on the board', () => {
  for (let i = 1; i <= 30; i++) {
    const def = makeSolvableLevel(i);
    expect(findMatches(loadLevel(def))).toHaveLength(0);
  }
},30000); // 30 independent solver searches; allow slower development hosts

test('every generated level 1..40 is solver-verified beatable', () => {
  for (let i = 1; i <= 40; i++) {
    const def = makeSolvableLevel(i);
    const res = solve(def, 80);
    expect(res.solved, `level ${i} should be solvable`).toBe(true);
  }
},30000);

// Keep all 70 correctness checks and expose the exact failing level. The aggregate
// loop can exceed 30 seconds on development hosts without any individual failure.
// Expensive seeded searches retain the original correctness check's 30s allowance.
test.each(Array.from({length:70},(_,index)=>index+1))('generated level %i stays solver-verified beatable', i => {
  expect(solve(makeSolvableLevel(i), 100).solved, `level ${i} should be solvable`).toBe(true);
},30000);

test('rescue crew count ramps up sooner', () => {
  expect(paramsForLevel(2).goalN).toBe(1); // gentle intro
  expect(paramsForLevel(5).goalN).toBe(2); // rescue 2 by level 5 (was ~7)
  expect(paramsForLevel(9).goalN).toBe(3); // rescue 3 by level 9 (was ~14)
});

test('later levels are richer: more crystals and frequent obstacles', () => {
  expect(paramsForLevel(50).crystals).toBe(3); // crystal density grows
  let withObstacles = 0;
  for (const i of [40, 45, 50, 55, 60]) {
    const ov = (makeSolvableLevel(i).overlays ?? []).join('');
    if (/[IVW]/.test(ov)) withObstacles++;
  }
  expect(withObstacles).toBeGreaterThanOrEqual(4); // most late levels carry obstacles
});

test('generateLevel is deterministic for a given seed+params', () => {
  const p = paramsForLevel(7);
  const a = generateLevel(7, 123, p);
  const b = generateLevel(7, 123, p);
  expect(a).toEqual(b);
});

test('some rescue levels flag a VIP survivor slot', () => {
  const def = makeSolvableLevel(6); // rescue level chosen to carry a VIP
  expect(typeof def.vipSurvivor).toBe('number');
  expect(def.vipSurvivor!).toBeLessThan(def.survivors.length);
  expect(makeSolvableLevel(1).vipSurvivor).toBeUndefined(); // intro never has a VIP
});

test('some later levels field a rover and stay solvable', () => {
  expect(paramsForLevel(1).rover).toBe(false);
  expect(paramsForLevel(18).rover).toBe(true);
  const def = makeSolvableLevel(18);
  expect((def.rovers ?? []).length).toBeGreaterThan(0);
  expect(solve(def, 140).solved).toBe(true);
});

test('late levels add a reactor and stay solvable', () => {
  expect(paramsForLevel(1).reactors).toBe(0);
  expect(paramsForLevel(22).reactors).toBeGreaterThan(0);
  const def = makeSolvableLevel(22);
  expect((def.overlays ?? []).join('')).toContain('V');
  expect(solve(def, 140).solved).toBe(true);
});

test('mid+ levels include crystals and stay solvable', () => {
  expect(paramsForLevel(1).crystals).toBe(0);
  expect(paramsForLevel(20).crystals).toBeGreaterThan(0);
  const def = makeSolvableLevel(20);
  const hasCrystal = (def.overlays ?? []).join('').includes('I');
  expect(hasCrystal).toBe(true);
  expect(solve(def, 120).solved).toBe(true);
});

test('later levels carve interior holes but stay solvable', () => {
  expect(paramsForLevel(1).holes).toBe(0);
  expect(paramsForLevel(30).holes).toBeGreaterThan(0);
  const def = makeSolvableLevel(30);
  const holeCount = def.mask.join('').split('').filter((ch) => ch === '.').length;
  expect(holeCount).toBeGreaterThan(0); // has out-of-mask cells
  expect(solve(def, 100).solved).toBe(true); // still beatable
});

test('drift timer tightens with level; collect levels get a move budget', () => {
  expect(paramsForLevel(1).needMoves).toBe(12);
  expect(paramsForLevel(40).needMoves).toBe(8); // floors at 8
  expect(paramsForLevel(1).needMoves).toBeGreaterThan(paramsForLevel(40).needMoves);
  expect(paramsForLevel(4).moveLimit).toBeGreaterThan(0);
  expect(paramsForLevel(1).moveLimit).toBeUndefined();
  expect(generateLevel(1, 123, paramsForLevel(1)).needMoves).toBe(12);
});
