# Plan D — Later-Level Variety & Persistent Economy

> **For agentic workers:** Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Keep the mid/late game fresh and sticky: (A) layer more obstacles into later levels (denser, more varied mixes of crystal / Reactor Core / Frozen Comet / Rescue Rover), and (B) turn power-ups into a real ongoing loop by making points a **persistent coin bank** spent on power-ups across levels.

**Architecture:** (A) is pure-core generator tuning, guarded by an extended solver sweep. (B) adds an app-layer `src/meta/wallet.ts` (localStorage coins + owned charges); `main.ts` earns coins continuously from scoring, spends them to buy power-ups, and shows the running bank in the HUD. Core stays pure.

**Tech Stack:** TypeScript (strict) · PixiJS v8 · Vite · Vitest.

## Global Constraints

- **Pure core:** `src/core/` imports nothing from `src/meta/` or `src/render/` (purity guard).
- **Solver-verified:** every generated level must pass `makeSolvableLevel`; the extended sweep must stay green.
- **Current obstacles (space-skinned):** `crystal` (freeze), `reactor` (fuse eruption), `comet` (multi-cell blocker), `rover` (rider ferry); overlay chars `I`/`V`/`W`.
- **Power-up costs** (`src/core/powerups.ts`): demo 300, wormhole 200, tractor 400.
- **localStorage keys:** level `sliding-stars-level`, station `sliding-stars-station`, wallet `sliding-stars-wallet`.
- **Test:** `npm test`.

---

## Task 1: Denser, more varied later levels (+ extended sweep)

**Files:** Modify `src/core/generator.ts`. Test: `tests/core/generator.test.ts`.

**Interfaces:** unchanged signatures; only the difficulty formulas and `makeSolvableLevel` robustness change.

- [ ] **Step 1: Failing tests** — append to `tests/core/generator.test.ts`:

```ts
test('every generated level 1..70 stays solver-verified beatable', () => {
  for (let i = 1; i <= 70; i++) {
    expect(solve(makeSolvableLevel(i), 100).solved, `level ${i} should be solvable`).toBe(true);
  }
});

test('later levels are richer: more crystals and frequent obstacles', () => {
  expect(paramsForLevel(50).crystals).toBe(3); // crystal density grows
  // sample a busy late band and confirm real obstacles land (not an empty fallback)
  let withObstacles = 0;
  for (const i of [40, 45, 50, 55, 60]) {
    const ov = (makeSolvableLevel(i).overlays ?? []).join('');
    if (/[IVW]/.test(ov)) withObstacles++;
  }
  expect(withObstacles).toBeGreaterThanOrEqual(4); // most late levels carry obstacles
});
```

- [ ] **Step 2: Run** `npm test -- generator` → FAIL (crystals(50) is 2; sweep may already pass but the richness assert fails).

- [ ] **Step 3: Tune the cadences** — in `src/core/generator.ts` `paramsForLevel`, replace the three obstacle lines:

```ts
  const crystals = index >= 8 ? Math.min(2, 1 + Math.floor((index - 8) / 12)) : 0;
  const reactors = index >= 22 && index % 3 === 1 ? 1 : 0;
  const comet = index >= 28 && index % 5 === 3;
```

with richer, later-weighted versions (crystals are static so denser is solver-safe; the erupting reactor stays capped at 1):

```ts
  const crystals = index >= 8 ? Math.min(3, 1 + Math.floor((index - 8) / 14)) : 0;
  const reactors = index >= 22 && index % 3 === 1 ? 1 : 0;
  const comet = index >= 28 && (index % 5 === 3 || (index >= 45 && index % 4 === 1));
```

- [ ] **Step 4: Give denser levels more room to verify** — change the `makeSolvableLevel` signature and loop:

```ts
export function makeSolvableLevel(index: number, maxMoves = index >= 40 ? 90 : 60): LevelDef {
  const p = paramsForLevel(index);
  for (let attempt = 0; attempt < 60; attempt++) {
```

(bump attempts 40 → 60 so a denser level is less likely to fall back to the relaxed level).

- [ ] **Step 5: Run** `npm test -- generator` → PASS. Then `npm test` — the 1..70 sweep must be green. If a late level fails, reduce `comet` frequency or lower the `crystals` cap until green, then re-run.

- [ ] **Step 6: Commit** `git commit -m "feat(core): richer obstacle mixes on later levels, sweep extended to 70"`

---

## Task 2: Wallet meta-state (persistent coins + charges)

**Files:** Create `src/meta/wallet.ts`. Test: `tests/meta/wallet.test.ts`.

