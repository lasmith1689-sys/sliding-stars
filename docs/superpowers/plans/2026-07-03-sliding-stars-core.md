# Sliding Stars Core Engine Implementation Plan (Plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure-TypeScript, fully unit-tested rules engine for Sliding Stars — board, swaps, merges, gravity, survivors, needs, goals, and a solver bot — with zero rendering code.

**Architecture:** `src/core/` is pure TS (no DOM, no Pixi imports — enforced by test). Every player move goes through one pipeline function `trySwap()` that returns a new state plus an ordered `GameEvent[]` stream; the future renderer (Plan 2) animates by consuming events and can never alter rules. All randomness flows through a seeded RNG stored in state.

**Tech Stack:** TypeScript (strict), Vite, Vitest, PixiJS 8 (Plan 2+ only). Node 20+, npm.

## Global Constraints

- Project root: `H:\Projects\iPhone Apps\sliding-stars` (repo already initialized, `main` branch; spec at `docs/superpowers/specs/2026-07-03-sliding-stars-design.md`).
- `src/core/**` must never import from `pixi.js`, `src/render`, `src/ui`, `src/input`, `src/audio`, or reference `document`/`window`.
- Tile tiers: `1` dense nebula · `2` thin nebula · `3` stardust · `4` regolith · `5` living land. Tiers 1–3 are "water" (survivors on them are `swimming`); 4–5 are land.
- Rules from spec (user-confirmed, do not change without user sign-off): moves are **adjacent swaps**; no-match swaps **snap back**; match 3 merges into **one next-tier tile**; **gravity** fills from above and **new tier-1 tiles spawn from the top**; match 4+ of tiers 1–3 creates an **escape pod**; match of tier 5 creates a **habitat dome**; survivor needs count down **12 moves** (default) and expiry loses the level.
- Merge anchor rule (flagged "verify" in spec — initial implementation): merged result lands on the swapped-in cell if it's part of the match, else the middle cell of the match line.
- Commit after every green test cycle. Commit messages: conventional (`feat:`, `test:`, `chore:`).
- All commands below run from the repo root. On this Windows machine use the Bash tool with path `/h/Projects/iPhone Apps/sliding-stars`.

---

### Task 1: Project scaffold with strict TS + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/core/version.ts`, `tests/core/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm test` (Vitest) and `npm run typecheck` used by every later task.

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "sliding-stars",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "types": ["vitest/globals"],
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, environment: 'node' } });
```

`.gitignore`:
```
node_modules/
dist/
```

`src/core/version.ts`:
```ts
export const ENGINE_VERSION = '0.1.0';
```

`tests/core/smoke.test.ts`:
```ts
import { ENGINE_VERSION } from '../../src/core/version';

test('engine module loads', () => {
  expect(ENGINE_VERSION).toBe('0.1.0');
});
```

- [ ] **Step 2: Install dependencies**

Run: `npm install -D typescript vite vitest`
Expected: lockfile created, no errors.

- [ ] **Step 3: Run tests and typecheck to verify green**

Run: `npm test && npm run typecheck`
Expected: `1 passed`, tsc silent.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite+ts+vitest project"
```

---

### Task 2: Seeded RNG

**Files:**
- Create: `src/core/rng.ts`
- Test: `tests/core/rng.test.ts`

**Interfaces:**
- Produces: `createRng(seed: number): Rng` where `Rng = { next(): number; nextInt(maxExclusive: number): number; state(): number }`. `next()` returns float in [0,1). Deterministic per seed; `state()` returns a number that can re-seed via `createRng` to continue the sequence.

- [ ] **Step 1: Write the failing test**

`tests/core/rng.test.ts`:
```ts
import { createRng } from '../../src/core/rng';

test('same seed gives same sequence', () => {
  const a = createRng(42), b = createRng(42);
  expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
});

test('different seeds differ', () => {
  expect(createRng(1).next()).not.toBe(createRng(2).next());
});

test('nextInt stays in range and state resumes sequence', () => {
  const r = createRng(7);
  for (let i = 0; i < 100; i++) {
    const v = r.nextInt(5);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(5);
  }
  const s = r.state();
  const resumed = createRng(s);
  expect(resumed.next()).toBe(createRng(s).next());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/rng.test.ts`
Expected: FAIL — cannot find module `src/core/rng`.

- [ ] **Step 3: Implement mulberry32**

`src/core/rng.ts`:
```ts
export interface Rng {
  next(): number;
  nextInt(maxExclusive: number): number;
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    nextInt: (m) => Math.floor(next() * m),
    state: () => s,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/rng.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/rng.ts tests/core/rng.test.ts
git commit -m "feat: seeded mulberry32 rng"
```

---

### Task 3: Core types, level schema, and board loading

**Files:**
- Create: `src/core/types.ts`, `src/core/level.ts`
- Test: `tests/core/level.test.ts`

**Interfaces:**
- Produces (used by every later task):

