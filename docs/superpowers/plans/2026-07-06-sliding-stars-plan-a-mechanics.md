# Plan A — Core Match Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add L/T/+ junction matches, tighten and always-show the drift timer, make board size/shape ramp with the level, and gate the birthday ribbon to July 5–19 — all while keeping every generated level solver-verified.

**Architecture:** Pure core (`src/core/`, zero render imports) emits `GameEvent[]`; the render layer consumes them. Junction detection is a pure function in `match.ts`; resolution folds into `resolve.ts` ahead of the existing straight-run loop. Timer and board variety are generator params already threaded through `loadLevel`. Variable board size requires the render layer to recompute layout per level (new `BoardView.relayout`) and redraw a per-cell board frame.

**Tech Stack:** TypeScript (strict) · PixiJS v8 · Vite · Vitest.

## Global Constraints

- **Pure core:** files under `src/core/` MUST NOT import anything from `src/render/` or `pixi.js` (enforced by `tests/core/purity.test.ts`).
- **LOCKED core loop:** full board, matches merge up one tier, max-tier (tier 5) match builds a Space Station (`dome`), astronaut rides its tile, on/next-to a station = rescued. NO rafts/pods created by matches.
- **Solver-verified:** every generated level MUST pass `makeSolvableLevel` (solver finds a win); the sweep test `tests/core/generator.test.ts` covering levels 1..40 MUST stay green.
- **Tiers:** `Tier = 1|2|3|4|5`, `MAX_TIER = 5`. Tiers 1–3 are unsafe (survivors drift), 4–5 are solid ground.
- **Test command:** `npm test` (runs `vitest run`). Typecheck: `npm run typecheck`. Build: `npm run build`.
- **iPhone target:** primary device is iPhone Safari; tiles must stay tappable (≥ ~34px) on the largest boards.

---

## Task 1: Junction detection (`findJunctions`)

**Files:**
- Modify: `src/core/match.ts`
- Test: `tests/core/match.test.ts`

**Interfaces:**
- Consumes: `Match = { cells: Pos[]; tier: Tier; dir: 'h' | 'v' }` and `findMatches(state)` (already in `match.ts`).
- Produces: `type Junction = { cells: Pos[]; tier: Tier; pivot: Pos }` and `findJunctions(matches: Match[], movedCell: Pos | null): Junction[]`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/core/match.test.ts`:

```ts
import { findMatches, findJunctions } from '../../src/core/match';
import { loadLevel } from '../../src/core/level';
import type { LevelDef } from '../../src/core/types';

function boardFor(tiles: string[]) {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = { id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 0 }, seed: 1 };
  return loadLevel(def);
}

test('L shape (corner shared) is one junction with pivot at the corner', () => {
  // tier-2 vertical down column 0 (rows 0..2) + horizontal across row 0 (cols 0..2)
  const s = boardFor(['221', '235', '245']);
  const js = findJunctions(findMatches(s), { r: 0, c: 0 });
  expect(js).toHaveLength(1);
  expect(js[0]!.tier).toBe(2);
  expect(js[0]!.pivot).toEqual({ r: 0, c: 0 });
  expect(js[0]!.cells).toHaveLength(5); // 3 + 3 - 1 shared
});

test('T shape shares a mid cell; pivot prefers the moved cell', () => {
  // horizontal tier-3 across row 1 (cols 0..2) + vertical tier-3 down col 1 (rows 0..2)
  const s = boardFor(['131', '333', '141']);
  const js = findJunctions(findMatches(s), { r: 1, c: 1 });
  expect(js).toHaveLength(1);
  expect(js[0]!.pivot).toEqual({ r: 1, c: 1 });
  expect(js[0]!.cells).toHaveLength(5);
});

