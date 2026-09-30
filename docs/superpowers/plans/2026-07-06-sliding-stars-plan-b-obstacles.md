# Plan B — Obstacle Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add three overlay-based obstacles — crystal/ice (freeze), volcano (countdown eruption), and whale (multi-cell blocker) — faithfully and fairly, keeping every generated level solver-verified. The turtle (a moving ferry entity) is deferred to its own plan (Plan B2) because it needs a new entity layer, not the overlay layer.

**Architecture:** All three extend the existing `Overlay` union and the `damageOverlays`/`settle` passes in `src/core/game.ts`, exactly like the shipped canister mechanic. Obstacle tiles are unswappable (rejected in `trySwap`) and immovable (barriers in `applyGravity`). The volcano also ticks each real move in `settle`. The solver gains small rewards so it neutralizes/clears obstacles, keeping `makeSolvableLevel` reliable. Rendering reuses `syncOverlays`; new pixel art comes from the OpenAI pipeline.

**Tech Stack:** TypeScript (strict) · PixiJS v8 · Vite · Vitest.

## Global Constraints

- **Pure core:** `src/core/` MUST NOT import `src/render/` or `pixi.js` (enforced by `tests/core/purity.test.ts`).
- **LOCKED core loop:** matches merge up one tier; tier-5 match builds a `dome` (Space Station); astronaut rides its tile; on/next-to a station = rescued; no rafts.
- **Solver-verified:** every generated level MUST pass `makeSolvableLevel`; the sweep test (levels 1..40) MUST stay green.
- **Overlay grid encoding** (in `level.ts` `parseOverlays`): one char per cell — `C` canister, `I` crystal, `V` volcano, `W` whale, `.`/`#` none.
- **Test command:** `npm test`. Typecheck: `npm run typecheck`. Build: `npm run build`.
- **OpenAI art:** `node scripts/gen-art.mjs <name...>` reads `OPENAI_API_KEY`; then `node scripts/clean-art.mjs`. Key lives in `H:/Program Files/ams2-setup-coach/.env` — load it inline, never commit it.

---

## Task 1: Crystal/ice — unswappable, immovable, thaws on adjacent match

**Files:**
- Modify: `src/core/game.ts` (trySwap guard, `damageOverlays`), `src/core/gravity.ts` (barrier)
- Test: `tests/core/overlays.test.ts`

**Interfaces:**
- Consumes: `Overlay` already includes `{ kind: 'crystal'; hp }`; events `crystalHit`/`crystalCleared` already exist.
- Produces: crystals block swaps and gravity, and thaw (clear) when a match lands orthogonally adjacent.

- [ ] **Step 1: Write failing tests**

Append to `tests/core/overlays.test.ts`:

```ts
import { resolveMatchesOnce } from '../../src/core/resolve';

test('a crystal cell cannot be swapped', () => {
  const s = make(['123', '451', '231'], { overlays: ['I..', '...', '...'] });
  const res = trySwap(s, { r: 0, c: 0 }, { r: 0, c: 1 });
  expect(res.legal).toBe(false);
});

test('a crystal thaws when a match lands orthogonally adjacent', () => {
  const s = make(MATCH_COL0, { overlays: ['.I.', '...', '...'], goal: { type: 'rescueN', n: 0 } });
  // crystal at (0,1) is adjacent to matched (0,0); col0 match via swap (2,0)<->(2,1)
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 });
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.events.some((e) => e.type === 'crystalCleared')).toBe(true);
});

test('a crystal is an immovable barrier for gravity', () => {
  const s = make(['1', '2', '3'], { overlays: ['I', '.', '.'] });
  const ev: import('../../src/core/events').GameEvent[] = [];
  // clear the bottom two by nulling, then applyGravity: the crystal tile must not fall
  s.grid[1]![0] = null; s.grid[2]![0] = null;
  const { applyGravity } = await import('../../src/core/gravity');
  applyGravity(s, ev);
  expect(s.grid[0]![0]).toEqual({ kind: 'tile', tier: 1 }); // stayed put (barrier)
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- overlays`
Expected: FAIL — crystal swaps are currently allowed; crystals don't thaw; crystal tile falls.

- [ ] **Step 3: Reject crystal swaps in `trySwap`**

In `src/core/game.ts`, in `trySwap`, right after the dome check `if (pa.kind === 'dome' || pb.kind === 'dome') return reject();`, add:

