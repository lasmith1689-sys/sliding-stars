# Plan B2 — Rescue Rover Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans / subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the **Rescue Rover** — a space-native version of Sliding Seas' rideable "turtle" ferry. A rover is a mobile platform carrying a stranded astronaut; it auto-navigates toward the nearest Space Station and its rider is rescued when it reaches one. Keeps every generated level solver-verified.

**Architecture:** A rover is an **entity** (like survivors), not a grid piece or overlay — it rides on top of the tile grid and does not participate in matching or gravity. Each real move, every rover steps one cell toward the nearest `dome` (station) over passable cells; its rider (a normal `Survivor`, kept safe/`grounded` while aboard) moves with it and is rescued by the existing station-adjacency pass. No new goal type — a rover's rider counts toward `rescueN`.

**Tech Stack:** TypeScript (strict) · PixiJS v8 · Vite · Vitest.

## Global Constraints

- **Pure core:** `src/core/` MUST NOT import render/pixi (enforced by `tests/core/purity.test.ts`).
- **LOCKED loop** unchanged; rovers are additive.
- **Solver-verified:** the sweep (levels 1..40) MUST stay green.
- **Test:** `npm test`. Typecheck: `npm run typecheck`. Build: `npm run build`.
- **OpenAI art:** key from `H:/Program Files/ams2-setup-coach/.env`, never committed.

---

## Task 1: Rover types + level authoring

**Files:** Modify `src/core/types.ts`, `src/core/level.ts`. Test: `tests/core/rover.test.ts` (new).

**Interfaces:**
- Produces: `interface Rover { id: number; r: number; c: number; riderId: number }`; `BoardState.rovers: Rover[]`; `LevelDef.rovers?: Pos[]`. Each authored rover spawns a rider `Survivor` at its cell, state `grounded`, `need: null`.

- [ ] **Step 1: Failing test** — create `tests/core/rover.test.ts`:

```ts
import { loadLevel } from '../../src/core/level';
import type { LevelDef } from '../../src/core/types';

function make(tiles: string[], over: Partial<LevelDef> = {}) {
  const mask = tiles.map((row) => row.replace(/[^.]/g, '#'));
  const def: LevelDef = { id: 0, mask, tiles, survivors: [], goal: { type: 'rescueN', n: 1 }, seed: 3, ...over };
  return loadLevel(def);
}

test('a rover spawns a grounded rider at its cell', () => {
  const s = make(['123', '451', '231'], { rovers: [{ r: 2, c: 2 }] });
  expect(s.rovers).toHaveLength(1);
  const rover = s.rovers[0]!;
  expect(rover).toMatchObject({ r: 2, c: 2 });
  const rider = s.survivors.find((v) => v.id === rover.riderId)!;
  expect(rider).toMatchObject({ r: 2, c: 2, state: 'grounded', need: null });
});
```

- [ ] **Step 2: Run** `npm test -- rover` → FAIL (`rovers` not on state).

- [ ] **Step 3: Types** — in `src/core/types.ts`, add:

```ts
export interface Rover {
  id: number;
  r: number;
  c: number;
  riderId: number; // the Survivor riding this rover
}
```

and add to `BoardState` (after `survivors`): `rovers: Rover[];`
and to `LevelDef` (after `survivors`): `rovers?: Pos[];`

- [ ] **Step 4: loadLevel** — in `src/core/level.ts`, after the `survivors` array is built and before the `return`, add:

```ts
  const rovers: Rover[] = (def.rovers ?? []).map((p, i) => {
    if (!mask[p.r]?.[p.c]) throw new Error(`rover at ${p.r},${p.c} outside mask`);
    const riderId = survivors.length;
    survivors.push({ id: riderId, r: p.r, c: p.c, state: 'grounded', need: null });
    return { id: i, r: p.r, c: p.c, riderId };
  });
```

Add `Rover` to the type import, and add `rovers,` to the returned `BoardState` object.

- [ ] **Step 5: Run** `npm test -- rover` → PASS. Then `npm test` → all green (existing levels have no `rovers`, default `[]`).

- [ ] **Step 6: Commit** `git commit -m "feat(core): rover entity type + level authoring (rider spawns grounded)"`

---

## Task 2: Rover movement + rescue

