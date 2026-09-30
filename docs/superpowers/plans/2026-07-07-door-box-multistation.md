# Door Rescue, Box Wear, Multi-Station & Zena/Pepper Interior — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a directional "door" rescue rule, 3-hit box wear, endless multi-station progression, and a Zena/Pepper ship-interior beat to Sliding Stars.

**Architecture:** Pure-core changes (dome facing + door-only rescue + box wear) land in `src/core` with direct unit tests via the exported `settle`/`trySwap`/`loadLevel`. The station meta becomes a data-driven catalog in `src/meta`. Render and art follow, verified in the Claude preview. The seeded, solver-verified generator is re-tuned and the 1..70 sweep re-run.

**Tech Stack:** TypeScript (strict), PixiJS v8, Vite, Vitest, sharp + OpenAI gpt-image-1 art pipeline.

## Global Constraints

- Core purity: files under `src/core/**` must not import from `src/render/**` or `src/meta/**` (enforced by `tests/core/purity.test.ts`).
- Determinism: all randomness goes through the seeded RNG (`src/core/rng.ts`); dome facing advances `state.rngState` (never `Math.random` in core).
- Every generated level 1..70 must remain solvable (`tests/**` solver sweep, 30s budget).
- Standing rule: every new/changed mechanic ships a one-time in-game tutorial tip before it can challenge the player.
- OpenAI key is read at runtime from `/h/Program Files/ams2-setup-coach/.env` (`OPENAI_API_KEY`); NEVER commit it. Respect the $20/day cap.
- One batched Cloudflare Pages deploy at the very end (`npx wrangler pages deploy dist --project-name=sliding-stars --branch=main --commit-dirty=true`, `CLOUDFLARE_ACCOUNT_ID=6d17634ca2607e47e334174f0cf56c7e`); bump `public/sw.js` `CACHE` to `sliding-stars-v7`.
- Commit after every task. Tag `checkpoint-pre-plan-e` before Task 1.

---

## File Structure

- `src/core/types.ts` — `Piece` dome gains `facing`.
- `src/core/dome.ts` — **new**: `doorCell`, `chooseFacing` helpers (pure).
- `src/core/resolve.ts`, `src/core/level.ts` — assign facing at dome creation.
- `src/core/game.ts` — door-only rescue in `settle`; per-merge box wear in `damageOverlays`.
- `src/core/generator.ts` — rebalance canister counts / move budget for 3-hit boxes.
- `src/render/animator.ts`, `src/render/boardView.ts`, `src/render/textures.ts` — dome door sprite + facing, box wear sprites.
- `src/meta/roster.ts` — **refactor** into a `STATIONS` catalog (station 1 + station 2).
- `src/meta/station.ts` — multi-station `StationState`, migration, transitions.
- `src/main.ts` — pickVip from current station, completion → finale/celebration, recordWin both totals.
- `src/render/station.ts` — ship interior with Zena/Pepper; header (overall score + station count).
- `src/render/celebrate.ts` — **new**: escalating "Station N complete!" screen.
- `src/render/tip.ts` — door tip + updated box tip + new-station note.
- `scripts/gen-art.mjs`, `scripts/clean-art.mjs` — new art prompts + clean roster.

---

## Task 1: Dome facing — type, helpers, assignment

**Files:**
- Modify: `src/core/types.ts:6-9`
- Create: `src/core/dome.ts`
- Create: `tests/core/dome.test.ts`
- Modify: `src/core/resolve.ts:1-4,21-25,50-56`
- Modify: `src/core/level.ts:1-2,47`
- Modify: `src/render/animator.ts:109`

**Interfaces:**
- Produces: `Piece` dome = `{ kind: 'dome'; facing: 'left' | 'right' }`; `doorCell(r, c, facing): Pos`; `chooseFacing(mask, rows, cols, r, c, randBit): 'left' | 'right'`.

- [ ] **Step 1: Write the failing test** — `tests/core/dome.test.ts`

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/dome.test.ts`
Expected: FAIL (`Cannot find module '../../src/core/dome'`).

- [ ] **Step 3: Create `src/core/dome.ts`**

```ts
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

/** Choose a door facing that points at a real on-board cell; random when both work. */
export function chooseFacing(
  mask: boolean[][], rows: number, cols: number, r: number, c: number, randBit: number,
): 'left' | 'right' {
  const left = sideOpen(mask, rows, cols, r, c, -1);
  const right = sideOpen(mask, rows, cols, r, c, 1);
  if (left && !right) return 'left';
  if (right && !left) return 'right';
  if (!left && !right) return 'right'; // isolated: no live door (rare)
  return randBit < 0.5 ? 'left' : 'right';
}
```

- [ ] **Step 4: Update the `Piece` type** — `src/core/types.ts` line 9

Change `| { kind: 'dome' };` to:

```ts
  | { kind: 'dome'; facing: 'left' | 'right' };
```

- [ ] **Step 5: Assign facing in `resolve.ts`**

Add to the imports (top of file):

```ts
import { createRng } from './rng';
import { chooseFacing } from './dome';
```

Replace line 23 (`result = { kind: 'dome' };` in the junction branch) with:

```ts
      const jr = createRng(state.rngState);
      result = { kind: 'dome', facing: chooseFacing(state.mask, state.rows, state.cols, j.pivot.r, j.pivot.c, jr.next()) };
      state.rngState = jr.state();
```

Replace line 54 (`result = { kind: 'dome' };` in the match branch) with:

```ts
      const mr = createRng(state.rngState);
      result = { kind: 'dome', facing: chooseFacing(state.mask, state.rows, state.cols, anchor.r, anchor.c, mr.next()) };
      state.rngState = mr.state();