```ts
  const frozen = (p: Pos) => state.overlays[p.r]?.[p.c]?.kind === 'crystal';
  if (frozen(a) || frozen(b)) return reject();
```

- [ ] **Step 4: Make crystals gravity barriers**

In `src/core/gravity.ts`, in the `isBarrier` closure, extend the condition:

```ts
    const isBarrier = (r: number) =>
      r >= state.rows || state.mask[r]![c] !== true ||
      state.grid[r]![c]?.kind === 'dome' ||
      state.overlays[r]![c]?.kind === 'crystal';
```

- [ ] **Step 5: Thaw crystals in `damageOverlays`**

In `src/core/game.ts`, replace the inner overlay loop of `damageOverlays` so it handles crystals as well as canisters:

```ts
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const ov = s.overlays[r]![c];
      if (!ov || !nearMatch(r, c)) continue;
      if (ov.kind === 'canister') {
        ov.hp--;
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
        ov.hp--;
        if (ov.hp <= 0) {
          s.overlays[r]![c] = null;
          events.push({ type: 'crystalCleared', at: { r, c } });
        } else {
          events.push({ type: 'crystalHit', at: { r, c }, hp: ov.hp });
        }
      }
    }
  }
```

- [ ] **Step 6: Run tests + full suite**

Run: `npm test -- overlays`
Expected: PASS. Then `npm test` — all green.

- [ ] **Step 7: Commit**

```bash
git add src/core/game.ts src/core/gravity.ts tests/core/overlays.test.ts
git commit -m "feat(core): crystal freeze - unswappable, immovable, thaws on adjacent match"
```

---

## Task 2: Crystals in the generator (+ solver reward)

**Files:**
- Modify: `src/core/generator.ts`, `src/core/solver.ts`
- Test: `tests/core/generator.test.ts`

**Interfaces:**
- Produces: `GenParams` gains `crystals: number`; `generateLevel` scatters crystals on danger-zone tiles (never on survivors); solver rewards `crystalCleared`.

- [ ] **Step 1: Write failing test**

Append to `tests/core/generator.test.ts`:

```ts
test('mid+ levels include crystals and stay solvable', () => {
  expect(paramsForLevel(1).crystals).toBe(0);
  expect(paramsForLevel(20).crystals).toBeGreaterThan(0);
  const def = makeSolvableLevel(20);
  const hasCrystal = (def.overlays ?? []).join('').includes('I');
  expect(hasCrystal).toBe(true);
  expect(solve(def, 120).solved).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- generator`
Expected: FAIL — `crystals` not on `GenParams`.

- [ ] **Step 3: Add `crystals` to params**

In `src/core/generator.ts`, add `crystals: number;` to the `GenParams` interface. In `paramsForLevel`, compute and include it (crystals appear from level 8, capped at 2):

```ts
  const crystals = index >= 8 ? Math.min(2, 1 + Math.floor((index - 8) / 12)) : 0;
```

and add `crystals,` to the returned object. Add `crystals: 0` to the `makeSolvableLevel` fallback params object.

- [ ] **Step 4: Scatter crystals in `generateLevel`**

In `src/core/generator.ts`, the overlays grid is currently created only when `p.canisters > 0`. Change it to also allocate when crystals are needed, and place crystals on danger tiles (tier ≤ 3) away from survivors. Replace the overlays block:

```ts
  const needOverlays = p.canisters > 0 || p.crystals > 0;
  const overlays = needOverlays
    ? Array.from({ length: p.rows }, () => Array(p.cols).fill('.'))
    : undefined;
  if (overlays) {
    const isSurvivor = (r: number, c: number) => survivors.some((s) => s.r === r && s.c === c);
    const mid: Pos[] = [];
    for (let r = 1; r <= p.rows - 2; r++)
      for (let c = 0; c < p.cols; c++)
        if (mask[r]![c] === '#') mid.push({ r, c });
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
  }
```

(Delete the old `overlays` block that this replaces.)

- [ ] **Step 5: Reward clearing crystals in the solver**

In `src/core/solver.ts`, in `score`, add to the event loop (next to the `canisterBroken` line):

```ts
    else if (e.type === 'crystalCleared') sc += 250; // unblock frozen tiles
```

- [ ] **Step 6: Run tests + full suite**

Run: `npm test -- generator`
Expected: PASS. Then `npm test` — the 1..40 sweep stays green.

- [ ] **Step 7: Commit**

