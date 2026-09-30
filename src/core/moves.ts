import { findMatches } from './match';
import type { BoardState, Pos } from './types';

export function canSlide(s: BoardState, p: Pos): boolean {
  return !!s.mask[p.r]?.[p.c] && !!s.grid[p.r]?.[p.c] && !s.overlays[p.r]?.[p.c];
}

/** Shared, side-effect-free legality check; rescue pieces can slide freely. */
export function isLegalSwap(s: BoardState, a: Pos, b: Pos): boolean {
  if (s.status !== 'playing' || Math.abs(a.r-b.r)+Math.abs(a.c-b.c)!==1 || !canSlide(s,a) || !canSlide(s,b)) return false;
  const pa=s.grid[a.r]![a.c]!, pb=s.grid[b.r]![b.c]!;
  if (pa.kind !== 'tile' || pb.kind !== 'tile') return true;
  return swapMatches(s,a,b).length > 0;
}

export function swapMatches(s: BoardState, a: Pos, b: Pos) {
  const grid = s.grid.map(row=>row.slice());
  [grid[a.r]![a.c],grid[b.r]![b.c]]=[grid[b.r]![b.c]!,grid[a.r]![a.c]!];
  return findMatches({...s,grid}).filter(m=>m.cells.some(p=>
    (p.r===a.r&&p.c===a.c)||(p.r===b.r&&p.c===b.c)));
}

export function* legalMoves(s: BoardState): Generator<[Pos,Pos]> {
  for(let r=0;r<s.rows;r++) for(let c=0;c<s.cols;c++) {
    const a={r,c};
    for(const b of [{r,c:c+1},{r:r+1,c}]) if(isLegalSwap(s,a,b)) yield [a,b];
  }
}
