import { computeLayout } from '../../src/render/layout';
import { solve } from '../../src/core/solver';
import { LEVEL_001 } from '../../src/levels/level001';

test('layout centers the board between HUD and tray bands', () => {
  const { tileSize, originX, originY } = computeLayout(6, 5, 375, 812);
  const gap = tileSize * 0.06;
  const boardW = 5 * tileSize + 4 * gap;
  const boardH = 6 * tileSize + 5 * gap;
  expect(originX).toBeCloseTo((375 - boardW) / 2, 5);
  // vertical: centered inside the HUD/tray bands
  const bandTop = 812 * 0.145, bandBottom = 812 * (1 - 0.155);
  expect(originY).toBeGreaterThanOrEqual(bandTop - 0.01);
  expect(originY + boardH).toBeLessThanOrEqual(bandBottom + 0.01);
  expect(tileSize).toBeGreaterThan(0);
});

test('layout never overflows horizontally', () => {
  const { tileSize, originX } = computeLayout(3, 7, 375, 812);
  const gap = tileSize * 0.06;
  expect(originX).toBeGreaterThanOrEqual(0);
  expect(originX + 7 * tileSize + 6 * gap).toBeLessThanOrEqual(375.01);
});

test('largest board (9x7) fits iPhone width with tappable tiles', () => {
  const { tileSize, originX, gap } = computeLayout(9, 7, 375, 812);
  expect(originX + 7 * tileSize + 6 * gap).toBeLessThanOrEqual(375.01);
  expect(tileSize).toBeGreaterThanOrEqual(34);
});

test('LEVEL_001 fixture is solvable by the bot (station-based rescue)', () => {
  const res = solve(LEVEL_001, 50);
  expect(res.solved).toBe(true);
});