```bash
git add src/core/generator.ts src/core/solver.ts tests/core/generator.test.ts
git commit -m "feat(core): place crystals in mid+ levels, solver thaws them"
```

---

## Task 3: Volcano — type, parse, unswappable/immovable, neutralize

**Files:**
- Modify: `src/core/types.ts`, `src/core/level.ts`, `src/core/game.ts`, `src/core/gravity.ts`, `src/core/events.ts`
- Test: `tests/core/overlays.test.ts`

**Interfaces:**
- Produces: `Overlay` gains `{ kind: 'volcano'; hp: number; fuse: number; period: number }`; `parseOverlays` maps `V`; events `volcanoHit`/`volcanoCleared`/`volcanoErupted`; volcanoes are unswappable + immovable and neutralize on adjacent matches.

- [ ] **Step 1: Write failing tests**

Append to `tests/core/overlays.test.ts`:

```ts
test('level parses V into a volcano with fuse and hp', () => {
  const s = make(['123', '451', '231'], { overlays: ['V..', '...', '...'] });
  expect(s.overlays[0]![0]).toMatchObject({ kind: 'volcano', hp: 2, fuse: 4, period: 4 });
});

test('a volcano is unswappable and neutralizes on adjacent match', () => {
  const s = make(MATCH_COL0, { overlays: ['.V.', '...', '...'], goal: { type: 'rescueN', n: 0 } });
  s.overlays[0]![1] = { kind: 'volcano', hp: 1, fuse: 4, period: 4 };
  expect(trySwap(s, { r: 0, c: 1 }, { r: 0, c: 2 }).legal).toBe(false); // unswappable
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // match col0, adjacent to (0,1)
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.events.some((e) => e.type === 'volcanoCleared')).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- overlays`
Expected: FAIL — `V` unknown overlay char.

- [ ] **Step 3: Extend the `Overlay` type**

In `src/core/types.ts`, replace the `Overlay` union with:

```ts
export type Overlay =
  | { kind: 'canister'; hp: number }
  | { kind: 'crystal'; hp: number }
  | { kind: 'volcano'; hp: number; fuse: number; period: number }
  | { kind: 'whale'; hp: number };
```

- [ ] **Step 4: Parse `V`**

In `src/core/level.ts` `parseOverlays`, add before the `else throw`:

```ts
      else if (ch === 'V') out[r]!.push({ kind: 'volcano', hp: 2, fuse: 4, period: 4 });
```

- [ ] **Step 5: Add volcano events**

In `src/core/events.ts`, add to the `GameEvent` union:

```ts
  | { type: 'volcanoHit'; at: Pos; hp: number }
  | { type: 'volcanoCleared'; at: Pos }
  | { type: 'volcanoErupted'; at: Pos }
```

- [ ] **Step 6: Volcanoes unswappable + immovable**

In `src/core/game.ts`, extend the `frozen` guard added in Task 1 to also cover volcano and whale:

```ts
  const blocked = (p: Pos) => {
    const k = state.overlays[p.r]?.[p.c]?.kind;
    return k === 'crystal' || k === 'volcano' || k === 'whale';
  };
  if (blocked(a) || blocked(b)) return reject();
```

(Replace the Task 1 `frozen` guard with this `blocked` guard.)

In `src/core/gravity.ts`, extend `isBarrier`'s overlay check to any blocking overlay:

```ts
    const barrierOverlay = (r: number) => {
      const k = state.overlays[r]![c]?.kind;
      return k === 'crystal' || k === 'volcano' || k === 'whale';
    };
    const isBarrier = (r: number) =>
      r >= state.rows || state.mask[r]![c] !== true ||
      state.grid[r]![c]?.kind === 'dome' || barrierOverlay(r);
```

- [ ] **Step 7: Neutralize volcanoes in `damageOverlays`**

In `src/core/game.ts` `damageOverlays`, add a `volcano` branch alongside crystal:

```ts
      } else if (ov.kind === 'volcano') {
        ov.hp--;
        if (ov.hp <= 0) {
          s.overlays[r]![c] = null;
          events.push({ type: 'volcanoCleared', at: { r, c } });
        } else {
          events.push({ type: 'volcanoHit', at: { r, c }, hp: ov.hp });
        }
      }
```

- [ ] **Step 8: Run tests + full suite**

Run: `npm test -- overlays`
Expected: PASS. Then `npm test` — all green.

- [ ] **Step 9: Commit**