```

- [ ] **Step 6: Assign facing in `level.ts`**

Add to imports (line 2 area):

```ts
import { chooseFacing } from './dome';
```

The `'D'` branch runs inside the grid-building loop where `mask`, `rows`, `cols`, `rng`, `r`, `c` are in scope. Replace line 47 (`else if (ch === 'D') grid[r]!.push({ kind: 'dome' });`) with:

```ts
      else if (ch === 'D') grid[r]!.push({ kind: 'dome', facing: chooseFacing(mask, rows, cols, r, c, rng.next()) });
```

- [ ] **Step 7: Fix the render-side dome literal** — `src/render/animator.ts:109`

The animator retextures a cell to a dome when `domeCreated` fires; read the real facing from the resolved state instead of a bare literal. Replace line 109:

```ts
            const dp = state.grid[e.anchor.r]?.[e.anchor.c];
            v.retexture(e.anchor.r, e.anchor.c, dp?.kind === 'dome' ? dp : { kind: 'dome', facing: 'right' });
```

(If `state` isn't the local name in that scope, use whichever variable holds the post-move `BoardState` passed to `animator.play`.)

- [ ] **Step 8: Run tests + typecheck**

Run: `npx vitest run tests/core/dome.test.ts && npm run typecheck`
Expected: dome tests PASS; typecheck PASS (no remaining bare `{ kind: 'dome' }`).

- [ ] **Step 9: Commit**

```bash
git add src/core/types.ts src/core/dome.ts src/core/resolve.ts src/core/level.ts src/render/animator.ts tests/core/dome.test.ts
git commit -m "feat(core): domes carry a left/right door facing"
```

---

## Task 2: Door-only rescue rule

**Files:**
- Modify: `src/core/game.ts` (import + `settle` rescue block ~284-292)
- Create: `tests/core/door-rescue.test.ts`

**Interfaces:**
- Consumes: `doorCell` (Task 1), exported `settle(s, events, tickNeeds)`.
- Produces: rescue happens only on a station's door cell (or on the station tile itself).

- [ ] **Step 1: Write the failing test** — `tests/core/door-rescue.test.ts`

```ts
import { loadLevel } from '../../src/core/level';
import { settle } from '../../src/core/game';
import type { GameEvent } from '../../src/core/events';
import type { LevelDef } from '../../src/core/types';

// Dome at (1,0): left is off-board, so it faces RIGHT -> door cell is (1,1).
const DEF: LevelDef = {
  id: 0,
  mask: ['###', '###', '###'],
  tiles: ['412', 'D43', '215'],
  survivors: [],
  goal: { type: 'rescueN', n: 1 },
  seed: 1,
};

test('a survivor on the door cell is rescued; a non-door side is not', () => {
  const s = loadLevel(DEF);
  s.survivors = [
    { id: 0, r: 1, c: 1, state: 'grounded', need: null }, // door cell of the dome
    { id: 1, r: 0, c: 0, state: 'grounded', need: null }, // directly above the dome (non-door)
  ];
  const ev: GameEvent[] = [];
  settle(s, ev, false);
  expect(s.survivors[0]!.state).toBe('housed');
  expect(s.survivors[1]!.state).toBe('grounded');
  expect(s.rescued).toBe(1);
});