**Files:** Modify `src/core/game.ts`, `src/core/events.ts`. Test: `tests/core/rover.test.ts`.

**Interfaces:**
- Produces: `advanceRovers(s, events)` called first on real moves in `settle`; rover-riders are skipped by the tile re-evaluation (stay safe aboard); a rover steps toward the nearest `dome` over passable cells; the existing station-adjacency pass rescues the rider; rovers whose rider is housed are pruned. Event `{ type: 'roverMoved'; id: number; to: Pos }`.

- [ ] **Step 1: Failing tests** — append to `tests/core/rover.test.ts`:

```ts
import { trySwap } from '../../src/core/game';

test('a rover steps toward the nearest station each move and rescues its rider', () => {
  // dome at (0,0); rover+rider at (0,2). MATCH_COL2 makes a match so the move is legal.
  const s = loadLevel({
    id: 0, mask: ['###', '###', '###'],
    tiles: ['D31', '132', '214'],
    survivors: [], rovers: [{ r: 0, c: 2 }], goal: { type: 'rescueN', n: 1 }, seed: 3,
  });
  // a legal move somewhere on the board (col-independent) to tick the turn:
  // swap (2,1)<->(2,2) turns col? use a known match: make row/col — instead drive
  // moves until the rover reaches the dome.
  let guard = 0;
  while (s.status === 'playing' && guard++ < 20) {
    // find any legal move
    let moved = false;
    outer: for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++)
      for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
        const b = { r: r + dr, c: c + dc };
        if (b.r >= s.rows || b.c >= s.cols) continue;
        const res = trySwap(s, { r, c }, b);
        if (res.legal) { Object.assign(s, res.state); moved = true; break outer; }
      }
    if (!moved) break;
  }
  expect(s.survivors.find((v) => v.state === 'housed')).toBeTruthy();
});
```

(Note: this is an integration-style test — it drives real moves until the rover reaches the station. If the board dead-ends, `ensureLegalMoves` reshuffles, so a rescue is reachable.)

- [ ] **Step 2: Run** `npm test -- rover` → FAIL (rover never moves, no rescue).

- [ ] **Step 3: Implement `advanceRovers`** — in `src/core/game.ts`, add above `settle`:

```ts
/** A cell a rover may occupy: in-mask, in-bounds, not a station, not a blocked overlay. */
function roverPassable(s: BoardState, r: number, c: number): boolean {
  if (r < 0 || c < 0 || r >= s.rows || c >= s.cols) return false;
  if (!s.mask[r]![c]) return false;
  if (s.grid[r]![c]?.kind === 'dome') return false;
  const k = s.overlays[r]![c]?.kind;
  return k !== 'crystal' && k !== 'reactor' && k !== 'comet';
}

/**
 * Each real move, every rover steps one cell toward the nearest Space Station
 * (dome) over passable cells, carrying its rider. When no station exists yet it
 * idles. Reaching a cell adjacent to a station lets the settle rescue pass house
 * the rider (rovers are safe platforms — their riders never drift).
 */
function advanceRovers(s: BoardState, events: GameEvent[]): void {
  const domes: Pos[] = [];
  for (let r = 0; r < s.rows; r++)
    for (let c = 0; c < s.cols; c++)
      if (s.grid[r]![c]?.kind === 'dome') domes.push({ r, c });
  if (domes.length === 0) return;
  for (const rv of s.rovers) {
    const rider = s.survivors.find((v) => v.id === rv.riderId);
    if (!rider || rider.state === 'housed' || rider.state === 'lost') continue;
    let best = domes[0]!, bd = Infinity;
    for (const d of domes) {
      const dist = Math.abs(d.r - rv.r) + Math.abs(d.c - rv.c);
      if (dist < bd) { bd = dist; best = d; }
    }
    const steps: Pos[] = [];
    if (best.r !== rv.r) steps.push({ r: rv.r + Math.sign(best.r - rv.r), c: rv.c });
    if (best.c !== rv.c) steps.push({ r: rv.r, c: rv.c + Math.sign(best.c - rv.c) });
    for (const nx of steps) {
      if (roverPassable(s, nx.r, nx.c)) {
        rv.r = nx.r; rv.c = nx.c; rider.r = nx.r; rider.c = nx.c;
        events.push({ type: 'roverMoved', id: rv.id, to: { r: nx.r, c: nx.c } });
        break;
      }
    }
  }
}
```