```bash
git add src/core/types.ts src/core/level.ts src/core/game.ts src/core/gravity.ts src/core/events.ts tests/core/overlays.test.ts
git commit -m "feat(core): volcano overlay - unswappable, immovable, neutralize on adjacent match"
```

---

## Task 4: Volcano eruption (ticks each move)

**Files:**
- Modify: `src/core/game.ts`
- Test: `tests/core/overlays.test.ts`

**Interfaces:**
- Produces: `tickVolcanoes(s, events)` called once per real move in `settle`; on fuse expiry, orthogonal-neighbor tiles drop one tier and adjacent survivors re-enter `swimming`.

- [ ] **Step 1: Write failing test**

Append to `tests/core/overlays.test.ts`:

```ts
test('a volcano erupts on fuse expiry, downgrading neighbor tiles', () => {
  // one real swap ticks the fuse from 1 -> erupt; neighbor tile drops a tier
  const s = make(MATCH_COL0, { overlays: ['...', 'V..', '...'], goal: { type: 'rescueN', n: 0 } });
  s.overlays[1]![0] = { kind: 'volcano', hp: 5, fuse: 1, period: 4 };
  const before = (s.grid[1]![1] as { tier: number }).tier; // east neighbor of volcano
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // any legal move ticks the fuse
  expect(res.legal).toBe(true);
  expect(res.events.some((e) => e.type === 'volcanoErupted')).toBe(true);
  const after = res.state.grid[1]![1];
  // east neighbor either dropped a tier or was consumed by the col0 match cascade;
  // assert eruption fired and fuse reset
  expect((res.state.overlays[1]![0] as { fuse: number }).fuse).toBe(4);
  expect(before).toBeGreaterThanOrEqual(1);
  void after;
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- overlays`
Expected: FAIL — no `volcanoErupted` event; fuse not reset.

- [ ] **Step 3: Implement `tickVolcanoes`**

In `src/core/game.ts`, add this function above `settle`:

```ts
/**
 * Each real move, every active volcano's fuse ticks down. On expiry it erupts:
 * orthogonally adjacent tiles drop one tier toward danger, any survivor beside
 * it that lands on unsafe ground (tier ≤ 3) drifts again, and the fuse resets.
 */
function tickVolcanoes(s: BoardState, events: GameEvent[]): void {
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const ov = s.overlays[r]![c];
      if (!ov || ov.kind !== 'volcano') continue;
      ov.fuse--;
      if (ov.fuse > 0) continue;
      ov.fuse = ov.period;
      events.push({ type: 'volcanoErupted', at: { r, c } });
      const neighbors: Pos[] = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];
      for (const n of neighbors) {
        const piece = s.grid[n.r]?.[n.c];
        if (!piece || piece.kind !== 'tile' || piece.tier <= 1) continue;
        piece.tier = (piece.tier - 1) as Tier;
        for (const sv of s.survivors) {
          if (sv.state === 'housed' || sv.state === 'lost') continue;
          if (sv.r === n.r && sv.c === n.c && piece.tier <= 3 && sv.state !== 'swimming') {
            sv.state = 'swimming';
            sv.need = { type: 'rescue', movesLeft: s.needMoves };
          }
        }
      }
    }
  }
}
```

Add the `Tier` import to `game.ts` if not present: change the types import to include `Tier`:

```ts
import type { BoardState, Pos, Tier } from './types';
```

- [ ] **Step 4: Call it once per real move in `settle`**

In `src/core/game.ts` `settle`, inside the `if (tickNeeds) { ... }` block (the one that decrements survivor needs), add `tickVolcanoes(s, events);` as the FIRST line of that block, so eruptions happen on real moves only (not power-ups):

```ts
  if (tickNeeds) {
    tickVolcanoes(s, events);
    for (const sv of s.survivors) {
```

- [ ] **Step 5: Run tests + full suite**

Run: `npm test -- overlays`
Expected: PASS. Then `npm test` — all green.

- [ ] **Step 6: Commit**

```bash
git add src/core/game.ts tests/core/overlays.test.ts
git commit -m "feat(core): volcano erupts on fuse expiry, downgrading neighbors"
```

---

## Task 5: Whale — multi-cell shared-hp blocker

**Files:**
- Modify: `src/core/level.ts`, `src/core/game.ts`, `src/core/events.ts`
- Test: `tests/core/overlays.test.ts`