**Interfaces:**
- Produces:
  - `interface Wallet { coins: number; inventory: Record<PowerUpKind, number> }`
  - `emptyWallet(): Wallet` (starter: 300 coins, `{ demo: 1, wormhole: 1, tractor: 0 }`)
  - `earn(w, n): Wallet`
  - `canBuy(w, kind): boolean` (coins ≥ cost)
  - `buy(w, kind): Wallet` (spends cost, +1 charge; unchanged if unaffordable)
  - `useCharge(w, kind): Wallet` (−1 charge if owned)
  - `loadWallet(storage?): Wallet`, `saveWallet(w, storage?): void`

- [ ] **Step 1: Failing test** — create `tests/meta/wallet.test.ts`:

```ts
import { emptyWallet, earn, canBuy, buy, useCharge, loadWallet, saveWallet } from '../../src/meta/wallet';

test('starter wallet has coins and a couple of charges', () => {
  const w = emptyWallet();
  expect(w.coins).toBe(300);
  expect(w.inventory.demo).toBe(1);
});

test('earning adds coins', () => {
  expect(earn(emptyWallet(), 150).coins).toBe(450);
});

test('buying spends coins and grants a charge only when affordable', () => {
  let w = emptyWallet(); // 300 coins
  expect(canBuy(w, 'wormhole')).toBe(true); // 200
  w = buy(w, 'wormhole');
  expect(w.coins).toBe(100);
  expect(w.inventory.wormhole).toBe(2);
  expect(canBuy(w, 'tractor')).toBe(false); // 400 > 100
  expect(buy(w, 'tractor')).toEqual(w); // unaffordable → unchanged
});

test('using a charge decrements it, never below zero', () => {
  let w = { coins: 0, inventory: { demo: 1, wormhole: 0, tractor: 0 } } as const;
  w = useCharge(w, 'demo');
  expect(w.inventory.demo).toBe(0);
  expect(useCharge(w, 'wormhole').inventory.wormhole).toBe(0);
});

test('save/load round-trips through injected storage', () => {
  const store: Record<string, string> = {};
  const fake = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  const w = earn(emptyWallet(), 75);
  saveWallet(w, fake as unknown as Storage);
  expect(loadWallet(fake as unknown as Storage)).toEqual(w);
});
```

- [ ] **Step 2: Run** `npm test -- wallet` → FAIL (module missing).

- [ ] **Step 3: Implement** — create `src/meta/wallet.ts`:

```ts
import { POWER_UP_COST, type PowerUpKind } from '../core';

/** Persistent currency + owned power-up charges (localStorage-backed). */
export interface Wallet { coins: number; inventory: Record<PowerUpKind, number> }

const KEY = 'sliding-stars-wallet';

export function emptyWallet(): Wallet {
  return { coins: 300, inventory: { demo: 1, wormhole: 1, tractor: 0 } };
}

export function earn(w: Wallet, n: number): Wallet {
  return { ...w, coins: w.coins + Math.max(0, n) };
}

export function canBuy(w: Wallet, kind: PowerUpKind): boolean {
  return w.coins >= POWER_UP_COST[kind];
}

export function buy(w: Wallet, kind: PowerUpKind): Wallet {
  if (!canBuy(w, kind)) return w;
  return { coins: w.coins - POWER_UP_COST[kind], inventory: { ...w.inventory, [kind]: w.inventory[kind] + 1 } };
}

export function useCharge(w: Wallet, kind: PowerUpKind): Wallet {
  if (w.inventory[kind] <= 0) return w;
  return { ...w, inventory: { ...w.inventory, [kind]: w.inventory[kind] - 1 } };
}

export function loadWallet(storage: Storage = localStorage): Wallet {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return emptyWallet();
    const p = JSON.parse(raw) as Partial<Wallet>;
    const base = emptyWallet();
    return {
      coins: p.coins ?? base.coins,
      inventory: { ...base.inventory, ...(p.inventory ?? {}) },
    };
  } catch { return emptyWallet(); }
}

export function saveWallet(w: Wallet, storage: Storage = localStorage): void {
  try { storage.setItem(KEY, JSON.stringify(w)); } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run** `npm test -- wallet` → PASS. Then `npm test` (purity guard green — meta→core is allowed).

- [ ] **Step 5: Commit** `git commit -m "feat(meta): persistent wallet (coins + power-up charges)"`

---

## Task 3: Wire the wallet economy into the game

**Files:** Modify `src/main.ts`. Verify: typecheck, build, browser.

**Interfaces:** Consumes `Wallet` API. The HUD points chip now shows the persistent coin bank; buying/using power-ups reads/writes the wallet; scoring earns coins live.

- [ ] **Step 1: Imports + load** — in `src/main.ts`, change the core import to drop `buyPowerUp` (no longer used) and add the wallet:

```ts
import { findHint, loadLevel, trySwap as trySwapExport, usePowerUp, type MoveResult, type PowerUpKind } from './core';
import { loadWallet, saveWallet, earn, canBuy, buy, useCharge } from './meta/wallet';
```

Replace the local inventory declaration:

```ts
  let pendingPowerUp: PowerUpKind | null = null;
  // starter charges, like the original's early gifts (save system lands in Plan 4)
  const inventory: Record<PowerUpKind, number> = { demo: 1, wormhole: 1, tractor: 0 };