test('a survivor standing on the station tile itself is still rescued (no softlock)', () => {
  const s = loadLevel(DEF);
  s.survivors = [{ id: 0, r: 1, c: 0, state: 'grounded', need: null }]; // on the dome cell
  settle(s, [], false);
  expect(s.survivors[0]!.state).toBe('housed');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/door-rescue.test.ts`
Expected: FAIL — under the old adjacency rule survivor #1 (above the dome) is wrongly housed.

- [ ] **Step 3: Add the import** — top of `src/core/game.ts`

```ts
import { doorCell } from './dome';
```

- [ ] **Step 4: Replace the rescue block** — `src/core/game.ts`

Replace the existing "a survivor standing on OR next to a space station is rescued" block (the `stationAt` adjacency loop, ~lines 284-292) with a door-only pass:

```ts
  // Rescue happens only at a station's DOOR cell. Standing on the station tile
  // itself already housed the survivor in the loop above (p.kind === 'dome'),
  // which prevents a survivor fused into the house from being stranded.
  const doorAt = new Set<string>();
  for (let r = 0; r < s.rows; r++)
    for (let c = 0; c < s.cols; c++) {
      const p = s.grid[r]![c];
      if (p?.kind === 'dome') { const d = doorCell(r, c, p.facing); doorAt.add(`${d.r},${d.c}`); }
    }
  for (const sv of s.survivors) {
    if (sv.state === 'housed' || sv.state === 'lost') continue;
    if (s.rovers.some((rv) => rv.riderId === sv.id)) continue; // safe aboard a rover
    if (doorAt.has(`${sv.r},${sv.c}`)) {
      sv.state = 'housed'; sv.need = null; s.rescued++;
      events.push({ type: 'survivorHoused', id: sv.id });
    }
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/core/door-rescue.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Run the full core suite** (the rescue change is load-bearing)

Run: `npx vitest run tests/core`
Expected: PASS. If a pre-existing rescue test assumed adjacency, update it to place the survivor on the door cell (dome facing is deterministic when the dome is edge-placed).

- [ ] **Step 7: Commit**

```bash
git add src/core/game.ts tests/core/door-rescue.test.ts
git commit -m "feat(core): rescue only from a station's door cell"
```

---

## Task 3: Box wear (hp 3, per-merge damage)

**Files:**
- Modify: `src/core/level.ts:17` (canister default hp), `parseOverlays`
- Modify: `src/core/game.ts` `damageOverlays` (canister branch)
- Modify: `tests/core/overlays.test.ts` (add wear tests)

**Interfaces:**
- Produces: canisters start at `hp: 3`; each distinct adjacent merge this move removes one wear stage.

- [ ] **Step 1: Write the failing tests** — append to `tests/core/overlays.test.ts`

```ts
test('a box starts at 3 wear and survives a single adjacent match', () => {
  const s = make(MATCH_COL0, { overlays: ['.C.', '...', '...'], goal: { type: 'collectN', n: 1 } });
  expect(s.overlays[0]![1]).toEqual({ kind: 'canister', hp: 3 });
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // one adjacent match
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![1]).toEqual({ kind: 'canister', hp: 2 });
  expect(res.state.collected).toBe(0);
});

test('a box breaks after three adjacent matches (wear to zero)', () => {
  const s = make(MATCH_COL0, { overlays: ['.C.', '...', '...'], goal: { type: 'collectN', n: 1 } });
  s.overlays[0]![1] = { kind: 'canister', hp: 1 }; // one stage from breaking
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 });
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.state.collected).toBe(1);
  expect(res.events.some((e) => e.type === 'canisterBroken')).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/core/overlays.test.ts`
Expected: FAIL — canisters currently load at hp 1.

- [ ] **Step 3: Default canisters to hp 3** — `src/core/level.ts` line 17

Change `if (ch === 'C') out[r]!.push({ kind: 'canister', hp: 1 });` to:

```ts
      if (ch === 'C') out[r]!.push({ kind: 'canister', hp: 3 });
```

- [ ] **Step 4: Per-merge wear in `damageOverlays`** — `src/core/game.ts`

Inside `damageOverlays`, after building the `matched` set, add a list of individual merge cell-sets:

```ts
  const merges: Set<string>[] = [];
  for (const e of events) {
    if (e.type === 'merge') {
      const set = new Set<string>();
      for (const cc of e.cells) set.add(`${cc.r},${cc.c}`);
      merges.push(set);
    }
  }
  // how many distinct merges this move land on or next to (r,c)
  const adjMergeCount = (r: number, c: number) => {
    const keys = [`${r},${c}`, `${r - 1},${c}`, `${r + 1},${c}`, `${r},${c - 1}`, `${r},${c + 1}`];
    return merges.reduce((n, m) => n + (keys.some((k) => m.has(k)) ? 1 : 0), 0);
  };
```

Replace the canister branch (`if (ov.kind === 'canister') { ov.hp--; ... }`) with per-merge wear:

```ts
      if (ov.kind === 'canister') {
        ov.hp -= adjMergeCount(r, c);
        if (ov.hp <= 0) {
          s.overlays[r]![c] = null;
          s.collected++;
          events.push({ type: 'canisterBroken', at: { r, c } });
          events.push({ type: 'points', amount: POINTS.special, reason: 'special', at: { r, c } });
          s.points += POINTS.special;
        } else {
          events.push({ type: 'canisterHit', at: { r, c }, hp: ov.hp });
        }
      } else if (ov.kind === 'crystal') {
```

(The `nearMatch(r,c)` gate above still guards entry, so a box with no adjacent merge is untouched; `adjMergeCount` is ≥1 whenever the gate passes.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/core/overlays.test.ts`
Expected: PASS. Update the older canister tests that hard-coded `hp: 1` / expected a one-hit break — either set `hp` directly (as the multi-hp test already does) or expect the new wear values.

- [ ] **Step 6: Commit**

```bash
git add src/core/level.ts src/core/game.ts tests/core/overlays.test.ts
git commit -m "feat(core): boxes take 3 adjacent matches and wear down per combo"
```

---

## Task 4: Generator rebalance + solver re-verify

**Files:**
- Modify: `src/core/generator.ts:81-93` (`paramsForLevel` canister count / move budget)
- Run: existing 1..70 solver sweep test

**Interfaces:**
- Consumes: box wear (Task 3), door rescue (Task 2).
- Produces: every level 1..70 solvable.

- [ ] **Step 1: Reduce collect pressure for 3-hit boxes** — `src/core/generator.ts`

In `paramsForLevel`, 3-hit boxes triple the matches needed, so lower the canister count and raise the collect move budget. Change the `canisters` field (line ~90) and the `moveLimit` for collect levels (line ~92):

```ts
    canisters: isCollect ? goalN : 0,
```
```ts
    ...(isCollect ? { moveLimit: 60 } : {}),
```

- [ ] **Step 2: Run the full solver sweep**

Run: `npx vitest run` (the 1..70 sweep has a 30s budget)
Expected: PASS. If any level fails to solve, nudge further — increase the collect `moveLimit` to `70`, or lower `canisters` to `Math.max(1, goalN - 1)` — and re-run until green. The `makeSolvableLevel` fallback already zeroes obstacles as a last resort.

- [ ] **Step 3: Commit**

```bash
git add src/core/generator.ts
git commit -m "balance(core): retune collect levels for 3-hit boxes; 1..70 re-verified"
```

---

## Task 5: Station catalog (roster refactor + station 2 data)

**Files:**
- Modify: `src/meta/roster.ts` (introduce `STATIONS`, keep station 1, add station 2)
- Create: `tests/meta/roster.test.ts`

**Interfaces:**
- Produces: `interface StationDef { id: string; name: string; theme: string; modules: StationModule[]; vips: Vip[] }`; `STATIONS: StationDef[]`; `stationDef(i): StationDef`; existing `vipById`/`vipsOfModule`/`moduleOf` now search across all stations (VIP ids are globally unique).

- [ ] **Step 1: Write the failing test** — `tests/meta/roster.test.ts`

```ts
import { STATIONS, stationDef, vipById, moduleOf } from '../../src/meta/roster';

test('there are at least two seeded stations, each with 6 modules and 12 crew', () => {
  expect(STATIONS.length).toBeGreaterThanOrEqual(2);
  for (const st of STATIONS.slice(0, 2)) {
    expect(st.modules).toHaveLength(6);
    expect(st.vips).toHaveLength(12);
  }
});

test('VIP ids are globally unique across stations', () => {
  const ids = STATIONS.flatMap((s) => s.vips.map((v) => v.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('lookups resolve a station-2 VIP to its module', () => {
  const arcadeVip = STATIONS[1]!.vips[0]!;
  expect(vipById(arcadeVip.id)).toBeDefined();
  expect(moduleOf(arcadeVip.id)).toBe(arcadeVip.module);
});

test('stationDef clamps out-of-range indices to the last station', () => {
  expect(stationDef(999).id).toBe(STATIONS[STATIONS.length - 1]!.id);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/meta/roster.test.ts`
Expected: FAIL (`STATIONS` not exported).

- [ ] **Step 3: Refactor `src/meta/roster.ts`**

Keep `StationModule`/`Vip` interfaces. Wrap the existing 6 modules + 12 VIPs as station 1, add "The Boardwalk Ring" as station 2, and make lookups catalog-wide:

```ts
export interface StationModule { id: string; name: string }
export interface Vip { id: string; name: string; module: string }
export interface StationDef { id: string; name: string; theme: string; modules: StationModule[]; vips: Vip[] }

const STATION_1: StationDef = {
  id: 'homestead', name: 'Home Station', theme: 'the original colony',
  modules: [
    { id: 'greenhouse', name: 'Greenhouse' }, { id: 'galley', name: 'Galley' },
    { id: 'observatory', name: 'Observatory' }, { id: 'petbay', name: 'Pet Bay' },
    { id: 'recdeck', name: 'Rec Deck' }, { id: 'medbay', name: 'Medbay' },
  ],
  vips: [
    { id: 'botanist', name: 'Astro-Botanist', module: 'greenhouse' }, { id: 'florist', name: 'Zero-G Florist', module: 'greenhouse' },
    { id: 'chef', name: 'Star Chef', module: 'galley' }, { id: 'icecream', name: 'Ice-Cream Vendor', module: 'galley' },
    { id: 'astronomer', name: 'Astronomer', module: 'observatory' }, { id: 'navigator', name: 'Navigator', module: 'observatory' },
    { id: 'vet', name: 'Space Vet', module: 'petbay' }, { id: 'groomer', name: 'Pet Groomer', module: 'petbay' },
    { id: 'racer', name: 'Go-Kart Racer', module: 'recdeck' }, { id: 'dj', name: 'Zero-G DJ', module: 'recdeck' },
    { id: 'medic', name: 'Medic', module: 'medbay' }, { id: 'nurse', name: 'Nurse', module: 'medbay' },
  ],
};

const STATION_2: StationDef = {
  id: 'boardwalk', name: 'The Boardwalk Ring', theme: 'an orbital seaside town',
  modules: [
    { id: 'arcade', name: 'Arcade' }, { id: 'diner', name: 'Diner' },
    { id: 'cinema', name: 'Cinema' }, { id: 'bakery', name: 'Bakery' },
    { id: 'library', name: 'Library' }, { id: 'gym', name: 'Gym' },
  ],
  vips: [
    { id: 'arcade_champ', name: 'Arcade Champ', module: 'arcade' }, { id: 'claw_whiz', name: 'Claw-Machine Whiz', module: 'arcade' },
    { id: 'cook', name: 'Short-Order Cook', module: 'diner' }, { id: 'soda_jerk', name: 'Soda Jerk', module: 'diner' },
    { id: 'projectionist', name: 'Projectionist', module: 'cinema' }, { id: 'usher', name: 'Usher', module: 'cinema' },
    { id: 'baker', name: 'Baker', module: 'bakery' }, { id: 'donut_fryer', name: 'Donut Fryer', module: 'bakery' },
    { id: 'librarian', name: 'Librarian', module: 'library' }, { id: 'storyteller', name: 'Storyteller', module: 'library' },
    { id: 'yogi', name: 'Yoga Instructor', module: 'gym' }, { id: 'boxing_coach', name: 'Boxing Coach', module: 'gym' },
  ],
};

export const STATIONS: StationDef[] = [STATION_1, STATION_2];

/** Backward-compatible flat views (station 1 only) — used where a single set is expected. */
export const MODULES = STATION_1.modules;
export const VIP_ROSTER = STATION_1.vips;

export function stationDef(index: number): StationDef {
  return STATIONS[Math.max(0, Math.min(index, STATIONS.length - 1))]!;
}
const ALL_VIPS = STATIONS.flatMap((s) => s.vips);
export function vipById(id: string): Vip | undefined { return ALL_VIPS.find((v) => v.id === id); }
export function vipsOfModule(moduleId: string): Vip[] { return ALL_VIPS.filter((v) => v.module === moduleId); }
export function moduleOf(vipId: string): string | undefined { return vipById(vipId)?.module; }
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/meta/roster.test.ts && npm run typecheck`
Expected: PASS (existing `MODULES`/`VIP_ROSTER` consumers still compile).

- [ ] **Step 5: Commit**

```bash
git add src/meta/roster.ts tests/meta/roster.test.ts
git commit -m "feat(meta): station catalog with a second station (Boardwalk Ring)"
```

---

## Task 6: Multi-station state

**Files:**
- Modify: `src/meta/station.ts`
- Modify: `tests/meta/station.test.ts` (or create if absent)

**Interfaces:**
- Produces:
  - `StationState { totalRescued; stationRescued; currentStation; stationsCompleted; collectedVips: string[]; builtModules: string[] }`
  - `recordWin(s, rescuedVipIds, rescuedCount)` — bumps both totals, unions VIPs.
  - `canExpand(s)`, `buildableModules(s)`, `unlockedModules(s)` — scoped to `stationDef(s.currentStation)`.
  - `buildModule(s, moduleId)` — builds it AND, if that completes the station, advances (returns `{ state, completed: boolean }`).
  - `residentsOf(s, moduleId)`, `loadStation`, `saveStation` (with migration).

- [ ] **Step 1: Write the failing tests** — `tests/meta/station.test.ts`

```ts
import {
  emptyStation, recordWin, canExpand, buildModule, unlockedModules, loadStation, RESCUES_PER_MODULE,
} from '../../src/meta/station';
import { STATIONS } from '../../src/meta/roster';

test('recordWin grows both the lifetime score and current-station rescues', () => {
  let s = emptyStation();
  s = recordWin(s, ['botanist'], 3);
  expect(s.totalRescued).toBe(3);
  expect(s.stationRescued).toBe(3);
  expect(s.collectedVips).toEqual(['botanist']);
});

test('a module unlocks only once its category VIP is collected, then builds with rescues', () => {
  let s = emptyStation();
  s = recordWin(s, ['botanist'], RESCUES_PER_MODULE); // greenhouse VIP + enough rescues
  expect(unlockedModules(s)).toContain('greenhouse');
  expect(canExpand(s)).toBe(true);
});

test('completing the last module advances to the next station and resets per-station progress', () => {
  let s = emptyStation();
  // collect one VIP per station-1 module and enough rescues to build all six
  const oneVipPerModule = STATIONS[0]!.modules.map((m) => STATIONS[0]!.vips.find((v) => v.module === m.id)!.id);
  s = recordWin(s, oneVipPerModule, RESCUES_PER_MODULE * 6);
  let completedOnce = false;
  for (const m of STATIONS[0]!.modules) {
    const out = buildModule(s, m.id);
    s = out.state;
    completedOnce = completedOnce || out.completed;
  }
  expect(completedOnce).toBe(true);
  expect(s.currentStation).toBe(1);
  expect(s.stationsCompleted).toBe(1);
  expect(s.builtModules).toEqual([]);      // reset for station 2
  expect(s.stationRescued).toBe(0);        // reset for station 2
  expect(s.totalRescued).toBe(RESCUES_PER_MODULE * 6); // lifetime score preserved
});

test('an old-shape save migrates without losing progress', () => {
  const store = { getItem: () => JSON.stringify({ totalRescued: 8, collectedVips: ['chef'], builtModules: ['galley'] }), setItem: () => {} } as unknown as Storage;
  const s = loadStation(store);
  expect(s.totalRescued).toBe(8);
  expect(s.stationRescued).toBe(8); // defaulted from totalRescued
  expect(s.currentStation).toBe(0);
  expect(s.stationsCompleted).toBe(0);
  expect(s.builtModules).toEqual(['galley']);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/meta/station.test.ts`
Expected: FAIL (new fields/behaviour absent).

- [ ] **Step 3: Rewrite `src/meta/station.ts`**

```ts
import { stationDef, moduleOf, vipsOfModule } from './roster';

export interface StationState {
  totalRescued: number;      // lifetime overall score — never resets
  stationRescued: number;    // rescues toward the current station's builds — resets on completion
  currentStation: number;    // index into STATIONS
  stationsCompleted: number; // fully-built stations
  collectedVips: string[];   // lifetime collected VIP ids (globally unique)
  builtModules: string[];    // built for the CURRENT station — resets on completion
}

export const RESCUES_PER_MODULE = 5;
const KEY = 'sliding-stars-station';

export function emptyStation(): StationState {
  return { totalRescued: 0, stationRescued: 0, currentStation: 0, stationsCompleted: 0, collectedVips: [], builtModules: [] };
}

export function recordWin(s: StationState, rescuedVipIds: string[], rescuedCount: number): StationState {
  const collected = new Set(s.collectedVips);
  for (const id of rescuedVipIds) collected.add(id);
  return {
    ...s,
    collectedVips: [...collected],
    totalRescued: s.totalRescued + rescuedCount,
    stationRescued: s.stationRescued + rescuedCount,
  };
}

/** Modules of the CURRENT station with at least one collected VIP of their category. */
export function unlockedModules(s: StationState): string[] {
  const have = new Set(s.collectedVips.map(moduleOf).filter((m): m is string => !!m));
  return stationDef(s.currentStation).modules.map((m) => m.id).filter((id) => have.has(id));
}

export function buildableModules(s: StationState): string[] {
  const built = new Set(s.builtModules);
  return unlockedModules(s).filter((id) => !built.has(id));
}

export function canExpand(s: StationState): boolean {
  return buildableModules(s).length > 0 &&
    s.stationRescued >= (s.builtModules.length + 1) * RESCUES_PER_MODULE;
}

/** Build a module; if it completes the current station, advance to the next. */
export function buildModule(s: StationState, moduleId: string): { state: StationState; completed: boolean } {
  if (s.builtModules.includes(moduleId)) return { state: s, completed: false };
  const built = [...s.builtModules, moduleId];
  const total = stationDef(s.currentStation).modules.length;
  if (built.length >= total) {
    return {
      state: { ...s, builtModules: [], stationRescued: 0, currentStation: s.currentStation + 1, stationsCompleted: s.stationsCompleted + 1 },
      completed: true,
    };
  }
  return { state: { ...s, builtModules: built }, completed: false };
}

export function residentsOf(s: StationState, moduleId: string): string[] {
  const ids = new Set(vipsOfModule(moduleId).map((v) => v.id));
  return s.collectedVips.filter((id) => ids.has(id));
}

export function loadStation(storage: Storage = localStorage): StationState {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return emptyStation();
    const p = JSON.parse(raw) as Partial<StationState>;
    const totalRescued = p.totalRescued ?? 0;
    return {
      totalRescued,
      stationRescued: p.stationRescued ?? totalRescued,
      currentStation: p.currentStation ?? 0,
      stationsCompleted: p.stationsCompleted ?? 0,
      collectedVips: p.collectedVips ?? [],
      builtModules: p.builtModules ?? [],
    };
  } catch { return emptyStation(); }
}

export function saveStation(s: StationState, storage: Storage = localStorage): void {
  try { storage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore quota/security */ }
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/meta/station.test.ts && npm run typecheck`
Expected: station tests PASS. Typecheck will FAIL where `main.ts` and `render/station.ts` call the old `buildModule`/`canExpand` — those are fixed in Tasks 7-8. If you need typecheck green now, do Task 7 next before running it.

- [ ] **Step 5: Commit**

```bash
git add src/meta/station.ts tests/meta/station.test.ts
git commit -m "feat(meta): multi-station progression state + migration"
```

---

## Task 7: Wire main.ts (pickVip, completion, finale/celebration)

**Files:**
- Modify: `src/main.ts` (imports, `pickVip`, `showEndBanner`)
- Create: `src/render/celebrate.ts` (escalating celebration; stub here, art in Task 9)

**Interfaces:**
- Consumes: `stationDef`, multi-station `station.ts`, `showFinale`, `showStation`, `showCelebration`.
- Produces: level VIPs drawn from the current station; finale once at first completion; celebration on later completions.

- [ ] **Step 1: Update imports** — `src/main.ts`

```ts
import { loadStation, saveStation, recordWin, canExpand, buildModule } from './meta/station';
import { stationDef } from './meta/roster';
import { showCelebration } from './render/celebrate';
```
(Remove the `VIP_ROSTER` import; add `stationDef`.)

- [ ] **Step 2: Draw VIPs from the current station** — replace `pickVip`

```ts
  const pickVip = (): string => {
    const have = new Set(station.collectedVips);
    const roster = stationDef(station.currentStation).vips;
    const pool = roster.filter((v) => !have.has(v.id));
    const list = pool.length ? pool : roster;
    return list[Math.floor(Math.random() * list.length)]!.id;
  };
```

- [ ] **Step 3: Rework the win sequence** — replace the `showEndBanner` won-branch body

The expansion screen now returns the chosen module id; `buildModule` applies it and may complete the station. The heartfelt finale fires once (first completion); later completions show the escalating celebration.

```ts
  const showEndBanner = (status: 'won' | 'lost') => {
    if (status !== 'won') { hud.showBanner('lost', startLevel); return; }
    const rescuedVips = state.survivors.filter((s) => s.state === 'housed' && s.vip).map((s) => s.vip!);
    station = recordWin(station, rescuedVips, state.rescued);
    saveStation(station);
    const advance = () => { currentLevel++; startLevel(); };
    hud.showBanner('won', () => {
      void (async () => {
        if (canExpand(station)) {
          // Pepper asks what to add; the picker returns the chosen module id.
          const chosen = await showStation(app, layers, textures, station, { expansion: true });
          if (chosen) {
            const out = buildModule(station, chosen);
            station = out.state; saveStation(station);
            if (out.completed) {
              if (!localStorage.getItem(FINALE_KEY)) {
                localStorage.setItem(FINALE_KEY, '1');
                await showFinale(app, layers, textures);
              } else {
                await showCelebration(app, layers, textures, station.stationsCompleted);
              }
            }
          }
        }
        advance();
      })();
    });
  };
```

Note: `showStation({ expansion: true })` must now **resolve to the chosen module id** (`string | null`) instead of a `StationState`. That signature change is Task 8. Keep `FINALE_KEY` as the single-fire guard; `FINALE_AT` is removed.

- [ ] **Step 4: Create a minimal celebration stub** — `src/render/celebrate.ts`

```ts
import { Application, Container, FillGradient, Graphics, Text } from 'pixi.js';
import type { Layers } from './app';
import type { TextureSet } from './textures';
import { tween } from './tween';

/** A short, escalating "Station N complete!" cheer (grows with `stationsCompleted`). */
export function showCelebration(app: Application, layers: Layers, _textures: TextureSet, stationsCompleted: number): Promise<void> {
  const W = app.screen.width, H = app.screen.height;
  const root = new Container(); layers.hud.addChild(root);
  const scrim = new Graphics().rect(0, 0, W, H).fill({ color: 0x0a0c1e, alpha: 0.85 });
  scrim.eventMode = 'static'; root.addChild(scrim);
  const title = new Text({
    text: `Station ${stationsCompleted} complete!`,
    style: { fill: 0xffe066, fontSize: W * 0.08, fontWeight: '900', align: 'center', fontFamily: 'system-ui, sans-serif' },
  });
  title.anchor.set(0.5); title.x = W / 2; title.y = H / 2; root.addChild(title);
  root.alpha = 0; void tween(root, { alpha: 1 }, 300);
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; void tween(root, { alpha: 0 }, 240).then(() => { root.destroy(); resolve(); }); };
    scrim.on('pointertap', finish);
    setTimeout(finish, 2600);
  });
}
```
(Confetti/crew art escalation added in Task 9.)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS once Task 8's `showStation` signature lands. If doing tasks in order, expect one signature error here that Task 8 resolves — proceed to Task 8, then re-run.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/render/celebrate.ts
git commit -m "feat: draw VIPs per station; finale once, celebration after"
```

---

## Task 8: Station screen — ship interior with Zena & Pepper

**Files:**
- Modify: `src/render/station.ts`

**Interfaces:**
- Consumes: `stationDef`, `buildableModules`, `residentsOf`, `textures.commander`, `textures.pepper`, module/VIP textures.
- Produces: `showStation(app, layers, textures, station, opts?)` → in `expansion` mode resolves to the **chosen module id** (`string | null`); in `intro`/view mode resolves after dismissal (id irrelevant).

- [ ] **Step 1: Change the return contract**

`showStation` returns `Promise<string | null>`. Expansion mode resolves with the picked module id (or `null` if dismissed without a choice). Intro/view modes resolve `null` on dismiss. Update the type and the two call sites in `main.ts` (`hud.onStationTap` ignores the result; the boot intro `await`s it).

- [ ] **Step 2: Add the interior + Zena/Pepper**

In the station scene, add Commander Zena (`textures.commander`) and Pepper (`textures.pepper`) standing together near the bottom, over an optional `textures.stationInterior` backdrop if present. Representative placement:

```ts
  if (textures.commander) {
    const z = new Sprite(textures.commander);
    z.anchor.set(0.5, 1); z.height = H * 0.22; z.width = z.height * (textures.commander.width / textures.commander.height);
    z.x = W * 0.40; z.y = H * 0.94; root.addChild(z);
  }
  const pepper = textures.pepper ? new Sprite(textures.pepper) : null;
  if (pepper) {
    pepper.anchor.set(0.5, 1); pepper.height = H * 0.14; pepper.width = pepper.height * (textures.pepper!.width / textures.pepper!.height);
    pepper.y = H * 0.94;
    pepper.x = W * 0.9; // starts off to the side; walks up in expansion mode
    root.addChild(pepper);
  }
```

- [ ] **Step 3: Pepper walk-up + speech in expansion mode**

When `opts.expansion`, animate Pepper from the side to beside Zena, then show a speech bubble:

```ts
  if (opts?.expansion && pepper) {
    void tween(pepper, { x: W * 0.56 }, 520, outQuad);
    const bubble = new Container();
    const g = new Graphics().roundRect(0, 0, W * 0.5, H * 0.09, 14).fill(0xffffff).stroke({ color: 0xe0568c, width: 2 });
    const t = new Text({ text: 'What should we add next, Commander?', style: { fill: 0x1a1440, fontSize: W * 0.032, fontWeight: '700', wordWrap: true, wordWrapWidth: W * 0.46, fontFamily: 'system-ui, sans-serif' } });
    t.x = W * 0.02; t.y = H * 0.012; bubble.addChild(g, t);
    bubble.x = W * 0.30; bubble.y = H * 0.66; bubble.alpha = 0; root.addChild(bubble);
    void tween(bubble, { alpha: 1 }, 320);
  }
```

- [ ] **Step 4: Header — overall score + station count**

Add a header line showing the current station name/theme, the overall score, and the fleet size:

```ts
  const header = new Text({
    text: `${stationDef(station.currentStation).name}\nCrew home: ${station.totalRescued}   Stations built: ${station.stationsCompleted}`,
    style: { fill: 0xcfc8ff, fontSize: W * 0.036, align: 'center', fontFamily: 'system-ui, sans-serif' },
  });
  header.anchor.set(0.5, 0); header.x = W / 2; header.y = H * 0.05; root.addChild(header);
```

- [ ] **Step 5: Expansion picker resolves the module id**

The expansion picker (existing module chips built from `buildableModules(station)`) resolves the promise with the tapped module id. Ensure the picker uses `stationDef(station.currentStation).modules` for labels/art and calls the resolver with that id. Intro/view modes resolve `null` on the Continue/tap-anywhere dismiss.

- [ ] **Step 6: Verify in preview**

Run the preview (`preview_start` → `sliding-stars-dev`), open the station via the 🛰 HUD button and via a win that triggers expansion; confirm Zena+Pepper render, Pepper walks up with the bubble on expansion, header shows score + station count, and picking a module returns and builds it. Screenshot for the user.

- [ ] **Step 7: Commit**

```bash
git add src/render/station.ts src/main.ts
git commit -m "feat(render): ship interior with Zena & Pepper; picker returns module id"
```

---

## Task 9: Art — door house, box wear, station 2, interior, celebration polish

**Files:**
- Modify: `scripts/gen-art.mjs` (prompts), `scripts/clean-art.mjs` (roster), `src/render/textures.ts` (asset registry), `src/render/boardView.ts` (dome door + facing flip; box wear swap), `src/render/celebrate.ts` (crew/confetti)

**Interfaces:**
- Produces: `public/art/` PNGs: `home` updated (visible door), `box`/`box-cracked`/`box-crumbling` (or reuse `canister*`), station-2 `module-*` (6) + `vip-*` (12), optional `station-interior.png`.

- [ ] **Step 1: Add prompts to `scripts/gen-art.mjs`** for: a house/dome with a clear lit airlock door on the right side (code flips for left); two box wear stages (cracked, crumbling) matching the existing box; the 6 Boardwalk modules (arcade, diner, cinema, bakery, library, gym); the 12 Boardwalk VIPs; optional cozy ship-interior backdrop. Match the existing chunky pixel-art style params already in the script.

- [ ] **Step 2: Generate + clean**

```bash
# key loaded at runtime from the ams2 .env, never committed
export OPENAI_API_KEY=$(grep -E '^OPENAI_API_KEY=' "/h/Program Files/ams2-setup-coach/.env" | cut -d= -f2-)
node scripts/gen-art.mjs   # only the new asset keys
node scripts/clean-art.mjs
```
Add the new names to the `CHARACTERS` array in `scripts/clean-art.mjs`.

- [ ] **Step 3: Register textures** — `src/render/textures.ts`

Add the new keys to `IMAGE_ASSETS`/`TextureSet` (box wear stages, station-2 modules/vips, `stationInterior`), following the existing loader pattern. Station module/VIP textures already load via the roster; ensure the loader iterates `STATIONS.flatMap(...)` so station-2 art is included.

- [ ] **Step 4: Dome door + facing in `boardView.ts`**

Where a dome cell is textured, use the door sprite and flip horizontally when `piece.facing === 'left'` (`sprite.scale.x = -Math.abs(sprite.scale.x)`). Where a canister is textured, pick the wear sprite by `overlay.hp` (3→pristine, 2→cracked, 1→crumbling).

- [ ] **Step 5: Escalating celebration** — `src/render/celebrate.ts`

Scale the celebration with `stationsCompleted`: more crew sprites / confetti particles for higher counts.

- [ ] **Step 6: Verify in preview + commit**

Confirm the door is visible and on the correct side, boxes visibly wear across hits, and station-2 art appears. Screenshot for the user.

```bash
git add scripts/gen-art.mjs scripts/clean-art.mjs src/render/textures.ts src/render/boardView.ts src/render/celebrate.ts public/art
git commit -m "art: door house, box wear stages, Boardwalk Ring station, interior"
```

---

## Task 10: Tutorials

**Files:**
- Modify: `src/render/tip.ts` (door tip + box-wear copy), `src/main.ts` or `src/render/station.ts` (new-station note)

- [ ] **Step 1: Door tip** — add a one-time coaching card keyed `door`, shown the first time a station (dome) is on the board: "Stations rescue from their **door** only — slide an astronaut onto the lit doorway to bring them home."

- [ ] **Step 2: Box-wear copy** — update the `boxes` tip: "Supply boxes take a few hits — land matches beside them to wear them down and crack them open."

- [ ] **Step 3: New-station note** — the first time `station.currentStation` increases (or `stationsCompleted >= 1` and a new station begins), show a one-time note: "A brand-new station! Rescue its crew to fill it out." (localStorage-keyed like the other tips.)

- [ ] **Step 4: Verify + commit**

```bash
git add src/render/tip.ts src/main.ts src/render/station.ts
git commit -m "feat(tutorial): door, box-wear, and new-station tips"
```

---

## Task 11: Full verification, deploy, memory

- [ ] **Step 1: Full gate**

Run: `npm run typecheck && npx vitest run && npm run build`
Expected: typecheck clean, all tests PASS (incl. 1..70 sweep), build OK.

- [ ] **Step 2: Live smoke test** in the preview — box wears across 3 hits then refills; a survivor is rescued only on the door cell; station expansion shows Pepper's question; completing station 1 (or a forced dev completion) shows the finale once, celebration after. Screenshot for the user.

- [ ] **Step 3: Bump SW cache** — `public/sw.js` `CACHE = 'sliding-stars-v7'`.

- [ ] **Step 4: One batched deploy**

```bash
npm run build
CLOUDFLARE_ACCOUNT_ID=6d17634ca2607e47e334174f0cf56c7e npx --yes wrangler@latest pages deploy dist --project-name=sliding-stars --branch=main --commit-dirty=true
```
Verify production serves the new hashed JS + `sliding-stars-v7` (cache-busted curl).

- [ ] **Step 5: Update memory** — revise `sliding-stars-mechanic` (rescue = door cell; boards may have interior holes) and `sliding-stars-project` (multi-station system, finale = first-station-complete). Tag `git tag checkpoint-plan-e`.

---

## Self-Review

**Spec coverage:**
- Door rescue → Tasks 1, 2 (+ render in 8/9, tip in 10). ✓
- Box wear (3-hit, per-match, visible) → Task 3 (+ wear sprites in 9, tip in 10). ✓
- Mid-board gaps → confirmed existing; optional density note in Task 4. ✓
- Multi-station (catalog, state, finale re-anchor, overall score, station count) → Tasks 5, 6, 7 (+ header in 8). ✓
- Zena/Pepper interior + "what to add next" → Task 8. ✓
- Art (2 stations, door, wear, interior) → Task 9. Tutorials → Task 10. Solver re-verify → Task 4. Batched deploy + SW bump + memory → Task 11. ✓

**Placeholder scan:** none — code shown for every logic step; render/art steps give exact files, representative code, and preview verification (these are not unit-testable and are validated visually).

**Type consistency:** `Piece` dome `{ kind:'dome'; facing }` used identically in types/resolve/level/animator/boardView; `chooseFacing`/`doorCell` signatures match across dome.ts, resolve.ts, level.ts, game.ts; `buildModule` returns `{ state, completed }` in station.ts and is consumed that way in main.ts; `showStation` resolves `string | null` in station.ts and is awaited as such in main.ts.
