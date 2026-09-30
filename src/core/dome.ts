import type { Pos } from './types';

/** The cell a station's door opens onto (same row, one column toward the facing). */
export function doorCell(r: number, c: number, facing: 'left' | 'right'): Pos {
  return { r, c: facing === 'left' ? c - 1 : c + 1 };
}

/** Is (r, c+side) an in-bounds, in-mask cell? */
function sideOpen(mask: boolean[][], rows: number, cols: number, r: number, c: number, side: -1 | 1): boolean {
  const cc = c + side;
  return r >= 0 && r < rows && cc >= 0 && cc < cols && mask[r]?.[cc] === true;
}

/**
 * Choose a door facing that points at a real on-board cell; random when both
 * work. When `blockedAt` is given (e.g. a cell holding a crystal/box/reactor),
 * prefer the unblocked side so the door is usable right away.
 */
export function chooseFacing(
  mask: boolean[][], rows: number, cols: number, r: number, c: number, randBit: number,
  blockedAt?: (r: number, c: number) => boolean,
): 'left' | 'right' {
  const left = sideOpen(mask, rows, cols, r, c, -1);
  const right = sideOpen(mask, rows, cols, r, c, 1);
  if (left && !right) return 'left';
  if (right && !left) return 'right';
  if (!left && !right) return 'right'; // isolated: no live door (rare)
  if (blockedAt) {
    const leftClear = !blockedAt(r, c - 1);
    const rightClear = !blockedAt(r, c + 1);
    if (leftClear && !rightClear) return 'left';
    if (rightClear && !leftClear) return 'right';
  }
  return randBit < 0.5 ? 'left' : 'right';
}