test('a straight run with no perpendicular partner is NOT a junction', () => {
  const s = boardFor(['111', '234', '235']);
  expect(findJunctions(findMatches(s), { r: 0, c: 0 })).toHaveLength(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- match`
Expected: FAIL — `findJunctions is not a function` / `findJunctions is not exported`.

- [ ] **Step 3: Implement `findJunctions`**

Append to `src/core/match.ts` (after the existing `findMatches`):

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- match`
Expected: PASS (all match tests, including the three new ones).

- [ ] **Step 5: Commit**

```bash
git add src/core/match.ts tests/core/match.test.ts
git commit -m "feat(core): detect L/T/+ junction matches"
```

---

## Task 2: Junction resolution

**Files:**
- Modify: `src/core/resolve.ts`
- Test: `tests/core/resolve.test.ts`

**Interfaces:**
- Consumes: `findJunctions`, `findMatches` (Task 1), `MAX_TIER`, `Piece`, `Tier`, `Pos`.
- Produces: unchanged signature `resolveMatchesOnce(state, movedCell, events): boolean`, now resolving junctions before straight runs.

- [ ] **Step 1: Write the failing tests**

Append to `tests/core/resolve.test.ts`:

```ts
test('L junction merges up one tier at the pivot (corner)', () => {
  const s = level(['221', '235', '245']);
  const ev: GameEvent[] = [];
  expect(resolveMatchesOnce(s, { r: 0, c: 0 }, ev)).toBe(true);
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 3 }); // merged up at pivot
  expect(s.grid[0]![1]).toBeNull();
  expect(s.grid[2]![0]).toBeNull();
  expect(ev.some((e) => e.type === 'merge' && e.anchor.r === 0 && e.anchor.c === 0)).toBe(true);
});

test('tier-5 junction builds a space station at the pivot', () => {
  const s = level(['551', '535', '545']);
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 0, c: 0 }, ev);
  expect(s.grid[0]![0]).toEqual({ kind: 'dome' });
  expect(ev.some((e) => e.type === 'domeCreated')).toBe(true);
});

test('survivor on a junction arm is swept to the pivot', () => {
  const s = loadLevel({
    id: 0, mask: ['###', '###', '###'], tiles: ['221', '235', '245'],
    survivors: [{ r: 2, c: 0 }], goal: { type: 'rescueN', n: 1 }, seed: 1,
  });
  const ev: GameEvent[] = [];
  resolveMatchesOnce(s, { r: 0, c: 0 }, ev);
  expect(s.survivors[0]).toMatchObject({ r: 0, c: 0 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- resolve`
Expected: FAIL — L junction currently resolves as two separate straight merges, so `s.grid[0][0]` is not the single merged pivot result.

- [ ] **Step 3: Implement junction resolution**

In `src/core/resolve.ts`, change the import line:

```ts
import { findMatches, findJunctions } from './match';
```

Then replace the body of `resolveMatchesOnce` from `const matches = findMatches(state);` down to (but not including) the existing `for (const m of matches) {` loop, inserting the junction pass right after `let any = false;`:

```ts
  const matches = findMatches(state);
  const junctions = findJunctions(matches, movedCell);
  let any = false;

  // Junctions (L/T/+) resolve first: a single merged result at the shared pivot.
  for (const j of junctions) {
    const live = j.cells.filter((p) => {
      const piece = state.grid[p.r]![p.c];
      return piece?.kind === 'tile' && piece.tier === j.tier;
    });
    if (live.length < 5) continue; // both arms must survive (3 + 3 - 1 shared)
    any = true;
    let result: Piece;
    if (j.tier === MAX_TIER) {
      result = { kind: 'dome' };
      events.push({ type: 'merge', cells: live, anchor: j.pivot, newTier: MAX_TIER });
      events.push({ type: 'domeCreated', at: j.pivot });
    } else {
      const newTier = (j.tier + 1) as Tier;
      result = { kind: 'tile', tier: newTier };
      events.push({ type: 'merge', cells: live, anchor: j.pivot, newTier });
    }
    for (const p of live) state.grid[p.r]![p.c] = null;
    state.grid[j.pivot.r]![j.pivot.c] = result;
    for (const sv of state.survivors) {
      if (sv.state === 'housed' || sv.state === 'lost') continue;
      if (live.some((p) => p.r === sv.r && p.c === sv.c)) { sv.r = j.pivot.r; sv.c = j.pivot.c; }
    }
  }

```

The existing `for (const m of matches) { ... }` loop stays exactly as-is beneath this — any straight run whose cells a junction already nulled now fails its own `live.length < 3` guard and is skipped.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- resolve`
Expected: PASS (new junction tests plus all existing straight-run tests).

- [ ] **Step 5: Run the full suite + solver sweep**

Run: `npm test`
Expected: PASS — in particular `tests/core/generator.test.ts` "every generated level 1..40 is solver-verified beatable" stays green (junctions only add solvability).

- [ ] **Step 6: Commit**

```bash
git add src/core/resolve.ts tests/core/resolve.test.ts
git commit -m "feat(core): resolve L/T/+ junctions as one merge at the pivot"
```

---

## Task 3: Tighten the drift timer (generator ramp)

**Files:**
- Modify: `src/core/generator.ts`
- Test: `tests/core/generator.test.ts`

**Interfaces:**
- Consumes: `paramsForLevel`, `generateLevel`, `GenParams` (in `generator.ts`); `loadLevel` already reads `def.needMoves ?? 12` and `def.moveLimit ?? null`.
- Produces: `GenParams` gains `needMoves: number` and optional `moveLimit?: number`; `generateLevel` writes them into the `LevelDef`.

- [ ] **Step 1: Write the failing test**

Append to `tests/core/generator.test.ts`:

```ts
test('drift timer tightens with level; collect levels get a move budget', () => {
  expect(paramsForLevel(1).needMoves).toBe(12);
  expect(paramsForLevel(40).needMoves).toBe(8); // floors at 8
  expect(paramsForLevel(1).needMoves).toBeGreaterThan(paramsForLevel(40).needMoves);
  // collect levels (every 4th from 4) carry a global turn budget; rescue levels don't
  expect(paramsForLevel(4).moveLimit).toBeGreaterThan(0);
  expect(paramsForLevel(1).moveLimit).toBeUndefined();
  // the tightened timer is written through to the generated level
  expect(generateLevel(1, 123, paramsForLevel(1)).needMoves).toBe(12);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- generator`
Expected: FAIL — `needMoves`/`moveLimit` are not on `GenParams` yet.

- [ ] **Step 3: Extend `GenParams` and `paramsForLevel`**

In `src/core/generator.ts`, replace the `GenParams` interface with:

```ts
export interface GenParams { rows: number; cols: number; cornerCut: number; survivors: number; goal: 'rescueN' | 'collectN'; goalN: number; canisters: number; needMoves: number; moveLimit?: number; }
```

Then in `paramsForLevel`, add the `needMoves` line and return it (keep the existing `rows`/`cols`/`cornerCut`/goal logic untouched for now — board size changes land in Task 5):

```ts
  const needMoves = Math.max(8, 12 - Math.floor(index / 8));
  return {
    rows, cols, cornerCut,
    survivors: isCollect ? 0 : goalN,
    goal: isCollect ? 'collectN' : 'rescueN',
    goalN,
    canisters: isCollect ? goalN + 1 : 0,
    needMoves,
    ...(isCollect ? { moveLimit: 40 } : {}),
  };
```

- [ ] **Step 4: Write the timer + budget through `generateLevel`**

In `src/core/generator.ts`, in the object returned by `generateLevel`, replace `needMoves: 30,` with:

```ts
    needMoves: p.needMoves,
    ...(p.moveLimit !== undefined ? { moveLimit: p.moveLimit } : {}),
```

And update the `makeSolvableLevel` fallback line to clear the budget on the relaxed level:

```ts
  return generateLevel(index, index * 7919, { ...p, goal: 'rescueN', goalN: 1, survivors: 1, canisters: 0, moveLimit: undefined });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- generator`
Expected: PASS. Then run the full suite:

Run: `npm test`
Expected: PASS — the 1..40 solver sweep still green under the tightened timer (unsolvable seeds are retried; the fallback relaxes if needed).

- [ ] **Step 6: Commit**

```bash
git add src/core/generator.ts tests/core/generator.test.ts
git commit -m "feat(core): ramp drift timer 12->8 and budget collect levels"
```

---

## Task 4: Always-visible rescue countdown

**Files:**
- Modify: `src/render/boardView.ts`
- Verify: `npm run typecheck`, `npm run build`, browser device check (no unit test — this is pure rendering, matching the existing render layer which is verified visually).

**Interfaces:**
- Consumes: `BoardState.survivors[].need.movesLeft`, `NEED_URGENT` from `./palette`.
- Produces: a numeric countdown label on each adrift survivor node, plus the bar/bubble shown whenever a `need` exists (not only near zero).

- [ ] **Step 1: Import `Text` and drop the now-unused `CALLOUT_AT`**

In `src/render/boardView.ts`, change the pixi import to include `Text`:

```ts
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
```

and change the palette import to:

```ts
import { NEED_URGENT } from './palette';
```

- [ ] **Step 2: Add a countdown label to the survivor node**

In `makeSurvivorNode`, immediately before `return node;`, insert:

```ts
    const count = new Text({
      text: '',
      style: { fill: 0xffffff, fontSize: Math.max(9, tileSize * 0.2), fontWeight: '800', fontFamily: 'system-ui, sans-serif' },
    });
    count.label = 'count';
    count.anchor.set(0.5);
    count.y = -tileSize * 0.54;
    node.addChild(count);
```

- [ ] **Step 3: Show bubble/bar/count whenever a need exists**

In `syncSurvivors`, replace the block starting at `const callingOut =` through `if (sv.need && callingOut) this.updateNeed(sv.id, sv.need.movesLeft);` with:

```ts
      const hasNeed = sv.need !== null;
      const bubble = node.getChildByLabel('bubble') as Sprite;
      bubble.texture = sv.need?.type === 'shelter' ? this.textures.bubbleShelter : this.textures.bubbleRescue;
      bubble.visible = hasNeed;
      (node.getChildByLabel('bar') as Graphics).visible = hasNeed;
      (node.getChildByLabel('count') as Text).visible = hasNeed;
      if (sv.need) this.updateNeed(sv.id, sv.need.movesLeft);
```

- [ ] **Step 4: Rewrite `updateNeed` to always render (no calling gate)**

Replace the whole `updateNeed` method body with:

```ts
  /** Redraw the always-on countdown (number + bar) for a survivor. */
  updateNeed(id: number, movesLeft: number): void {
    const node = this.survivorNodes.get(id);
    if (!node) return;
    const bar = node.getChildByLabel('bar') as Graphics | null;
    const bubble = node.getChildByLabel('bubble') as Sprite | null;
    const count = node.getChildByLabel('count') as Text | null;
    const urgent = movesLeft <= 3;
    const color = urgent ? NEED_URGENT : movesLeft <= 6 ? 0xffd28a : 0xffffff;
    if (count) { count.text = String(Math.max(0, movesLeft)); count.tint = color; }
    if (bubble) bubble.tint = color;
    if (!bar) return;
    const ts = this.layout.tileSize;
    const frac = Math.max(0, Math.min(1, movesLeft / this.needMoves));
    const w = ts * 0.6, h = Math.max(2.5, ts * 0.05);
    bar.clear();
    bar.roundRect(-w / 2, 0, w, h, h / 2).fill({ color: 0x0c0f20, alpha: 0.8 });
    bar.roundRect(-w / 2, 0, w * frac, h, h / 2).fill(urgent ? NEED_URGENT : frac > 0.5 ? 0xffffff : 0xf0c040);
  }
```

- [ ] **Step 5: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 6: Browser device check**

Start dev server, open level 1, confirm an adrift astronaut shows a ticking number that starts at the level's `needMoves` and turns amber (≤6) then red (≤3). Take a screenshot for the user.

- [ ] **Step 7: Commit**

```bash
git add src/render/boardView.ts
git commit -m "feat(render): show rescue countdown on adrift astronauts from move one"
```

---

## Task 5: Variable board size

**Files:**
- Modify: `src/core/generator.ts`
- Test: `tests/core/generator.test.ts`, `tests/render/layout.test.ts`

**Interfaces:**
- Consumes: `paramsForLevel` (Task 3), `computeLayout` (unchanged).
- Produces: `paramsForLevel(index).rows/cols` now ramp by band (6×5 → 7×6 → 8×6 → 8×7 → 9×7).

- [ ] **Step 1: Update the failing tests**

In `tests/core/generator.test.ts`, replace the `'difficulty params: fixed board size...'` test with:

```ts
test('difficulty params: size ramps by band, goals rotate, timer tightens', () => {
  expect(paramsForLevel(1).rows).toBe(6);
  expect(paramsForLevel(1).cols).toBe(5);
  expect(paramsForLevel(30).rows).toBe(9);
  expect(paramsForLevel(30).cols).toBe(7);
  expect(paramsForLevel(4).goal).toBe('collectN');
  expect(paramsForLevel(1).goal).toBe('rescueN');
  expect(paramsForLevel(1).cornerCut).toBe(0);
  expect(paramsForLevel(12).cornerCut).toBe(2);
});
```

In `tests/render/layout.test.ts`, append a case proving the largest board still fits an iPhone width and stays tappable:

```ts
test('largest board (9x7) fits iPhone width with tappable tiles', () => {
  const { tileSize, originX, gap } = computeLayout(9, 7, 375, 812);
  expect(originX + 7 * tileSize + 6 * gap).toBeLessThanOrEqual(375.01);
  expect(tileSize).toBeGreaterThanOrEqual(34);
});
```

(If `computeLayout` is not already imported at the top of `layout.test.ts`, add `import { computeLayout } from '../../src/render/layout';`.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- generator layout`
Expected: FAIL — `paramsForLevel(1).rows` is still 7.

- [ ] **Step 3: Add the size bands**

In `src/core/generator.ts`, add this helper above `paramsForLevel`:

```ts
/** Board dimensions ramp with the level (small/full early → larger late). */
function boardSize(index: number): { rows: number; cols: number } {
  if (index <= 3) return { rows: 6, cols: 5 };
  if (index <= 8) return { rows: 7, cols: 6 };
  if (index <= 15) return { rows: 8, cols: 6 };
  if (index <= 25) return { rows: 8, cols: 7 };
  return { rows: 9, cols: 7 };
}
```

Then in `paramsForLevel`, replace the fixed:

```ts
  const rows = 7;
  const cols = 6;
```

with:

```ts
  const { rows, cols } = boardSize(index);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- generator layout`
Expected: PASS. Then the full suite:

Run: `npm test`
Expected: PASS — the 1..40 solver sweep still green on the new sizes (the solver and gravity are already mask/size-aware).

- [ ] **Step 5: Commit**

```bash
git add src/core/generator.ts tests/core/generator.test.ts tests/render/layout.test.ts
git commit -m "feat(core): ramp board size by level band (6x5 -> 9x7)"
```

---

## Task 6: Interior holes for later boards

**Files:**
- Modify: `src/core/generator.ts`
- Test: `tests/core/generator.test.ts`

**Interfaces:**
- Consumes: `createRng` (already imported), `paramsForLevel`, `generateLevel`.
- Produces: `GenParams` gains `holes: number`; `generateLevel` carves that many interior out-of-mask cells.

- [ ] **Step 1: Write the failing test**

Append to `tests/core/generator.test.ts`:

```ts
test('later levels carve interior holes but stay solvable', () => {
  expect(paramsForLevel(1).holes).toBe(0);
  expect(paramsForLevel(30).holes).toBeGreaterThan(0);
  const def = makeSolvableLevel(30);
  const holeCount = def.mask.join('').split('').filter((ch) => ch === '.').length;
  expect(holeCount).toBeGreaterThan(0); // has out-of-mask cells
  expect(solve(def, 100).solved).toBe(true); // still beatable
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- generator`
Expected: FAIL — `holes` is not on `GenParams`.

- [ ] **Step 3: Add `holes` to params and a `punchHoles` helper**

In `src/core/generator.ts`, add `holes: number;` to the `GenParams` interface (end of the interface):

```ts
export interface GenParams { rows: number; cols: number; cornerCut: number; survivors: number; goal: 'rescueN' | 'collectN'; goalN: number; canisters: number; needMoves: number; moveLimit?: number; holes: number; }
```

In `paramsForLevel`, add the holes computation next to `cornerCut`:

```ts
  const holes = index >= 16 ? Math.min(3, 1 + Math.floor((index - 16) / 10)) : 0;
```

and include `holes,` in the returned object.

Add the helper next to `cutCorners`:

```ts
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
```

In `generateLevel`, right after `cutCorners(mask, p.cornerCut);`, add:

```ts
  if (p.holes > 0) punchHoles(mask, p.holes, rng);
```

Also add `holes: 0` to the `makeSolvableLevel` fallback params object:

```ts
  return generateLevel(index, index * 7919, { ...p, goal: 'rescueN', goalN: 1, survivors: 1, canisters: 0, moveLimit: undefined, holes: 0 });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- generator`
Expected: PASS. Then full suite:

Run: `npm test`
Expected: PASS — holes that would strand survivors or make a seed unsolvable are rejected by `makeSolvableLevel`'s solver check and retried.

- [ ] **Step 5: Commit**

```bash
git add src/core/generator.ts tests/core/generator.test.ts
git commit -m "feat(core): carve interior holes into later boards (solver-verified)"
```

---

## Task 7: Per-level relayout + per-cell board frame (render holes)

**Files:**
- Modify: `src/render/boardView.ts`, `src/render/background.ts`, `src/main.ts`
- Verify: `npm run typecheck`, `npm run build`, browser device check.

**Interfaces:**
- Consumes: `computeLayout`, `Layout` (from `./layout`), `BoardState.mask`.
- Produces: `BoardView.layout` becomes reassignable; new `BoardView.relayout(state)`; new `drawBoardFrame(container, mask, layout)` in `background.ts`.

- [ ] **Step 1: Make `BoardView.layout` reassignable and add `relayout`**

In `src/render/boardView.ts`, change the field declaration:

```ts
  readonly layout: Layout;
```

to:

```ts
  layout: Layout;
```

Add this method (e.g. right after the constructor):

```ts
  /** Recompute layout for a (possibly different-sized) level and re-sync. */
  relayout(state: BoardState): void {
    this.layout = computeLayout(state.rows, state.cols, this.app.screen.width, this.app.screen.height);
    this.syncFrom(state);
  }
```

- [ ] **Step 2: Add `drawBoardFrame` to `background.ts`**

In `src/render/background.ts`, add the `Layout` import at the top:

```ts
import type { Layout } from './layout';
```

and append this function (you can keep `addBoardTray` for now; it will simply no longer be called):

```ts
/**
 * Recessed backing behind each in-mask cell plus a soft outer frame. Holes
 * (out-of-mask cells) get no backing, so they read as open space. Redrawn per
 * level because board size varies. `container` is cleared first.
 */
export function drawBoardFrame(container: Container, mask: boolean[][], layout: Layout): void {
  container.removeChildren();
  const { tileSize, gap, originX, originY } = layout;
  const rows = mask.length, cols = mask[0]?.length ?? 0;
  const radius = tileSize * 0.18;
  const w = cols * tileSize + (cols - 1) * gap;
  const h = rows * tileSize + (rows - 1) * gap;
  const g = new Graphics();
  g.roundRect(originX - 10, originY - 10, w + 20, h + 20, radius + 10).fill({ color: 0x191538, alpha: 0.5 });
  g.roundRect(originX - 10, originY - 10, w + 20, h + 20, radius + 10).stroke({ color: 0x8a7ae0, width: 2, alpha: 0.45 });
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!mask[r]![c]) continue;
      const x = originX + c * (tileSize + gap), y = originY + r * (tileSize + gap);
      g.roundRect(x, y, tileSize, tileSize, radius).fill({ color: 0x05060f, alpha: 0.35 });
      g.roundRect(x + 2, y + 2, tileSize - 4, tileSize - 4, radius * 0.85).stroke({ color: 0x8a7ae0, width: 1, alpha: 0.14 });
    }
  container.addChild(g);
}
```

- [ ] **Step 3: Wire the frame into `main.ts` and redraw per level**

In `src/main.ts`:

Change the pixi/background imports:

```ts
import { Container } from 'pixi.js';
import { addBackground, drawBoardFrame } from './render/background';
```

Replace the board-tray setup block:

```ts
  const layout = computeLayout(state.rows, state.cols, app.screen.width, app.screen.height);
  const { tileSize } = layout;
  // framed tray behind the grid (top-game convention: the board is furniture)
  const boardW = state.cols * tileSize + (state.cols - 1) * layout.gap;
  const boardH = state.rows * tileSize + (state.rows - 1) * layout.gap;
  addBoardTray(layers.board, layout.originX, layout.originY, boardW, boardH, tileSize * 0.18);
  const textures = await loadTextures(app, Math.ceil(tileSize * 2)); // generated art + procedural fallback
```

with:

```ts
  const layout = computeLayout(state.rows, state.cols, app.screen.width, app.screen.height);
  const { tileSize } = layout;
  // per-cell board frame, redrawn each level (board size varies)
  const boardFrame = new Container();
  layers.board.addChild(boardFrame);
  const textures = await loadTextures(app, Math.ceil(tileSize * 2)); // generated art + procedural fallback
```

After `const view = new BoardView(app, layers, textures, state);`, add:

```ts
  drawBoardFrame(boardFrame, state.mask, view.layout);
```

In `startLevel`, replace `view.syncFrom(state);` with:

```ts
    view.relayout(state);
    drawBoardFrame(boardFrame, state.mask, view.layout);
```

- [ ] **Step 4: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: no type errors (confirm `computeLayout`/`addBoardTray`/`boardW`/`boardH` are no longer referenced as removed); build succeeds.

- [ ] **Step 5: Browser device check across sizes**

Start the dev server. Verify level 1 (6×5) is centered with per-cell backings. Then in the console set a later level and reload to confirm the board re-lays-out and holes show as open space:

```js
localStorage.setItem('sliding-stars-level','30'); location.reload();
```

Confirm the 9×7 board fits, tiles are still tappable, and interior holes render as gaps (no backing). Screenshot both for the user. Reset with `localStorage.setItem('sliding-stars-level','1')` when done.

- [ ] **Step 6: Commit**

```bash
git add src/render/boardView.ts src/render/background.ts src/main.ts
git commit -m "feat(render): per-level relayout + per-cell frame so holes read as open space"
```

---

## Task 8: Birthday-window ribbon

**Files:**
- Create: `src/render/birthday.ts`
- Modify: `src/render/title.ts`
- Test: `tests/render/birthday.test.ts`

**Interfaces:**
- Produces: `isBirthdayWindow(now?: Date): boolean` (pure, no pixi import).
- Consumes: used by `showTitle` to conditionally add the dedication ribbon.

- [ ] **Step 1: Write the failing test**

Create `tests/render/birthday.test.ts`:

```ts
import { isBirthdayWindow } from '../../src/render/birthday';

test('birthday window is July 5–19 inclusive (month is 0-indexed)', () => {
  expect(isBirthdayWindow(new Date(2026, 6, 12))).toBe(true); // Jul 12
  expect(isBirthdayWindow(new Date(2026, 6, 5))).toBe(true);  // Jul 5
  expect(isBirthdayWindow(new Date(2026, 6, 19))).toBe(true); // Jul 19
  expect(isBirthdayWindow(new Date(2026, 6, 4))).toBe(false); // Jul 4
  expect(isBirthdayWindow(new Date(2026, 6, 20))).toBe(false); // Jul 20
  expect(isBirthdayWindow(new Date(2026, 5, 12))).toBe(false); // Jun 12
  expect(isBirthdayWindow(new Date(2027, 6, 12))).toBe(true);  // recurs yearly
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- birthday`
Expected: FAIL — module `src/render/birthday.ts` does not exist.

- [ ] **Step 3: Create the pure helper**

Create `src/render/birthday.ts`:

```ts
/**
 * Zena's birthday window: July 5–19 (the week before through the week after
 * July 12), any year. Month is 0-indexed in JS Date, so July is 6.
 */
export function isBirthdayWindow(now: Date = new Date()): boolean {
  return now.getMonth() === 6 && now.getDate() >= 5 && now.getDate() <= 19;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- birthday`
Expected: PASS.

- [ ] **Step 5: Gate the ribbon in `title.ts`**

In `src/render/title.ts`, add the import near the top:

```ts
import { isBirthdayWindow } from './birthday';
```

Wrap the dedication-ribbon block (from `const dediText = new Text({` through the line `root.addChild(ribbon);`) in a guard:

```ts
  if (isBirthdayWindow()) {
    const dediText = new Text({
      text: 'Happy Birthday, Zena ♥',
      style: { fill: 0xffffff, fontSize: W * 0.05, fontWeight: '700', fontFamily: 'system-ui, sans-serif' },
    });
    dediText.anchor.set(0.5);
    const ribW = dediText.width + W * 0.1, ribH = dediText.height + H * 0.02;
    const ribbon = new Container();
    const ribBg = new Graphics()
      .roundRect(-ribW / 2, -ribH / 2, ribW, ribH, ribH / 2)
      .fill(new FillGradient({
        type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
        colorStops: [{ offset: 0, color: 0xe0568c }, { offset: 1, color: 0xb83a6e }],
        textureSpace: 'local',
      }));
    ribBg.roundRect(-ribW / 2, -ribH / 2, ribW, ribH, ribH / 2).stroke({ color: 0xffd0e4, width: 2 });
    ribbon.addChild(ribBg, dediText);
    ribbon.x = W / 2; ribbon.y = H * 0.29;
    ribbon.rotation = -0.03;
    root.addChild(ribbon);
  }
```

- [ ] **Step 6: Typecheck, build, and browser-verify**

Run: `npm run typecheck && npm run build`
Expected: succeeds. In the browser (today is within the window) confirm the ribbon shows; screenshot for the user.

- [ ] **Step 7: Commit**

```bash
git add src/render/birthday.ts src/render/title.ts tests/render/birthday.test.ts
git commit -m "feat(render): show birthday ribbon only July 5-19"
```

---

## Task 9: Full-suite verification, device pass, deploy

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all suites PASS, including the 1..40 solver sweep and the new junction/timer/board tests.

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: no errors; production build succeeds.

- [ ] **Step 3: Device feel pass**

In the browser, play the opening levels via the real input path (or `window.__game.applyMove(a, b)`), confirming: an L/T swap merges to one tile at the corner; adrift astronauts show a ticking countdown; boards vary in size; the birthday ribbon shows. Check the console for errors. Screenshot the junction merge and a later variable-size board for the user.

- [ ] **Step 4: Deploy (user has standing approval for this private birthday site)**

Deploy the built site to the existing Netlify site `bc41ec96-bbad-4e56-b0d1-c612c54db038` (`sliding-stars.netlify.app`) via the established `@netlify/mcp` deploy flow. Report the live URL to the user.

---

## Self-Review

**Spec coverage (Plan A = spec features 1–4):**
- Feature 1 (junctions) → Tasks 1–2. ✓ L/T/+ detection + resolution at pivot, tier-5 → station, survivor sweep, straight runs unaffected.
- Feature 2 (drift timer) → Tasks 3 (ramp 12→8 + select-level budget) and 4 (always-visible countdown). ✓
- Feature 3 (variable boards) → Tasks 5 (size bands), 6 (interior holes), 7 (per-level relayout + hole rendering). ✓ Solver-verified via the sweep in each task.
- Feature 4 (birthday window) → Task 8. ✓ July 5–19, recurs yearly.

**Placeholder scan:** every code step contains complete code; no TBD/TODO/"handle edge cases". ✓

**Type consistency:** `Junction`/`findJunctions(matches, movedCell)` defined in Task 1 and consumed with the same signature in Task 2. `GenParams` gains `needMoves`/`moveLimit` (Task 3) then `holes` (Task 6); every `paramsForLevel` return and the `makeSolvableLevel` fallback include all three by the end. `BoardView.layout` made reassignable (Task 7) before `relayout` uses it. `drawBoardFrame(container, mask, layout)` signature matches its `main.ts` call sites. `updateNeed(id, movesLeft)` signature unchanged (Task 4), so the animator's existing calls still typecheck. ✓

**Note for the implementer:** Tasks 5–6 change `paramsForLevel`'s return shape; if any test beyond `tests/core/generator.test.ts` asserts a fixed board size, update it to the new bands (a repo-wide check found only `generator.test.ts` and the `layout.test.ts` fit-case, both handled here).
