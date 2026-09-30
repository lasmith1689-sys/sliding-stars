import { createRng } from './rng';
import { chooseFacing } from './dome';
import type { BoardState, LevelDef, Overlay, Piece, Rover, Survivor, Tier } from './types';

/**
 * Parse a one-char-per-cell overlay grid, column-aligned with the tile grid:
 * 'C' canister, 'I' crystal/ice, '.'/'#' none. All start at hp 1; tougher
 * overlays are set on the returned state directly (rare, so no grid encoding).
 */
function parseOverlays(rows: number, cols: number, mask: boolean[][], lines?: string[]): (Overlay | null)[][] {
  const out: (Overlay | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    out.push([]);
    const line = lines?.[r] ?? '';
    for (let c = 0; c < cols; c++) {
      const ch = line[c] ?? '.';
      if (ch === '.' || ch === '#' || !mask[r]![c]) { out[r]!.push(null); continue; }
      if (ch === 'C') out[r]!.push({ kind: 'canister', hp: 3 });
      else if (ch === 'I') out[r]!.push({ kind: 'crystal', hp: 1 });
      else if (ch === 'V') out[r]!.push({ kind: 'reactor', hp: 2, fuse: 4, period: 4 });
      else if (ch === 'W') out[r]!.push({ kind: 'comet', hp: 3 });
      else throw new Error(`unknown overlay char '${ch}' at ${r},${c}`);
    }
  }
  return out;
}

export function loadLevel(def: LevelDef): BoardState {
  const rows = def.mask.length;
  const cols = def.mask[0]?.length ?? 0;
  if (def.mask.some((r) => r.length !== cols) || def.tiles.length !== rows ||
      def.tiles.some((r) => r.length !== cols)) {
    throw new Error('level rows are ragged or tiles/mask shapes differ');
  }
  const rng = createRng(def.seed);
  const mask: boolean[][] = [];
  const grid: (Piece | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    mask.push([]); grid.push([]);
    for (let c = 0; c < cols; c++) {
      const inPlay = def.mask[r]![c] === '#';
      mask[r]!.push(inPlay);
      const ch = def.tiles[r]![c]!;
      if (!inPlay) {
        if (ch !== '.') throw new Error(`tile '${ch}' at ${r},${c} is outside mask`);
        grid[r]!.push(null);
      } else if (ch === 'P') grid[r]!.push({ kind: 'pod' });
      else if (ch === 'D') grid[r]!.push({ kind: 'dome', facing: chooseFacing(mask, rows, cols, r, c, rng.next()) });
      else if (ch === 'R') grid[r]!.push({ kind: 'tile', tier: (1 + rng.nextInt(3)) as Tier });
      else if (ch >= '1' && ch <= '5') grid[r]!.push({ kind: 'tile', tier: Number(ch) as Tier });
      else throw new Error(`unknown tile char '${ch}' at ${r},${c}`);
    }
  }
  const needMoves = def.needMoves ?? 12;
  const survivors: Survivor[] = def.survivors.map((p, i) => {
    if (!mask[p.r]?.[p.c]) throw new Error(`survivor at ${p.r},${p.c} outside mask`);
    const piece = grid[p.r]![p.c]!;
    const onWater = piece.kind === 'tile' && piece.tier <= 3;
    return {
      id: i, r: p.r, c: p.c,
      state: onWater ? 'swimming' : piece.kind === 'pod' ? 'inPod' : 'grounded',
      need: onWater ? { type: 'rescue', movesLeft: needMoves } : null,
      vip: p.vip,
    };
  });
  // rescue rovers: each spawns a rider survivor at its cell (safe/grounded aboard)
  const rovers: Rover[] = (def.rovers ?? []).map((p, i) => {
    if (!mask[p.r]?.[p.c]) throw new Error(`rover at ${p.r},${p.c} outside mask`);
    const riderId = survivors.length;
    survivors.push({ id: riderId, r: p.r, c: p.c, state: 'grounded', need: null });
    return { id: i, r: p.r, c: p.c, riderId };
  });
  const overlays = parseOverlays(rows, cols, mask, def.overlays);
  // break-boxes stand alone: a canister occupies its cell with no terrain under it
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (overlays[r]![c]?.kind === 'canister') grid[r]![c] = null;
  return {
    rows, cols, mask, grid, overlays, survivors, rovers, rescued: 0, collected: 0, points: 0,
    movesLeft: def.moveLimit ?? null,
    goal: def.goal, needMoves, rngState: rng.state(), status: 'playing',
  };
}