```

with:

```ts
  let pendingPowerUp: PowerUpKind | null = null;
  let wallet = loadWallet(); // persistent coins + owned charges
```

- [ ] **Step 2: Earn coins live from scoring** — replace `animator.onPoints`:

```ts
  animator.onPoints = (amount) => {
    wallet = earn(wallet, amount);
    saveWallet(wallet);
    hud.setPoints(wallet.coins);
  };
```

- [ ] **Step 3: Stop showing per-level points as currency** — in `applyResult`, remove the two lines:

```ts
    pointsShown = res.state.points;
    hud.setPoints(pointsShown);
```

(the wallet drives the coin display now). Also delete the now-unused `let pointsShown = 0;` declaration and the `pointsShown = 0;` line in `startLevel`.

- [ ] **Step 4: Buy/use from the wallet** — replace the whole `hud.onPowerUpPick` handler body's inventory logic:

```ts
  hud.onPowerUpPick = (kind) => {
    lastInteraction = Date.now();
    if (kind === null) { pendingPowerUp = null; hud.armSelection(null); return; }
    if (wallet.inventory[kind] > 0) {
      if (kind === 'wormhole') {
        const res = usePowerUp(state, 'wormhole');
        pendingPowerUp = null; hud.armSelection(null);
        if (res.legal) { wallet = useCharge(wallet, 'wormhole'); saveWallet(wallet); hud.setInventory(wallet.inventory); applyResult(res); }
      } else {
        pendingPowerUp = kind; hud.armSelection(kind);
      }
      return;
    }
    // none owned: buy a charge with coins
    if (canBuy(wallet, kind)) {
      wallet = buy(wallet, kind); saveWallet(wallet);
      hud.setPoints(wallet.coins); hud.setInventory(wallet.inventory);
    } else {
      hud.shakeSlot(kind);
    }
  };
```

And in the target-picking `app.stage.on('pointertap', ...)` handler, replace `inventory[kind]--;` and its `hud.setInventory(inventory);` with:

```ts
      wallet = useCharge(wallet, kind); saveWallet(wallet);
      hud.setInventory(wallet.inventory);
```

- [ ] **Step 5: Show the wallet everywhere the HUD is seeded** — replace the remaining `hud.setInventory(inventory)` calls (in `startLevel` and the boot seeding block) with `hud.setInventory(wallet.inventory)`, and the boot `hud.setPoints(...)`/`startLevel` point-reset with `hud.setPoints(wallet.coins)`.

- [ ] **Step 6: Typecheck + build** → clean (confirm no remaining `inventory`/`pointsShown`/`buyPowerUp` references).

- [ ] **Step 7: Browser** — start preview; confirm the coin chip starts at the persistent balance, climbs as you score, persists across a level change (set level, reload), and that buying a power-up (when affordable) spends coins and adds a charge. Screenshot.

- [ ] **Step 8: Commit** `git commit -m "feat: persistent coin economy - earn across levels, spend on power-ups"`

---

## Task 4: Full verification + deploy

- [ ] **Step 1:** `npm test && npm run typecheck && npm run build` → all green.
- [ ] **Step 2: Device pass** — a later level (e.g. 50) shows a busy obstacle mix; coins persist and buy power-ups. No console errors.
- [ ] **Step 3: Deploy** to Netlify site `bc41ec96-bbad-4e56-b0d1-c612c54db038`; report the URL.

## Self-Review

**Coverage:** later-level density + extended 1..70 sweep (T1); persistent wallet with continuous earning and cross-level spend (T2–T3). ✓
**Placeholders:** none. ✓
**Type consistency:** `Wallet`/`earn`/`canBuy`/`buy`/`useCharge` defined in T2 and used with matching signatures in T3; `hud.setPoints`/`setInventory` unchanged. ✓
**Purity:** wallet imports only `POWER_UP_COST`/`PowerUpKind` from core (allowed direction). ✓
**Risk:** denser levels could exceed the solver's reach — the extended 1..70 sweep is the guardrail; dial `comet`/`crystals` down if red. Continuous coin-earning means a lost level keeps its coins (intended, player-friendly).
