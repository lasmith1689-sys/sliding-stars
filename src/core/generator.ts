import { createRng } from './rng';
import { findMatches } from './match';
import { loadLevel } from './level';
import { solve } from './solver';
import type { LevelDef, Pos, Tier } from './types';

/**
 * Seeded, deterministic level generator. Produces a bottom-heavy tile gradient
 * (dangerous void up top, safe land down low) so the solver can reliably build
 * a home near the bottom and house survivors placed there — the same shape as
 * the hand-made Level 1. Difficulty scales board size, survivor/canister counts,
 * and (later) obstacle density with the level index.
 *
 * generateLevel guarantees no matches exist at load; makeSolvableLevel retries
 * seeds until solve() confirms the level is beatable.
 */

function gradientTier(r: number, rows: number, rng: ReturnType<typeof createRng>): Tier {
  const band = rows <= 1 ? 0 : r / (rows - 1); // 0 top .. 1 bottom
  const base = 1 + Math.round(band * 4);        // 1 top .. 5 bottom
  const noisy = base + (rng.next() < 0.35 ? (rng.next() < 0.5 ? -1 : 1) : 0);
  return Math.max(1, Math.min(5, noisy)) as Tier;
}

/**
 * Cut the corners of a rectangular mask into an organic shape. Each corner gets
 * its own seeded depth (0..amount) so boards are NOT mirror-symmetric.
 */
function cutCorners(mask: string[][], amount: number, rng: ReturnType<typeof createRng>): void {
  if (amount <= 0) return;
  const R = mask.length, C = mask[0]!.length;
  const corners: Array<[number, number]> = [[0, 0], [0, C - 1], [R - 1, 0], [R - 1, C - 1]];
  for (const [sr, sc] of corners) {
    const d = rng.nextInt(amount + 1); // per-corner wedge depth, may be 0
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++)
        if (Math.abs(r - sr) + Math.abs(c - sc) < d) mask[r]![c] = '.';
  }
}

/** Carve up to `count` interior cells out of the mask (organic later boards). */
function punchHoles(mask: string[][], count: number, rng: ReturnType<typeof createRng>): void {
  const R = mask.length, C = mask[0]!.length;
  if (R < 3 || C < 3) return;
  let placed = 0, guard = 0;
  while (placed < count && guard++ < 40) {
    const r = 1 + rng.nextInt(R - 2);
    const c = 1 + rng.nextInt(C - 2);
    if (mask[r]![c] === '#') { mask[r]![c] = '.'; placed++; }
  }
}

export interface GenParams { rows: number; cols: number; cornerCut: number; survivors: number; goal: 'rescueN' | 'collectN'; goalN: number; canisters: number; needMoves: number; moveLimit?: number; holes: number; crystals: number; reactors: number; comet: boolean; rover: boolean; vip: boolean; }

/** Board dimensions ramp with the level (small/full early → larger late). */
function boardSize(index: number): { rows: number; cols: number } {
  if (index <= 3) return { rows: 6, cols: 5 };
  if (index <= 8) return { rows: 7, cols: 6 };
  if (index <= 15) return { rows: 8, cols: 6 };
  if (index <= 25) return { rows: 8, cols: 7 };
  return { rows: 9, cols: 7 };
}