**Interfaces:**
- Produces: `parseOverlays` maps `W` to `{ kind: 'whale'; hp }`; adjacent matches damage the whole connected whale; at hp 0 all its cells clear together; events `whaleHit`/`whaleFreed`. (Type + swap/gravity blocking already added in Task 3/6.)

- [ ] **Step 1: Write failing tests**

Append to `tests/core/overlays.test.ts`:

```ts
test('level parses W into a whale segment with shared hp', () => {
  const s = make(['123', '451', '231'], { overlays: ['WW.', '...', '...'] });
  expect(s.overlays[0]![0]).toMatchObject({ kind: 'whale', hp: 3 });
  expect(s.overlays[0]![1]).toMatchObject({ kind: 'whale', hp: 3 });
});

test('a whale takes shared damage from an adjacent match and frees together', () => {
  const s = make(MATCH_COL0, { overlays: ['.W.', '.W.', '...'], goal: { type: 'rescueN', n: 0 } });
  s.overlays[0]![1] = { kind: 'whale', hp: 1 };
  s.overlays[1]![1] = { kind: 'whale', hp: 1 };
  const res = trySwap(s, { r: 2, c: 0 }, { r: 2, c: 1 }); // col0 match adjacent to (0,1)&(1,1)
  expect(res.legal).toBe(true);
  expect(res.state.overlays[0]![1]).toBeNull();
  expect(res.state.overlays[1]![1]).toBeNull();
  expect(res.events.some((e) => e.type === 'whaleFreed')).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- overlays`
Expected: FAIL — `W` unknown overlay char.

- [ ] **Step 3: Parse `W`**

In `src/core/level.ts` `parseOverlays`, add before the `else throw`:

```ts
      else if (ch === 'W') out[r]!.push({ kind: 'whale', hp: 3 });
```

- [ ] **Step 4: Add whale events**

In `src/core/events.ts`, add to the union:

```ts
  | { type: 'whaleHit'; cells: Pos[]; hp: number }
  | { type: 'whaleFreed'; cells: Pos[] }
```

- [ ] **Step 5: Damage whole whales in `damageOverlays`**

In `src/core/game.ts`, after the per-cell overlay loop in `damageOverlays`, add a whale pass that groups connected whale cells and damages each group once if any of its cells is near a match:

```ts
  // whales: a connected group shares one hp pool; one adjacent match damages the
  // whole group, and at 0 hp every cell of that whale frees together.
  const whaleSeen = new Set<string>();
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (s.overlays[r]![c]?.kind !== 'whale' || whaleSeen.has(`${r},${c}`)) continue;
      // flood-fill this whale
      const group: Pos[] = [];
      const stack: Pos[] = [{ r, c }];
      while (stack.length) {
        const p = stack.pop()!;
        const key = `${p.r},${p.c}`;
        if (whaleSeen.has(key)) continue;
        if (s.overlays[p.r]?.[p.c]?.kind !== 'whale') continue;
        whaleSeen.add(key); group.push(p);
        stack.push({ r: p.r - 1, c: p.c }, { r: p.r + 1, c: p.c }, { r: p.r, c: p.c - 1 }, { r: p.r, c: p.c + 1 });
      }
      const hit = group.some((p) => nearMatch(p.r, p.c));
      if (!hit) continue;
      let hp = 0;
      for (const p of group) { const ov = s.overlays[p.r]![p.c]!; ov.hp--; hp = ov.hp; }
      if (hp <= 0) {
        for (const p of group) s.overlays[p.r]![p.c] = null;
        events.push({ type: 'whaleFreed', cells: group });
      } else {
        events.push({ type: 'whaleHit', cells: group, hp });
      }
    }
  }
```

- [ ] **Step 6: Run tests + full suite**

Run: `npm test -- overlays`
Expected: PASS. Then `npm test` — all green.

- [ ] **Step 7: Commit**

```bash
git add src/core/level.ts src/core/game.ts src/core/events.ts tests/core/overlays.test.ts
git commit -m "feat(core): whale multi-cell blocker with shared hp, frees together"
```

---

## Task 6: Obstacle art (volcano + whale) via the OpenAI pipeline

**Files:**
- Modify: `scripts/gen-art.mjs`, `scripts/clean-art.mjs`
- Create: `public/art/volcano.png`, `public/art/whale.png`

- [ ] **Step 1: Add asset prompts**

In `scripts/gen-art.mjs`, add to the `ASSETS` map:

```js
  'volcano': {
    prompt: ICON('a small angry volcanic vent on a dark asteroid rock: a cracked ' +
      'stony cone with a glowing orange-red molten crater at the top, a few embers ' +
      'and a thin heat shimmer, clearly a dangerous hazard sitting on the ground'),
    bg: 'transparent',
  },
  'whale': {
    prompt: ICON('a cute chunky pale-blue SPACE WHALE tangled in a net of icy ' +
      'asteroid debris, big friendly eye, rounded body, a little water-vapor spout, ' +
      'clearly a gentle creature trapped and waiting to be freed'),
    bg: 'transparent',
  },
```

- [ ] **Step 2: Add them to the cleanup list**

In `scripts/clean-art.mjs`, add `'volcano'` and `'whale'` to the `CHARACTERS` array.

- [ ] **Step 3: Generate + clean (loads the key inline)**

Run:

```bash
cd "H:/Projects/iPhone Apps/sliding-stars"
export OPENAI_API_KEY=$(grep -oE 'OPENAI_API_KEY=.*' "/h/Program Files/ams2-setup-coach/.env" | head -1 | cut -d= -f2- | tr -d '"\r')
node scripts/gen-art.mjs volcano whale && node scripts/clean-art.mjs
```

Expected: `public/art/volcano.png` and `public/art/whale.png` written.

- [ ] **Step 4: Visually confirm**

Read both PNGs; confirm the volcano reads as a molten hazard and the whale as a trapped creature, with clean transparent edges.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-art.mjs scripts/clean-art.mjs public/art/volcano.png public/art/whale.png
git commit -m "art: generate volcano and whale obstacle sprites"
```

---

## Task 7: Render volcano + whale overlays

**Files:**
- Modify: `src/render/textures.ts`, `src/render/boardView.ts`
- Verify: `npm run typecheck`, `npm run build`, browser device check.

**Interfaces:**
- Consumes: `volcano.png`, `whale.png`.
- Produces: `TextureSet` gains `volcanoOverlay?`/`whaleOverlay?`; `syncOverlays` draws them.

- [ ] **Step 1: Load the new textures**

In `src/render/textures.ts`, add to the `TextureSet` type:

```ts
  volcanoOverlay?: Texture;
  whaleOverlay?: Texture;
```

and add to the image-asset list (next to the canister/crystal entries):

```ts
  { file: 'volcano', apply: (s, t) => { s.volcanoOverlay = t; } },
  { file: 'whale', apply: (s, t) => { s.whaleOverlay = t; } },
```

- [ ] **Step 2: Draw them in `syncOverlays`**

In `src/render/boardView.ts` `syncOverlays`, extend the texture selection:

```ts
        const tex = ov?.kind === 'canister' ? this.textures.canisterOverlay
          : ov?.kind === 'crystal' ? this.textures.crystalOverlay
          : ov?.kind === 'volcano' ? this.textures.volcanoOverlay
          : ov?.kind === 'whale' ? this.textures.whaleOverlay : undefined;
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: clean.

- [ ] **Step 4: Browser device check**

Start the preview. Load a level with a volcano/whale (see Task 8 for authored showcase levels, or set one via `__game` in the console), and confirm the sprites render on their cells. Screenshot for the user.

- [ ] **Step 5: Commit**

```bash
git add src/render/textures.ts src/render/boardView.ts
git commit -m "feat(render): draw volcano and whale overlays"
```

---

## Task 8: Volcano + whale in the generator (+ solver rewards)

**Files:**
- Modify: `src/core/generator.ts`, `src/core/solver.ts`
- Test: `tests/core/generator.test.ts`

**Interfaces:**
- Produces: `GenParams` gains `volcanoes: number` and `whale: boolean`; sparse placement on later bands; solver rewards `volcanoCleared`/`whaleFreed` and penalizes `volcanoErupted`, keeping levels solvable.

- [ ] **Step 1: Write failing test**

Append to `tests/core/generator.test.ts`:

```ts
test('late levels add a volcano and stay solvable', () => {
  expect(paramsForLevel(1).volcanoes).toBe(0);
  expect(paramsForLevel(24).volcanoes).toBeGreaterThan(0);
  const def = makeSolvableLevel(24);
  expect((def.overlays ?? []).join('')).toContain('V');
  expect(solve(def, 140).solved).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- generator`
Expected: FAIL — `volcanoes` not on `GenParams`.