- [ ] **Step 4: Wire into `settle`** — three edits in `settle`:

(a) At the very top of `settle`, before `damageOverlays`:

```ts
  if (tickNeeds) advanceRovers(s, events);
```

(b) In the survivor tile re-evaluation loop, skip rover riders. Change the loop guard: right after `for (const sv of s.survivors) {`, add:

```ts
    if (s.rovers.some((rv) => rv.riderId === sv.id)) continue; // safe aboard a rover
```

(This is the loop that sets `swimming`/`grounded`/`housed` from the tile — NOT the station-adjacency loop, which must still run for rover riders.)

(c) After the station-adjacency rescue loop, prune rovers whose rider made it home:

```ts
  s.rovers = s.rovers.filter((rv) => {
    const rider = s.survivors.find((v) => v.id === rv.riderId);
    return rider !== undefined && rider.state !== 'housed' && rider.state !== 'lost';
  });
```

- [ ] **Step 5: Add the event** — in `src/core/events.ts`, add to the union: `| { type: 'roverMoved'; id: number; to: Pos }`

- [ ] **Step 6: Run** `npm test -- rover` → PASS. Then `npm test` → all green.

- [ ] **Step 7: Commit** `git commit -m "feat(core): rover auto-navigates to nearest station, rescues its rider"`

---

## Task 3: Rover art

**Files:** Modify `scripts/gen-art.mjs`, `scripts/clean-art.mjs`. Create `public/art/rover.png`.

- [ ] **Step 1: Prompt** — in `scripts/gen-art.mjs` `ASSETS`, add:

```js
  'rover': {
    prompt: ICON('a cute chunky little SPACE RESCUE ROVER: a small friendly moon-buggy ' +
      'with fat knobby wheels, a rounded glass dome cockpit, a blinking beacon light and a ' +
      'small antenna, teal-and-white paint with warm lights, clearly a helpful vehicle that ' +
      'carries a stranded astronaut to safety'),
    bg: 'transparent',
  },
```

- [ ] **Step 2:** Add `'rover'` to `CHARACTERS` in `scripts/clean-art.mjs`.

- [ ] **Step 3: Generate + clean** —

```bash
cd "H:/Projects/iPhone Apps/sliding-stars"
export OPENAI_API_KEY=$(grep -oE 'OPENAI_API_KEY=.*' "/h/Program Files/ams2-setup-coach/.env" | head -1 | cut -d= -f2- | tr -d '"\r' | tr -d "'")
node scripts/gen-art.mjs rover && node scripts/clean-art.mjs
```

- [ ] **Step 4:** Read `public/art/rover.png`; confirm a cute rover with clean transparent corners.

- [ ] **Step 5: Commit** `git commit -m "art: generate rescue rover sprite"`

---

## Task 4: Render rovers

**Files:** Modify `src/render/textures.ts`, `src/render/boardView.ts`. Verify: typecheck, build, browser.

**Interfaces:** `TextureSet.roverOverlay?: Texture`; a `roverSprites` map in `BoardView` drawn under each rover's rider (entity layer).

- [ ] **Step 1: Texture** — in `src/render/textures.ts`, add `roverOverlay?: Texture;` to `TextureSet`, and `{ file: 'rover', apply: (s, t) => { s.roverOverlay = t; } },` to the image-asset list.

- [ ] **Step 2: Draw rovers** — in `src/render/boardView.ts`:

Add a field: `private roverSprites = new Map<number, Sprite>();`

Add a `syncRovers` method and call it from `syncFrom` (after `syncOverlays`, before `syncSurvivors` so the rover draws under the rider):

```ts
  private syncRovers(state: BoardState): void {
    const { tileSize } = this.layout;
    const seen = new Set<number>();
    for (const rv of state.rovers) {
      const tex = this.textures.roverOverlay;
      if (!tex) continue;
      seen.add(rv.id);
      let sp = this.roverSprites.get(rv.id);
      if (!sp) {
        sp = new Sprite(tex); sp.anchor.set(0.5);
        this.layers.actors.addChild(sp);
        this.roverSprites.set(rv.id, sp);
      }
      const { x, y } = this.cellCenter(rv.r, rv.c);
      sp.x = x; sp.y = y + tileSize * 0.14; // sit low so the rider shows on top
      sp.width = tileSize * 0.92; sp.height = tileSize * 0.92;
    }
    for (const [id, sp] of this.roverSprites) {
      if (!seen.has(id)) { sp.destroy(); this.roverSprites.delete(id); }
    }
  }
```