/** Difficulty curve as a function of 1-based level index. */
export function paramsForLevel(index: number): GenParams {
  // Board size ramps by band (the renderer re-lays-out per level); difficulty
  // also scales via goals, counts, corner-cuts and the tile gradient.
  const { rows, cols } = boardSize(index);
  const cornerCut = index >= 4 ? (index >= 12 ? 2 : 1) : 0;
  const holes = index >= 16 ? Math.min(3, 1 + Math.floor((index - 16) / 10)) : 0;
  const crystals = index >= 7 ? Math.min(3, 1 + Math.floor((index - 7) / 14)) : 0;
  const reactors = index >= 22 && index % 3 === 1 ? 1 : 0;
  const comet = index >= 28 && (index % 5 === 3 || (index >= 40 && (index % 4 === 1 || index % 3 === 2)));
  // every 4th level from 4 onward is a collect-canisters level
  const isCollect = index >= 4 && index % 4 === 0;
  // a rescue rover ferries one of the crew on some later rescue levels
  const rover = index >= 15 && index % 6 === 0 && !isCollect;
  // a VIP rides along on some rescue levels (identity chosen by the app layer)
  const vip = !isCollect && index >= 6 && index % 4 === 2;
  // gentle counts — rescuing stranded crew is hard; cap so levels stay winnable
  const goalN = isCollect
    ? Math.min(4, 2 + Math.floor(index / 10))
    : Math.min(3, 1 + Math.floor(index / 4)); // rescue count ramps up sooner
  const needMoves = Math.max(8, 12 - Math.floor(index / 8));
  return {
    rows, cols, cornerCut, holes, crystals, reactors, comet, rover, vip,
    survivors: isCollect ? 0 : goalN,
    goal: isCollect ? 'collectN' : 'rescueN',
    goalN,
    canisters: isCollect ? goalN : 0,
    needMoves,
    ...(isCollect ? { moveLimit: 60 } : {}),
  };
}