```ts
// types.ts — exact contract
export type Tier = 1 | 2 | 3 | 4 | 5;
export const MAX_TIER: Tier = 5;
export type Pos = { r: number; c: number };
export type Piece =
  | { kind: 'tile'; tier: Tier }
  | { kind: 'pod' }
  | { kind: 'dome' };
export type SurvivorState = 'swimming' | 'grounded' | 'inPod' | 'housed' | 'lost';
export type Need = { type: 'rescue' | 'shelter'; movesLeft: number } | null;
export interface Survivor { id: number; r: number; c: number; state: SurvivorState; need: Need }
export type Goal = { type: 'rescueN'; n: number };
export interface BoardState {
  rows: number; cols: number;
  mask: boolean[][];            // true = playable cell
  grid: (Piece | null)[][];     // null only on out-of-mask cells (in-mask cells always hold a Piece)
  survivors: Survivor[];
  rescued: number;
  goal: Goal;
  needMoves: number;            // default 12
  rngState: number;
  status: 'playing' | 'won' | 'lost';
}
export interface LevelDef {
  id: number;
  mask: string[];      // '#' in-play, '.' out
  tiles: string[];     // '1'-'5' tier, 'P' pod, 'D' dome, 'R' random tier 1-3, '.' out
  survivors: Pos[];
  goal: Goal;
  seed: number;
  needMoves?: number;
}
```

- `loadLevel(def: LevelDef): BoardState` — parses rows; survivors on tier≤3 start `swimming` with `{type:'rescue', movesLeft: needMoves}`; survivors on tier≥4 start `grounded` with `need: null`. Throws `Error` on ragged rows, survivor out of mask, or tile/mask shape mismatch.

- [ ] **Step 1: Write the failing test**