Call it in `syncFrom`: change `this.syncOverlays(state); this.syncSurvivors(state);` to `this.syncOverlays(state); this.syncRovers(state); this.syncSurvivors(state);`

- [ ] **Step 3:** `npm run typecheck && npm run build` → clean.

- [ ] **Step 4: Browser** — author a rover level via `__game` or a generator level (Task 5); confirm the rover sprite renders under the astronaut and moves toward a built station. Screenshot.

- [ ] **Step 5: Commit** `git commit -m "feat(render): draw rescue rovers under their rider"`

---

## Task 5: Rovers in the generator (+ verify solvable)

**Files:** Modify `src/core/generator.ts`. Test: `tests/core/generator.test.ts`.

**Interfaces:** `GenParams.rover: boolean`; on a rover level, one of the `goalN` rescue survivors is delivered by a rover (place a rover at a danger cell; reduce normal survivors by 1 so the total, including the rider, equals `goalN`).

- [ ] **Step 1: Failing test** — append to `tests/core/generator.test.ts`:

```ts
test('some later levels field a rover and stay solvable', () => {
  expect(paramsForLevel(1).rover).toBe(false);
  expect(paramsForLevel(18).rover).toBe(true);
  const def = makeSolvableLevel(18);
  expect((def.rovers ?? []).length).toBeGreaterThan(0);
  expect(solve(def, 140).solved).toBe(true);
});
```

- [ ] **Step 2: Run** `npm test -- generator` → FAIL (`rover` not on params).

- [ ] **Step 3: Param** — in `GenParams` add `rover: boolean;`. In `paramsForLevel`:

```ts
  const rover = index >= 15 && index % 6 === 0 && !isCollect;
```

(compute `rover` AFTER `isCollect` is defined). Include `rover,` in the returned object; add `rover: false` to the `makeSolvableLevel` fallback params.

- [ ] **Step 4: Place the rover** — in `generateLevel`, after the survivors array is built, add:

```ts
  // a rover delivers one of the rescue crew: drop the deepest-stranded survivor
  // and hand that slot to a rover starting near the top danger zone
  const rovers: Pos[] = [];
  if (p.rover && survivors.length > 0) {
    rovers.push(survivors.pop()!); // reuse a danger-zone cell as the rover start
  }
```

and add `...(rovers.length ? { rovers } : {}),` to the returned `LevelDef` object.

- [ ] **Step 5: Run** `npm test -- generator` → PASS. Then `npm test` → the 1..40 sweep MUST stay green. If a rover level fails to generate, the fallback relaxes it (drops the rover); if the sweep is red, widen the rover cadence until green.

- [ ] **Step 6: Commit** `git commit -m "feat(core): field a rescue rover on some later levels (solver-verified)"`

---

## Task 6: Full verification, device pass, deploy

- [ ] **Step 1:** `npm test && npm run typecheck && npm run build` → all green.
- [ ] **Step 2: Device pass** — load a rover level (≈ L18), build a station, confirm the rover trundles toward it and the rider is rescued; confirm reactor + comet render with the new art; check console for errors; screenshot.
- [ ] **Step 3: Deploy** to Netlify site `bc41ec96-bbad-4e56-b0d1-c612c54db038`; report the URL.

## Self-Review

**Coverage:** rover entity + authoring (T1), movement + rescue + safe-aboard (T2), art (T3), render (T4), generator + solvability (T5), verify/deploy (T6). ✓
**Type consistency:** `Rover { id, r, c, riderId }` defined once (T1), consumed unchanged in `advanceRovers`/`syncRovers`; `roverMoved` event referenced only after it's added (T2). ✓
**Risk:** rover levels depend on the solver building a station the rover can reach; placement is sparse and `makeSolvableLevel` + fallback guarantee solvability. If flaky, widen the cadence in T5 Step 5.
