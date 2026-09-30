import { doorCell, chooseFacing } from '../../src/core/dome';

const full = (rows: number, cols: number) =>
  Array.from({ length: rows }, () => Array<boolean>(cols).fill(true));

test('doorCell is one column toward the facing', () => {
  expect(doorCell(2, 3, 'left')).toEqual({ r: 2, c: 2 });
  expect(doorCell(2, 3, 'right')).toEqual({ r: 2, c: 4 });
});

test('facing points at the only in-board side', () => {
  const m = full(3, 3);
  // at column 0, left is off-board -> must face right
  expect(chooseFacing(m, 3, 3, 1, 0, 0.99)).toBe('right');
  // at last column, right is off-board -> must face left
  expect(chooseFacing(m, 3, 3, 1, 2, 0.01)).toBe('left');
});

test('facing avoids an out-of-mask hole', () => {
  const m = full(3, 3);
  m[1]![0] = false; // hole to the left of (1,1)
  expect(chooseFacing(m, 3, 3, 1, 1, 0.99)).toBe('right');
});

test('facing uses the random bit when both sides are open', () => {
  const m = full(3, 3);
  expect(chooseFacing(m, 3, 3, 1, 1, 0.2)).toBe('left');
  expect(chooseFacing(m, 3, 3, 1, 1, 0.8)).toBe('right');
});

test('facing avoids an overlay-blocked side when the other is clean', () => {
  const m = full(3, 3);
  const blocked = (r: number, c: number) => r === 1 && c === 0; // crystal at (1,0)
  // both sides in-mask, but left is blocked -> must face right, whatever the rng says
  expect(chooseFacing(m, 3, 3, 1, 1, 0.01, blocked)).toBe('right');
  expect(chooseFacing(m, 3, 3, 1, 1, 0.99, blocked)).toBe('right');
});

test('facing falls back to mask-only choice when both sides are blocked', () => {
  const m = full(3, 3);
  const blocked = () => true;
  expect(chooseFacing(m, 3, 3, 1, 1, 0.2, blocked)).toBe('left');
  expect(chooseFacing(m, 3, 3, 1, 1, 0.8, blocked)).toBe('right');
});