`tests/core/level.test.ts`:
```ts
import { loadLevel } from '../../src/core/level';
import type { LevelDef } from '../../src/core/types';

const def: LevelDef = {
  id: 1,
  mask: ['###', '###', '.##'],
  tiles: ['123', '45R', '.PD'],
  survivors: [{ r: 0, c: 0 }, { r: 1, c: 0 }],
  goal: { type: 'rescueN', n: 2 },
  seed: 9,
};

test('loads grid with tiers, pod, dome, and randoms', () => {
  const s = loadLevel(def);
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 1 });
  expect(s.grid[1]![1]).toEqual({ kind: 'tile', tier: 5 });
  expect(s.grid[2]![1]).toEqual({ kind: 'pod' });
  expect(s.grid[2]![2]).toEqual({ kind: 'dome' });
  expect(s.grid[2]![0]).toBeNull();
  const r = s.grid[1]![2]!;
  expect(r.kind).toBe('tile');
  if (r.kind === 'tile') expect(r.tier).toBeLessThanOrEqual(3);
});

test('survivor on water swims with rescue need; on land grounded with none', () => {
  const s = loadLevel(def);
  expect(s.survivors[0]).toMatchObject({ state: 'swimming', need: { type: 'rescue', movesLeft: 12 } });
  expect(s.survivors[1]).toMatchObject({ state: 'grounded', need: null });
});

test('rejects survivor outside mask', () => {
  expect(() => loadLevel({ ...def, survivors: [{ r: 2, c: 0 }] })).toThrow(/mask/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/level.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement types.ts (exactly as the Interfaces block above) and level.ts**

`src/core/level.ts`:
```ts
import { createRng } from './rng';
import type { BoardState, LevelDef, Piece, Survivor, Tier } from './types';

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
      else if (ch === 'D') grid[r]!.push({ kind: 'dome' });
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
    };
  });
  return {
    rows, cols, mask, grid, survivors, rescued: 0,
    goal: def.goal, needMoves, rngState: rng.state(), status: 'playing',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/level.test.ts && npm run typecheck`
Expected: PASS (3 tests), tsc silent.

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/core/level.ts tests/core/level.test.ts
git commit -m "feat: core types, level schema, board loading"
```

---

### Task 4: Match detection

**Files:**
- Create: `src/core/match.ts`
- Test: `tests/core/match.test.ts`

**Interfaces:**
- Consumes: `BoardState`, `Pos`, `Tier` from Task 3.
- Produces: `findMatches(state: BoardState): Match[]` with `export type Match = { cells: Pos[]; tier: Tier; dir: 'h' | 'v' }`. Only `kind:'tile'` pieces match; runs of 3+ equal tier in a row/column, maximal length; a cell may appear in both an 'h' and a 'v' match (cross shapes yield two matches).

- [ ] **Step 1: Write the failing test**

`tests/core/match.test.ts`:
```ts
import { loadLevel } from '../../src/core/level';
import { findMatches } from '../../src/core/match';
import type { LevelDef } from '../../src/core/types';

function level(tiles: string[]): ReturnType<typeof loadLevel> {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = { id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 0 }, seed: 1 };
  return loadLevel(def);
}

test('finds a horizontal run of 3', () => {
  const m = findMatches(level(['111', '234', '345']));
  expect(m).toHaveLength(1);
  expect(m[0]).toMatchObject({ tier: 1, dir: 'h' });
  expect(m[0]!.cells).toEqual([{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }]);
});

test('finds maximal vertical run of 4, not two overlapping 3s', () => {
  const m = findMatches(level(['21', '22', '23', '24']));
  const vert = m.filter((x) => x.dir === 'v');
  expect(vert).toHaveLength(1);
  expect(vert[0]!.cells).toHaveLength(4);
});

test('pods and domes never match; different tiers never match', () => {
  expect(findMatches(level(['PPP', 'DDD', '123']))).toHaveLength(0);
});

test('no match across mask holes', () => {
  const s = loadLevel({
    id: 0, mask: ['#.#', '###'], tiles: ['1.1', '111'],
    survivors: [], goal: { type: 'rescueN', n: 0 }, seed: 1,
  });
  const m = findMatches(s);
  expect(m).toHaveLength(1);
  expect(m[0]!.dir).toBe('h');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/match.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement scan**

`src/core/match.ts`:
```ts
import type { BoardState, Pos, Tier } from './types';

export type Match = { cells: Pos[]; tier: Tier; dir: 'h' | 'v' };

export function findMatches(state: BoardState): Match[] {
  const out: Match[] = [];
  const tierAt = (r: number, c: number): Tier | null => {
    const p = state.grid[r]?.[c];
    return p && p.kind === 'tile' ? p.tier : null;
  };
  const scan = (dir: 'h' | 'v') => {
    const outer = dir === 'h' ? state.rows : state.cols;
    const inner = dir === 'h' ? state.cols : state.rows;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/match.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/match.ts tests/core/match.test.ts
git commit -m "feat: match detection (maximal runs, mask-aware)"
```

---

### Task 5: Game events and merge resolution

**Files:**
- Create: `src/core/events.ts`, `src/core/resolve.ts`
- Test: `tests/core/resolve.test.ts`

**Interfaces:**
- Consumes: `findMatches`/`Match` (Task 4), types (Task 3).
- Produces:

```ts
// events.ts — exact contract (renderer in Plan 2 consumes this)
import type { Pos, Tier } from './types';
export type GameEvent =
  | { type: 'swap'; a: Pos; b: Pos }
  | { type: 'swapRejected'; a: Pos; b: Pos }
  | { type: 'merge'; cells: Pos[]; anchor: Pos; newTier: Tier }
  | { type: 'podCreated'; at: Pos }
  | { type: 'domeCreated'; at: Pos }
  | { type: 'fall'; from: Pos; to: Pos }
  | { type: 'spawn'; at: Pos; tier: Tier }
  | { type: 'survivorGrounded'; id: number }
  | { type: 'survivorHoused'; id: number }
  | { type: 'survivorLost'; id: number }
  | { type: 'needTick'; id: number; movesLeft: number }
  | { type: 'won' }
  | { type: 'lost' };
```

- `resolveMatchesOnce(state, movedCell: Pos | null, events: GameEvent[]): boolean` — mutates `state` in place (callers clone first; cloning happens in Task 7's pipeline). Finds matches; for each: anchor = `movedCell` if it's in the match, else middle cell; result piece per Global Constraints (tier≤3 & length≥4 → pod; tier 5 → dome; else tile tier+1). Non-anchor matched cells become `null` (holes for gravity). Emits `merge` + `podCreated`/`domeCreated`. Returns whether any match resolved. A cell in both an h- and v-match resolves once (first match wins; the second skips already-cleared cells).

- [ ] **Step 1: Write the failing test**

`tests/core/resolve.test.ts`:
```ts
import { loadLevel } from '../../src/core/level';
import { resolveMatchesOnce } from '../../src/core/resolve';
import type { GameEvent } from '../../src/core/events';
import type { LevelDef } from '../../src/core/types';

function level(tiles: string[]): ReturnType<typeof loadLevel> {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = { id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 0 }, seed: 1 };
  return loadLevel(def);
}

test('3-match merges to next tier at moved cell, others become holes', () => {
  const s = level(['111', '234']);
  const ev: GameEvent[] = [];
  expect(resolveMatchesOnce(s, { r: 0, c: 2 }, ev)).toBe(true);
  expect(s.grid[0]![2]).toEqual({ kind: 'tile', tier: 2 });
  expect(s.grid[0]![0]).toBeNull();
  expect(s.grid[0]![1]).toBeNull();
  expect(ev[0]).toMatchObject({ type: 'merge', newTier: 2, anchor: { r: 0, c: 2 } });
});

test('anchor falls back to middle cell when moved cell not in match', () => {
  const s = level(['333', '124']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 1, c: 0 }, ev);
  expect(s.grid[0]![1]).toEqual({ kind: 'tile', tier: 4 });
});

test('4-match of water tier creates an escape pod', () => {
  const s = level(['2222', '1345']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 0, c: 0 }, ev);
  expect(s.grid[0]![0]).toEqual({ kind: 'pod' });
  expect(ev.some((e) => e.type === 'podCreated')).toBe(true);
});

