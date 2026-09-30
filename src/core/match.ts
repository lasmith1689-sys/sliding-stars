import type { BoardState, Pos, Tier } from './types';

export type Match = { cells: Pos[]; tier: Tier; dir: 'h' | 'v' };

export function findMatches(state: BoardState): Match[] {
  const tierAt = (r: number, c: number): Tier | null => {
    // blocked tiles (crystal/reactor/comet overlays) are inert — never match
    const k = state.overlays[r]?.[c]?.kind;
    if (k === 'crystal' || k === 'reactor' || k === 'comet') return null;
    const p = state.grid[r]?.[c];
    return p && p.kind === 'tile' ? p.tier : null;
  };
  return findMatchesInBoard(state.rows,state.cols,tierAt);
}

/** Pure discovery shared by legacy boards and campaign layers. */
export function findMatchesInBoard(rows:number,cols:number,tierAt:(r:number,c:number)=>Tier|null):Match[] {
  const out:Match[]=[];
  const scan = (dir: 'h' | 'v') => {
    const outer = dir === 'h' ? rows : cols;
    const inner = dir === 'h' ? cols : rows;
    for (let o = 0; o < outer; o++) {
      let run: Pos[] = [];
      let runTier: Tier | null = null;
      const flush = () => {
        if (runTier !== null && run.length >= 3) out.push({ cells: run, tier: runTier, dir });
        run = []; runTier = null;
      };
      for (let i = 0; i < inner; i++) {
        const r = dir === 'h' ? o : i, c = dir === 'h' ? i : o;
        const t = tierAt(r, c);
        if (t !== null && t === runTier) run.push({ r, c });
        else { flush(); if (t !== null) { run = [{ r, c }]; runTier = t; } }
      }
      flush();
    }
  };
  scan('h'); scan('v');
  return out;
}

export type Junction = { cells: Pos[]; tier: Tier; pivot: Pos };

/**
 * Group perpendicular runs of the SAME tier that intersect into a single
 * junction (L / T / + shapes). The pivot is a cell shared by a horizontal and a
 * vertical run — preferring `movedCell` when it is one. Runs with no
 * perpendicular partner are not junctions (they stay straight matches).
 */
export function findJunctions(matches: Match[], movedCell: Pos | null): Junction[] {
  const key = (p: Pos) => `${p.r},${p.c}`;
  const parent = matches.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const union = (i: number, j: number) => { parent[find(i)] = find(j); };
  const cellSets = matches.map((m) => new Set(m.cells.map(key)));

  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      if (matches[i]!.tier !== matches[j]!.tier) continue;
      if (matches[i]!.dir === matches[j]!.dir) continue; // must be perpendicular
      let shared = false;
      for (const c of cellSets[i]!) if (cellSets[j]!.has(c)) { shared = true; break; }
      if (shared) union(i, j);
    }
  }

  const comps = new Map<number, number[]>();
  for (let i = 0; i < matches.length; i++) {
    const root = find(i);
    const list = comps.get(root);
    if (list) list.push(i); else comps.set(root, [i]);
  }

  const out: Junction[] = [];
  for (const idxs of comps.values()) {
    const hasH = idxs.some((i) => matches[i]!.dir === 'h');
    const hasV = idxs.some((i) => matches[i]!.dir === 'v');
    if (!(hasH && hasV)) continue; // only crossing components are junctions
    const tier = matches[idxs[0]!]!.tier;
    const cellMap = new Map<string, Pos>();
    const hCells = new Set<string>(), vCells = new Set<string>();
    for (const i of idxs) {
      const set = matches[i]!.dir === 'h' ? hCells : vCells;
      for (const c of matches[i]!.cells) { cellMap.set(key(c), c); set.add(key(c)); }
    }
    const cells = [...cellMap.values()];
    const intersections = cells.filter((c) => hCells.has(key(c)) && vCells.has(key(c)));
    const pivot =
      (movedCell && intersections.find((c) => c.r === movedCell.r && c.c === movedCell.c)) ??
      intersections[0]!;
    out.push({ cells, tier, pivot });
  }
  return out;
}