export function generateLevel(index: number, seed: number, p: GenParams): LevelDef {
  const rng = createRng(seed);
  const mask: string[][] = Array.from({ length: p.rows }, () => Array(p.cols).fill('#'));
  cutCorners(mask, p.cornerCut, rng);
  if (p.holes > 0) punchHoles(mask, p.holes, rng);

  // tiles: gradient, re-rolling any cell that would complete a 3-run at load
  const tiles: string[][] = Array.from({ length: p.rows }, () => Array(p.cols).fill('.'));
  const tierAt = (r: number, c: number): number => {
    const ch = tiles[r]?.[c];
    return ch && ch >= '1' && ch <= '5' ? Number(ch) : -1;
  };
  for (let r = 0; r < p.rows; r++)
    for (let c = 0; c < p.cols; c++) {
      if (mask[r]![c] !== '#') continue;
      let t = gradientTier(r, p.rows, rng);
      let tries = 0;
      while (tries++ < 8 &&
        ((tierAt(r, c - 1) === t && tierAt(r, c - 2) === t) ||
         (tierAt(r - 1, c) === t && tierAt(r - 2, c) === t))) {
        t = gradientTier(r, p.rows, rng);
      }
      tiles[r]![c] = String(t);
    }

  // Strand survivors on DANGEROUS but REACHABLE tiles (space tiers 1-3) in the
  // upper-middle zone, so the player builds them up to solid land in 1-2 merges
  // rather than a full climb from the deepest void. Spread across columns.
  const dangerRows = Math.max(1, Math.floor((p.rows + 1) / 2));
  const maxSurvivorTier = 2; // strand on deep tiers so a real build-up is needed
  const danger: Pos[] = [];
  for (let r = 0; r < dangerRows; r++)
    for (let c = 0; c < p.cols; c++)
      if (mask[r]![c] === '#' && tierAt(r, c) <= maxSurvivorTier) danger.push({ r, c });
  // spread survivors evenly through the danger zone (varied depths -> varied
  // build-up per survivor), avoiding clustering in one spot
  const survivors: Pos[] = [];
  const stride = danger.length > 0 ? Math.max(1, Math.floor(danger.length / (p.survivors + 1))) : 1;
  for (let i = 0; i < p.survivors && (i + 1) * stride < danger.length; i++) {
    survivors.push(danger[(i + 1) * stride]!);
  }
  // a rover delivers one of the rescue crew: hand one danger-zone slot to a rover
  const rovers: Pos[] = [];
  if (p.rover && survivors.length > 0) rovers.push(survivors.pop()!);
  // flag a survivor slot as a VIP (its identity is assigned by the app layer)
  const vipSurvivor = p.vip && survivors.length > 0 ? 0 : undefined;

  // overlays: canisters (collect goal) + crystals (freeze blockers), on tiles,
  // avoiding survivors
  const needOverlays = p.canisters > 0 || p.crystals > 0 || p.reactors > 0 || p.comet;
  const overlays = needOverlays
    ? Array.from({ length: p.rows }, () => Array(p.cols).fill('.'))
    : undefined;
  if (overlays) {
    const isSurvivor = (r: number, c: number) => survivors.some((s) => s.r === r && s.c === c);
    const mid: Pos[] = [];
    for (let r = 1; r <= p.rows - 2; r++)
      for (let c = 0; c < p.cols; c++)
        if (mask[r]![c] === '#') mid.push({ r, c });
    // spread canisters evenly so each needs its own match (not one sweep)
    for (let i = 0; i < p.canisters && i < mid.length; i++) {
      const cell = mid[Math.floor((i * mid.length) / Math.max(1, p.canisters))]!;
      if (!isSurvivor(cell.r, cell.c)) overlays[cell.r]![cell.c] = 'C';
    }
    // crystals: freeze danger-zone tiles the player must thaw to build up
    let placed = 0;
    for (let r = 0; r < p.rows && placed < p.crystals; r++)
      for (let c = 0; c < p.cols && placed < p.crystals; c++) {
        if (mask[r]![c] !== '#' || overlays[r]![c] !== '.') continue;
        if (isSurvivor(r, c) || tierAt(r, c) > 3) continue;
        // stride across the board so crystals don't clump
        if ((r * p.cols + c) % 5 !== (p.crystals % 5)) continue;
        overlays[r]![c] = 'I'; placed++;
      }
    // reactor: a single hazard on a central danger tile
    let volc = 0;
    for (let r = 1; r < p.rows - 1 && volc < p.reactors; r++)
      for (let c = 1; c < p.cols - 1 && volc < p.reactors; c++) {
        if (mask[r]![c] !== '#' || overlays[r]![c] !== '.' || isSurvivor(r, c)) continue;
        if (tierAt(r, c) > 3) continue;
        overlays[r]![c] = 'V'; volc++;
      }
    // comet: a 1x2 blocker on a mid row
    if (p.comet) {
      const wr = Math.floor(p.rows / 2);
      for (let c = 1; c <= 2; c++)
        if (mask[wr]![c] === '#' && overlays[wr]![c] === '.' && !isSurvivor(wr, c)) overlays[wr]![c] = 'W';
    }
  }

  return {
    id: index,
    mask: mask.map((r) => r.join('')),
    tiles: tiles.map((r) => r.join('')),
    survivors,
    ...(vipSurvivor !== undefined ? { vipSurvivor } : {}),
    ...(rovers.length ? { rovers } : {}),
    goal: { type: p.goal, n: p.goalN },
    seed,
    needMoves: p.needMoves,
    ...(p.moveLimit !== undefined ? { moveLimit: p.moveLimit } : {}),
    ...(overlays ? { overlays: overlays.map((r) => r.join('')) } : {}),
  };
}

/** Try seeds until solve() confirms the level is beatable; returns the level. */
const verified = new Map<string,LevelDef>();
export function makeSolvableLevel(index: number, maxMoves = index >= 40 ? 90 : 60): LevelDef {
  const key=`${index}:${maxMoves}`;
  const cached=verified.get(key);if(cached) return structuredClone(cached);
  const p = paramsForLevel(index);
  for (let attempt = 0; attempt < 60; attempt++) {
    const seed = index * 7919 + attempt * 104729;
    const def = generateLevel(index, seed, p);
    // guard: no matches at load
    if (findMatches(loadLevel(def)).length > 0) continue;
    if (solve(def, maxMoves).solved) {verified.set(key,def);return structuredClone(def);}
  }
  // Never hand an unverified random fallback to a player. Surface a retryable
  // generation error instead of silently changing the mission's objective.
  throw new Error(`No verified mission found for sector ${index}`);
}