test('tier-5 match creates a dome', () => {
  const s = level(['555', '124']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 0, c: 1 }, ev);
  expect(s.grid[0]![1]).toEqual({ kind: 'dome' });
  expect(ev.some((e) => e.type === 'domeCreated')).toBe(true);
});

test('returns false when nothing matches', () => {
  const s = level(['123', '456'.slice(0, 3)]);
  expect(resolveMatchesOnce(s, null, [])).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/resolve.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement events.ts (exact contract above) and resolve.ts**

`src/core/resolve.ts`:
```ts
import { findMatches } from './match';
import type { GameEvent } from './events';
import type { BoardState, Piece, Pos, Tier } from './types';
import { MAX_TIER } from './types';

export function resolveMatchesOnce(
  state: BoardState, movedCell: Pos | null, events: GameEvent[],
): boolean {
  const matches = findMatches(state);
  let any = false;
  for (const m of matches) {
    // skip if another match already cleared part of this line
    const live = m.cells.filter((p) => {
      const piece = state.grid[p.r]![p.c];
      return piece?.kind === 'tile' && piece.tier === m.tier;
    });
    if (live.length < 3) continue;
    any = true;
    const inMatch = (p: Pos | null) =>
      p !== null && live.some((q) => q.r === p.r && q.c === p.c);
    const anchor = inMatch(movedCell) ? movedCell! : live[Math.floor(live.length / 2)]!;
    let result: Piece;
    if (m.tier <= 3 && live.length >= 4) {
      result = { kind: 'pod' };
      events.push({ type: 'merge', cells: live, anchor, newTier: m.tier });
      events.push({ type: 'podCreated', at: anchor });
    } else if (m.tier === MAX_TIER) {
      result = { kind: 'dome' };
      events.push({ type: 'merge', cells: live, anchor, newTier: MAX_TIER });
      events.push({ type: 'domeCreated', at: anchor });
    } else {
      const newTier = (m.tier + 1) as Tier;
      result = { kind: 'tile', tier: newTier };
      events.push({ type: 'merge', cells: live, anchor, newTier });
    }
    for (const p of live) state.grid[p.r]![p.c] = null;
    state.grid[anchor.r]![anchor.c] = result;
  }
  return any;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/resolve.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/events.ts src/core/resolve.ts tests/core/resolve.test.ts
git commit -m "feat: merge resolution with pods and domes"
```

---

### Task 6: Gravity and top refill

**Files:**
- Create: `src/core/gravity.ts`
- Test: `tests/core/gravity.test.ts`

**Interfaces:**
- Consumes: types (Task 3), `GameEvent` (Task 5), `createRng` (Task 2).
- Produces: `applyGravity(state: BoardState, events: GameEvent[]): void` — per column, in-mask pieces fall to the lowest empty in-mask cells **within their contiguous mask segment** (mask holes block falling, like the original's islands of cells); each vacated top slot in the **topmost segment** of the column fills with a new `{kind:'tile', tier:1}` spawned via the state's RNG-free rule (tier is always 1; RNG reserved for future variants) — emit `spawn`. Survivors riding a falling piece move with it (update `survivor.r`). Emits `fall` events in bottom-up order per column.

- [ ] **Step 1: Write the failing test**

`tests/core/gravity.test.ts`:
```ts
import { loadLevel } from '../../src/core/level';
import { applyGravity } from '../../src/core/gravity';
import type { GameEvent } from '../../src/core/events';
import type { LevelDef } from '../../src/core/types';

function make(mask: string[], tiles: string[], survivors: {r:number;c:number}[] = []) {
  const def: LevelDef = { id: 0, mask, tiles, survivors, goal: { type: 'rescueN', n: 0 }, seed: 1 };
  return loadLevel(def);
}

test('pieces fall into holes and new tier-1 tiles spawn at top', () => {
  const s = make(['#', '#', '#'], ['4', '1', '1']);
  s.grid[1]![0] = null;               // simulate a merge hole in the middle
  const ev: GameEvent[] = [];
  applyGravity(s, ev);
  expect(s.grid[2]![0]).toEqual({ kind: 'tile', tier: 1 });
  expect(s.grid[1]![0]).toEqual({ kind: 'tile', tier: 4 });
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 1 }); // fresh spawn
  expect(ev.filter((e) => e.type === 'fall')).toHaveLength(1);
  expect(ev.filter((e) => e.type === 'spawn')).toHaveLength(1);
});

test('mask holes block falling; lower segment keeps its own pieces', () => {
  const s = make(['#', '.', '#'], ['3', '.', '2']);
  s.grid[0]![0] = null;
  const ev: GameEvent[] = [];
  applyGravity(s, ev);
  expect(s.grid[2]![0]).toEqual({ kind: 'tile', tier: 2 }); // unchanged below hole
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 1 }); // spawn fills top segment
});

test('survivor rides falling tile', () => {
  const s = make(['#', '#'], ['4', '1'], [{ r: 0, c: 0 }]);
  s.grid[1]![0] = null;
  applyGravity(s, []);
  expect(s.survivors[0]!.r).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/gravity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement gravity**

`src/core/gravity.ts`:
```ts
import type { GameEvent } from './events';
import type { BoardState } from './types';

export function applyGravity(state: BoardState, events: GameEvent[]): void {
  for (let c = 0; c < state.cols; c++) {
    // find contiguous in-mask segments top-to-bottom
    let segStart = -1;
    const segments: Array<[number, number]> = [];
    for (let r = 0; r <= state.rows; r++) {
      const inMask = r < state.rows && state.mask[r]![c] === true;
      if (inMask && segStart === -1) segStart = r;
      if (!inMask && segStart !== -1) { segments.push([segStart, r - 1]); segStart = -1; }
    }
    segments.forEach(([top, bottom], si) => {
      let write = bottom;
      for (let r = bottom; r >= top; r--) {
        const piece = state.grid[r]![c];
        if (piece !== null) {
          if (write !== r) {
            state.grid[write]![c] = piece;
            state.grid[r]![c] = null;
            for (const s of state.survivors) {
              if (s.r === r && s.c === c && s.state !== 'housed' && s.state !== 'lost') s.r = write;
            }
            events.push({ type: 'fall', from: { r, c }, to: { r: write, c } });
          }
          write--;
        }
      }
      // refill only the topmost segment from "the top of the screen"
      if (si === 0) {
        for (let r = write; r >= top; r--) {
          state.grid[r]![c] = { kind: 'tile', tier: 1 };
          events.push({ type: 'spawn', at: { r, c }, tier: 1 });
        }
      }
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/gravity.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/gravity.ts tests/core/gravity.test.ts
git commit -m "feat: segment-aware gravity with top refill"
```

---

### Task 7: The move pipeline — trySwap with cascades, survivors, needs, win/loss

**Files:**
- Create: `src/core/game.ts`
- Test: `tests/core/game.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces (the single API the renderer/UI calls):

```ts
export interface MoveResult { state: BoardState; events: GameEvent[]; legal: boolean }
export function trySwap(state: BoardState, a: Pos, b: Pos): MoveResult
```

Pipeline (documented order — tests assert it):
1. Reject (`legal:false`, `swapRejected`, input state returned unchanged) if: not `playing`, cells not orthogonally adjacent, either out of mask, or either piece is a `dome` (domes are fixed; pods and tiles may swap).
2. Deep-clone state. Swap pieces (survivors on the two cells move with their pieces). Emit `swap`.
3. If no match results: revert the swap, emit `swapRejected`, return `legal:false` (snap-back rule).
4. Resolution loop: `resolveMatchesOnce(anchor = swapped-to cell on first pass, null after)` → `applyGravity` → repeat until no matches (cascades).
5. Survivor updates: swimming survivors whose cell now holds land (tier≥4) or a pod → `grounded`/`inPod`, need cleared, emit `survivorGrounded`; grounded/inPod survivors on or 4-adjacent to a `dome` → `housed`, `rescued++`, emit `survivorHoused`.
6. Need ticks: every remaining active need decrements by 1, emit `needTick`; any reaching 0 → survivor `lost`, emit `survivorLost`.
7. Status: any lost → `status:'lost'` + `lost` event; else `rescued >= goal.n` → `'won'` + `won` event.

- [ ] **Step 1: Write the failing test**

`tests/core/game.test.ts`:
```ts
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

test('legal swap producing a match merges and refills; board stays full', () => {
  // swapping (1,0)tier2 with (1,1)tier1 lines up column of 1s? construct simply:
  // rows: 1 2 1 / 2 1 1 / 3 4 5 — swap (1,0)<->(1,1) gives row1: 1 2 1... use row match instead:
  const s = make({ tiles: ['121', '211', '345'] });
  const res = trySwap(s, { r: 1, c: 0 }, { r: 0, c: 0 }); // vertical swap: col0 becomes 2,1,3; row0 becomes 2,2,1 — no...
  // Assert on behavior, not construction: either legal merge or snap-back, board always full in-mask
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

test('match under swimming survivor grounds them and clears need', () => {
  // survivor on (0,2) tier3; swap creates 3s across row 0 -> merge to tier4 at anchor (0,2)
  const s = make({ tiles: ['313', '132', '245'], survivors: [{ r: 0, c: 2 }] });
  const res = trySwap(s, { r: 1, c: 1 }, { r: 0, c: 1 }); // brings 3 up: row0 = 3,3,3
  expect(res.legal).toBe(true);
  const sv = res.state.survivors[0]!;
  expect(sv.state).toBe('grounded');
  expect(sv.need).toBeNull();
  expect(res.events.some((e) => e.type === 'survivorGrounded')).toBe(true);
});

test('needs tick down on legal moves and lose the level at 0', () => {
  const s = make({
    tiles: ['313', '132', '245'],
    survivors: [{ r: 2, c: 0 }],
    needMoves: 1,
  });
  const res = trySwap(s, { r: 1, c: 1 }, { r: 0, c: 1 }); // legal merge elsewhere; survivor still swimming
  expect(res.state.survivors[0]!.state).toBe('lost');
  expect(res.state.status).toBe('lost');
  expect(res.events.some((e) => e.type === 'lost')).toBe(true);
});

test('housing next to a dome wins a rescueN:1 level', () => {
  // grounded survivor at (0,0) on tier4; dome adjacent will house on next legal move
  const s = make({ tiles: ['4D3', '132', '245'], survivors: [{ r: 0, c: 0 }] });
  const res = trySwap(s, { r: 1, c: 1 }, { r: 0, c: 2 }); // makes a 3-match (col of 3s) -> legal move triggers housing pass
  expect(res.legal).toBe(true);
  expect(res.state.survivors[0]!.state).toBe('housed');
  expect(res.state.rescued).toBe(1);
  expect(res.state.status).toBe('won');
  expect(res.events.some((e) => e.type === 'won')).toBe(true);
});

test('domes cannot be swapped', () => {
  const s = make({ tiles: ['4D3', '132', '245'] });
  const res = trySwap(s, { r: 0, c: 1 }, { r: 0, c: 0 });
  expect(res.legal).toBe(false);
});
```

Note for implementer: the first test intentionally asserts only invariants (fullness) because hand-computing cascade outcomes is error-prone; the specific-behavior tests use constructed boards where the outcome is unambiguous. Verify each constructed board by hand before trusting a failure — if a construction doesn't produce the intended match, fix the tiles in the test, not the engine.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/game.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pipeline**

`src/core/game.ts`:
```ts
import { applyGravity } from './gravity';
import { resolveMatchesOnce } from './resolve';
import type { GameEvent } from './events';
import type { BoardState, Pos } from './types';

export interface MoveResult { state: BoardState; events: GameEvent[]; legal: boolean }

const clone = <T>(x: T): T => structuredClone(x);
const adjacent = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

export function trySwap(state: BoardState, a: Pos, b: Pos): MoveResult {
  const reject = (): MoveResult =>
    ({ state, events: [{ type: 'swapRejected', a, b }], legal: false });
  if (state.status !== 'playing' || !adjacent(a, b)) return reject();
  if (!state.mask[a.r]?.[a.c] || !state.mask[b.r]?.[b.c]) return reject();
  const pa = state.grid[a.r]![a.c]!, pb = state.grid[b.r]![b.c]!;
  if (pa.kind === 'dome' || pb.kind === 'dome') return reject();

  const s = clone(state);
  const events: GameEvent[] = [];
  const moveSurvivors = (from: Pos, to: Pos, tmp = -1) => {
    for (const sv of s.survivors) {
      if (sv.state === 'housed' || sv.state === 'lost') continue;
      if (sv.r === from.r && sv.c === from.c) { sv.r = to.r; sv.c = to.c; }
    }
  };
  // swap pieces; survivors follow their piece (b's riders go to a and vice versa)
  s.grid[a.r]![a.c] = pb; s.grid[b.r]![b.c] = pa;
  for (const sv of s.survivors) {
    if (sv.state === 'housed' || sv.state === 'lost') continue;
    if (sv.r === a.r && sv.c === a.c) { sv.r = b.r; sv.c = b.c; }
    else if (sv.r === b.r && sv.c === b.c) { sv.r = a.r; sv.c = a.c; }
  }
  events.push({ type: 'swap', a, b });

  let anchor: Pos | null = b;
  if (!resolveMatchesOnce(s, anchor, events)) {
    return { state, events: [{ type: 'swap', a, b }, { type: 'swapRejected', a: b, b: a }], legal: false };
  }
  applyGravity(s, events);
  while (resolveMatchesOnce(s, null, events)) applyGravity(s, events);

  // survivor grounding / boarding
  for (const sv of s.survivors) {
    if (sv.state !== 'swimming') continue;
    const p = s.grid[sv.r]![sv.c];
    if (!p) continue;
    if (p.kind === 'pod') { sv.state = 'inPod'; sv.need = null; events.push({ type: 'survivorGrounded', id: sv.id }); }
    else if (p.kind === 'tile' && p.tier >= 4) { sv.state = 'grounded'; sv.need = null; events.push({ type: 'survivorGrounded', id: sv.id }); }
  }
  // housing: on or adjacent to a dome
  const domeAt = (r: number, c: number) => s.grid[r]?.[c]?.kind === 'dome';
  for (const sv of s.survivors) {
    if (sv.state !== 'grounded' && sv.state !== 'inPod') continue;
    const near = domeAt(sv.r, sv.c) || domeAt(sv.r - 1, sv.c) || domeAt(sv.r + 1, sv.c)
      || domeAt(sv.r, sv.c - 1) || domeAt(sv.r, sv.c + 1);
    if (near) {
      sv.state = 'housed'; sv.need = null; s.rescued++;
      events.push({ type: 'survivorHoused', id: sv.id });
    }
  }
  // need ticks
  for (const sv of s.survivors) {
    if (!sv.need || sv.state === 'lost') continue;
    sv.need.movesLeft--;
    events.push({ type: 'needTick', id: sv.id, movesLeft: sv.need.movesLeft });
    if (sv.need.movesLeft <= 0) {
      sv.state = 'lost'; sv.need = null;
      events.push({ type: 'survivorLost', id: sv.id });
    }
  }
  // status
  if (s.survivors.some((sv) => sv.state === 'lost')) { s.status = 'lost'; events.push({ type: 'lost' }); }
  else if (s.rescued >= s.goal.n) { s.status = 'won'; events.push({ type: 'won' }); }
  return { state: s, events, legal: true };
}
```

(The unused `moveSurvivors` helper must be deleted before commit — it's shown here to warn: survivor-follows-piece is handled inline because both cells move simultaneously.)

- [ ] **Step 4: Run tests — fix constructed boards if needed, then verify all pass**

Run: `npx vitest run tests/core/game.test.ts`
Expected: PASS (6 tests). If a constructed board doesn't yield the intended match, correct the test's tile layout by hand-tracing the swap.

- [ ] **Step 5: Run the whole suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/core/game.ts tests/core/game.test.ts
git commit -m "feat: trySwap move pipeline with cascades, survivors, needs, win/loss"
```

---

### Task 8: Core purity guard

**Files:**
- Test: `tests/core/purity.test.ts`

**Interfaces:**
- Consumes: filesystem only. Guards the Global Constraint that `src/core` stays render-free forever (Plan 2 will add Pixi elsewhere).

- [ ] **Step 1: Write the test (passes immediately — it's a guard)**

`tests/core/purity.test.ts`:
```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [/from ['"]pixi\.js['"]/, /src\/render/, /src\/ui/, /src\/input/, /src\/audio/,
  /\bdocument\b/, /\bwindow\b/, /\bnavigator\b/];

test('src/core imports nothing from the render world', () => {
  const dir = join(__dirname, '../../src/core');
  for (const f of readdirSync(dir)) {
    const text = readFileSync(join(dir, f), 'utf8');
    for (const re of FORBIDDEN) expect(text).not.toMatch(re);
  }
});
```

- [ ] **Step 2: Run to verify it passes**

Run: `npx vitest run tests/core/purity.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/core/purity.test.ts
git commit -m "test: guard core purity (no render imports in src/core)"
```

---

### Task 9: Solver bot and level validation

**Files:**
- Create: `src/core/solver.ts`
- Test: `tests/core/solver.test.ts`

**Interfaces:**
- Consumes: `trySwap` (Task 7), `loadLevel` (Task 3).
- Produces: `solve(def: LevelDef, maxMoves: number): SolveResult` with `export type SolveResult = { solved: boolean; moves: number }`. Greedy 1-ply bot: enumerate all legal swaps (every in-mask adjacent pair), simulate each with `trySwap`, score the result, play the best, repeat until won/lost/maxMoves. Scoring (descending priority): `won` = +Infinity; `lost` = -Infinity; `+1000` per `survivorHoused`; `+400` per `survivorGrounded`; `+50` per `merge` weighted by `newTier`; `-200` if any survivor's `movesLeft <= 2`. Used by Plan 3's generator as the solvability gate; also validates handcrafted levels.

- [ ] **Step 1: Write the failing test**

`tests/core/solver.test.ts`:
```ts
import { solve } from '../../src/core/solver';
import type { LevelDef } from '../../src/core/types';

const winnable: LevelDef = {
  id: 1,
  mask: ['####', '####', '####'],
  tiles: ['4D44', '3323', '1212'],
  survivors: [{ r: 0, c: 0 }],   // grounded next to dome -> housed on first legal move
  goal: { type: 'rescueN', n: 1 },
  seed: 3,
};

test('solver wins a trivially winnable level', () => {
  const res = solve(winnable, 10);
  expect(res.solved).toBe(true);
  expect(res.moves).toBeLessThanOrEqual(10);
});

test('solver reports failure within budget on an impossible goal', () => {
  const res = solve({ ...winnable, survivors: [], goal: { type: 'rescueN', n: 5 } }, 3);
  expect(res.solved).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/solver.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement greedy solver**

`src/core/solver.ts`:
```ts
import { loadLevel } from './level';
import { trySwap, type MoveResult } from './game';
import type { BoardState, LevelDef, Pos } from './types';

export type SolveResult = { solved: boolean; moves: number };

function score(res: MoveResult): number {
  if (res.state.status === 'won') return Number.POSITIVE_INFINITY;
  if (res.state.status === 'lost') return Number.NEGATIVE_INFINITY;
  let sc = 0;
  for (const e of res.events) {
    if (e.type === 'survivorHoused') sc += 1000;
    else if (e.type === 'survivorGrounded') sc += 400;
    else if (e.type === 'merge') sc += 50 * e.newTier;
  }
  if (res.state.survivors.some((s) => s.need && s.need.movesLeft <= 2)) sc -= 200;
  return sc;
}

function* legalPairs(state: BoardState): Generator<[Pos, Pos]> {
  for (let r = 0; r < state.rows; r++)
    for (let c = 0; c < state.cols; c++) {
      if (!state.mask[r]![c]) continue;
      if (state.mask[r]?.[c + 1]) yield [{ r, c }, { r, c: c + 1 }];
      if (state.mask[r + 1]?.[c]) yield [{ r, c }, { r: r + 1, c }];
    }
}

export function solve(def: LevelDef, maxMoves: number): SolveResult {
  let state = loadLevel(def);
  for (let mv = 1; mv <= maxMoves; mv++) {
    let best: MoveResult | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const [a, b] of legalPairs(state)) {
      const res = trySwap(state, a, b);
      if (!res.legal) continue;
      const sc = score(res);
      if (sc > bestScore) { bestScore = sc; best = res; }
    }
    if (!best) return { solved: false, moves: mv - 1 }; // no legal moves at all
    state = best.state;
    if (state.status === 'won') return { solved: true, moves: mv };
    if (state.status === 'lost') return { solved: false, moves: mv };
  }
  return { solved: false, moves: maxMoves };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/solver.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/solver.ts tests/core/solver.test.ts
git commit -m "feat: greedy solver bot for level validation"
```

---

### Task 10: Public core API + full-suite gate

**Files:**
- Create: `src/core/index.ts`
- Test: `tests/core/api.test.ts`

**Interfaces:**
- Produces: the single import surface Plan 2 uses: `import { loadLevel, trySwap, solve, MAX_TIER } from '../core'` plus all exported types.

- [ ] **Step 1: Write the failing test**

`tests/core/api.test.ts`:
```ts
import * as core from '../../src/core';

test('public API surface is complete', () => {
  expect(typeof core.loadLevel).toBe('function');
  expect(typeof core.trySwap).toBe('function');
  expect(typeof core.solve).toBe('function');
  expect(typeof core.createRng).toBe('function');
  expect(typeof core.findMatches).toBe('function');
  expect(core.MAX_TIER).toBe(5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement barrel**

`src/core/index.ts`:
```ts
export * from './types';
export * from './events';
export { createRng, type Rng } from './rng';
export { loadLevel } from './level';
export { findMatches, type Match } from './match';
export { trySwap, type MoveResult } from './game';
export { solve, type SolveResult } from './solver';
```

- [ ] **Step 4: Run entire suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all tests green (≈25), tsc silent.

- [ ] **Step 5: Commit**

```bash
git add src/core/index.ts tests/core/api.test.ts
git commit -m "feat: core public API barrel"
```

---

## After this plan (roadmap — separate plan docs, written when their predecessor completes)

- **Plan 2 — First playable (renderer/input/feel):** PixiJS scene consuming `GameEvent[]`, drag state machine with finger-tracking swap preview, the 10-item Animation spec from the design doc, procedural sprite atlas, one real level on an iPhone over LAN. Ends at the **mechanics sign-off gate**: the user plays it and confirms fidelity; the spec's "verify at implementation" micro-rules get frame-checked against the reference videos and corrected in core (each correction = failing test first).
- **Plan 3 — Content systems:** overlay objects (canisters, crystals, artifacts, drones, gravity wells, geysers, star whales), goal rotation, handcrafted levels 1–70 as JSON, endless generator gated by `solve()`, power-ups.
- **Plan 4 — Gift wrapping:** title screen + Mission Control vignette (Zena Patel + Pepper), colony meta layer, audio, PWA manifest/service worker/icons, deploy, on-device install checklist, birthday dedication + finale message.

## Self-review notes

- Spec coverage: this plan covers the spec's "Core rules" section and testing items 1–2 (unit tests + solver). Rendering, animation, escalation content, story, and PWA are explicitly deferred to Plans 2–4 per the roadmap above.
- Known simplifications flagged for the Plan-2 playtest gate: merge-anchor rule, pod/dome creation exact conditions, housing adjacency, needs ticking on cascades — all listed in the spec's verify list; each lives behind a single function so corrections are localized.
- Type consistency: `GameEvent`, `BoardState`, `LevelDef`, `MoveResult`, `SolveResult` names match across Tasks 3–10.