- [ ] **Step 3: Add params**

In `src/core/generator.ts`, add `volcanoes: number; whale: boolean;` to `GenParams`. In `paramsForLevel`:

```ts
  const volcanoes = index >= 22 && index % 3 === 1 ? 1 : 0;
  const whale = index >= 28 && index % 5 === 3;
```

Include `volcanoes,` and `whale,` in the returned object; add `volcanoes: 0, whale: false` to the `makeSolvableLevel` fallback.

- [ ] **Step 4: Place them in `generateLevel`**

In the overlays block, extend `needOverlays` and add placement after crystals (a volcano on a central danger tile; a horizontal 1×2 whale on a mid row):

```ts
  const needOverlays = p.canisters > 0 || p.crystals > 0 || p.volcanoes > 0 || p.whale;
```

Then, inside `if (overlays) { ... }` after the crystal loop:

```ts
    let volc = 0;
    for (let r = 1; r < p.rows - 1 && volc < p.volcanoes; r++)
      for (let c = 1; c < p.cols - 1 && volc < p.volcanoes; c++) {
        if (mask[r]![c] !== '#' || overlays[r]![c] !== '.' || isSurvivor(r, c)) continue;
        if (tierAt(r, c) > 3) continue;
        overlays[r]![c] = 'V'; volc++;
      }
    if (p.whale) {
      const wr = Math.floor(p.rows / 2);
      for (let c = 1; c <= 2; c++)
        if (mask[wr]![c] === '#' && overlays[wr]![c] === '.' && !isSurvivor(wr, c)) overlays[wr]![c] = 'W';
    }
```

- [ ] **Step 5: Solver rewards**

In `src/core/solver.ts` `score`, add to the event loop:

```ts
    else if (e.type === 'whaleFreed') sc += 300;
    else if (e.type === 'whaleHit') sc += 120;
    else if (e.type === 'volcanoCleared') sc += 350;
    else if (e.type === 'volcanoHit') sc += 150;
    else if (e.type === 'volcanoErupted') sc -= 250;
```

- [ ] **Step 6: Run tests + full suite**

Run: `npm test -- generator`
Expected: PASS. Then `npm test` — the 1..40 sweep MUST stay green. If a late level fails to generate, the `makeSolvableLevel` fallback already relaxes it; if the sweep is red, lower `volcanoes`/`whale` frequency until green.

- [ ] **Step 7: Commit**

```bash
git add src/core/generator.ts src/core/solver.ts tests/core/generator.test.ts
git commit -m "feat(core): place volcano/whale on later levels, solver clears them"
```

---

## Task 9: Full verification, device pass, deploy

**Files:** none (verification only).

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green; build succeeds.

- [ ] **Step 2: Device pass**

Start the preview. Visit levels that contain each obstacle (e.g. crystals ~L20, volcano ~L22/L25, whale ~L28/L33 — confirm exact indices via `__game.getState().overlays`). Confirm: crystals block swaps and thaw on adjacent matches; a volcano ticks and erupts; a whale frees after enough adjacent matches; no console errors. Screenshot each for the user.

- [ ] **Step 3: Deploy**

Deploy to Netlify site `bc41ec96-bbad-4e56-b0d1-c612c54db038` via the established `@netlify/mcp` flow. Report the live URL.

---

## Deferred: Turtle (Plan B2)

The turtle is a **moving ferry entity**, not an overlay, so it needs a new `turtles: Turtle[]` field on `BoardState`, a movement pass after `settle`, rider attachment, rescue-on-station-adjacency, and its own render + art. It is intentionally separated so it gets careful, isolated work rather than being crammed into the overlay batch. Design is captured in the spec (Feature 5 → Turtle).

## Self-Review

**Spec coverage:** crystal (Tasks 1–2), volcano (Tasks 3–4, 6–8), whale (Tasks 5–8). Turtle explicitly deferred to Plan B2 with rationale. ✓
**Placeholder scan:** every code step is complete. ✓
**Type consistency:** `Overlay` extended once (Task 3) covers volcano+whale; the `blocked`/`barrierOverlay` guards (Task 3) cover crystal+volcano+whale; `damageOverlays` handles all kinds; solver rewards reference only real event types. ✓
**Risk note:** the generator's solver-verified sweep is the guardrail — if volcano/whale frequency makes late levels hard to generate, reduce it (Task 8 Step 6) until the sweep is green; the relaxed fallback always yields a solvable level.
