# Sliding Stars First Playable Implementation Plan (Plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A polished, playable Level 1 running on the user's iPhone over LAN — full drag feel, the Animation-spec juice, procedural space art, HUD, and win/fail flow — ending at the mechanics sign-off gate.

**Architecture:** The renderer consumes `MoveResult.events` from `src/core` (never mutates rules). One PixiJS `Application`; layers (containers) bottom-up: starfield → board tiles → overlays/survivors → effects/particles → HUD. An `Animator` runs a FIFO of event-driven tweens; input is a small drag state machine that previews swaps visually and commits through `trySwap`.

**Tech Stack:** PixiJS v8, TypeScript strict, Vite dev server (`--host` for iPhone testing over LAN). No other runtime deps.

## Global Constraints

- Everything from Plan 1's Global Constraints still holds (core purity, spec rules).
- **Animation timings (from spec §Animation):** drag lift scale 1.06; swap glide 140ms ease-out; snap-back 150ms with overshoot; merge: slide-in 120ms → flash → result pop 180ms overshoot 1.15; falls accelerate (quad-in) landing squash 80ms; spawns slide from top 160ms; all interruptible; input never blocked — moves queue.
- **Palette (spec §Theme, hierarchy is a hard requirement):**
  - space background `#0b0e1d` with dim stars;
  - tier 1 dense nebula `#2a2450` (3 wisps `#6e5fc0`);
  - tier 2 thin nebula `#3d3f7d` (2 wisps `#8f86d8`);
  - tier 3 stardust `#6a6fb8` (1 wisp `#c9c6f0`);
  - tier 4 regolith `#c9a15f` (crater dots `#a37d3f`);
  - tier 5 living land `#5fbf5a` (foliage dots `#3d8f3a`);
  - pod hull `#d9d9e8`, dome shell `#e8f4ff` on green base.
  - Brightness must ramp strictly upward tier 1→5 (verify by eye at each art task).
- Tile corner radius ≈ 18% of tile size; 6% gap between tiles; the board scales to fit `min(screen width, 7 cols)` portrait with HUD ~10% top, power-up tray ~12% bottom.
- Dev server must run with `--host` so the iPhone can reach it; game must render correctly in iPhone Safari portrait (no scroll/zoom/bounce).
- Desktop mouse events must work too (dev convenience) — pointer events cover both.

---

### Task 1: App shell + starfield boot

**Files:**
- Create: `index.html`, `src/main.ts`, `src/render/app.ts`, `src/render/starfield.ts`
- Modify: `package.json` (add `pixi.js`)

**Interfaces:**
- Produces: `createApp(): Promise<{ app: Application; layers: Layers }>` where `export type Layers = { board: Container; pieces: Container; actors: Container; fx: Container; hud: Container }` — every later task adds children to these layers only.

**Steps:**
- [ ] `npm install pixi.js`
- [ ] `index.html`: viewport meta `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no`; `<style>` html,body margin 0, background `#0b0e1d`, `overflow:hidden`, `touch-action:none`, `position:fixed`, `inset:0`, `overscroll-behavior:none`; a single `<div id="game"></div>`; module script `src/main.ts`.
- [ ] `src/render/app.ts`: init Pixi `Application` with `resizeTo: window`, `background: 0x0b0e1d`, `antialias: true`, `resolution: devicePixelRatio` capped at 2; create the five layer containers in z-order; export `Layers` type.
- [ ] `src/render/starfield.ts`: `addStarfield(layer: Container, w: number, h: number)` — 120 tiny circles (radius 0.5–1.5, alpha 0.2–0.8, three parallax bands), plus a slow ticker twinkle (alpha sine, period 3–7s per star, phase random).
- [ ] `src/main.ts`: `createApp()` then `addStarfield(...)`.
- [ ] Verify: `npm run dev` → open browser → full-viewport dark space with twinkling stars, no scrollbars. Check 60fps in devtools performance overlay.
- [ ] `npm run typecheck` green. Commit `feat: app shell with pixi starfield`.

### Task 2: Procedural tile art

**Files:**
- Create: `src/render/textures.ts`
- Test: `tests/render/textures.test.ts` (node-safe parts only: color ramp assertions)

**Interfaces:**
- Produces: `buildTextures(app: Application, tileSize: number): TextureSet` with `export type TextureSet = { tile: Record<Tier, Texture>; pod: Texture; dome: Texture; survivor: Texture; bubbleRescue: Texture; bubbleShelter: Texture }`.
- Also exports `TIER_FILL: Record<Tier, number>` (the palette constants) so the ramp is testable.

**Steps:**
- [ ] Test (pure, no Pixi): perceived luminance of `TIER_FILL[t]` strictly increases t=1→5 (hierarchy guard). Luminance = 0.299r+0.587g+0.114b.
- [ ] Implement `TIER_FILL` per Global palette; verify test green.
- [ ] Implement texture painting with Pixi `Graphics` → `app.renderer.generateTexture(...)`: rounded-rect base (radius 18%), subtle top-edge highlight (lighter stroke) and bottom-edge shade for relief; wisp icons (3/2/1 small swirl circles) for tiers 1–3; 5 crater dots tier 4; foliage dots + lighter center patch tier 5; pod = rounded capsule with window; dome = half-circle shell on green base with strut lines; survivor = 3-circle astronaut (helmet, body, visor); bubbles = white rounded speech bubble with ring / dome glyph.
- [ ] Verify visually in dev server: render one sprite of each texture in a row; tiers must read as an obvious dark→bright ramp with countable wisps. Screenshot check.
- [ ] Typecheck + commit `feat: procedural texture atlas with tier ramp guard`.

### Task 3: Board view + layout

**Files:**
- Create: `src/render/boardView.ts`, `src/levels/level001.ts`
- Test: `tests/render/layout.test.ts` (pure layout math)

**Interfaces:**
- Consumes: `loadLevel`, `BoardState` (core), `TextureSet` (T2).
- Produces:
  - `computeLayout(rows, cols, vw, vh): { tileSize: number; originX: number; originY: number }` (pure — HUD band 10% top, tray 12% bottom, 6% gaps, centered)
  - `class BoardView { constructor(layers, textures, state); sprites: Map<string, Sprite>; posKey(r,c): string; cellXY(r,c): {x,y}; syncFrom(state: BoardState): void }` — creates/updates one sprite per in-mask cell; `syncFrom` snaps everything to model state (used at load and as the safety net after animations).
- `level001.ts`: exports `LEVEL_001: LevelDef` — 5×6 mask, tiers 1–3 mix with a guaranteed opening 3-match, 2 survivors (one swimming near bottom, one on a tier-4 ledge), goal rescueN:2, seed 11. Must pass `solve(LEVEL_001, 30).solved === true` (assert in test).

**Steps:**
- [ ] Tests: layout math centers the grid and respects bands; `solve(LEVEL_001, 30)` succeeds (uses core only — no Pixi import in the test).
- [ ] Implement; wire `main.ts` to load LEVEL_001 and render the static board with survivors standing/swimming (swimmer gets semi-submerged look: 70% scale + ripple ring).
- [ ] Verify in dev server: board renders centered, tiers readable. Commit `feat: board view renders level 1`.

### Task 4: Drag input state machine

**Files:**
- Create: `src/input/drag.ts`

**Interfaces:**
- Consumes: `BoardView.cellXY`, `computeLayout`, `trySwap`.
- Produces: `attachDrag(app, view, getState, onMove)` where `onMove(result: MoveResult): void`; internal states `idle → armed(cell) → dragging(cell, dir) → released`. Behavior: pointer-down on a tile arms it (lift: scale 1.06, z-top, soft shadow); movement beyond 12% of tileSize locks the dominant axis direction toward one neighbor; the dragged sprite follows the finger clamped to ±1 cell along that axis while the neighbor slides mirror-fashion (swap preview); release ≥50% displacement → call `trySwap` with (from,to); otherwise animate both back (snap 150ms). While an `Animator` run is in flight, input still arms/drags but commits queue (FIFO) — never dropped, never blocking.

**Steps:**
- [ ] Implement; temporary `onMove`: `view.syncFrom(result.state)` (instant, no animation yet).
- [ ] Verify on desktop: dragging previews the swap 1:1 with the pointer; releasing early snaps back; a no-match swap snaps back after commit (core rejects); a match instantly re-syncs the board (placeholder until T5).
- [ ] Verify the survivor/goal state changes flow (win state reachable? not yet — HUD in T6/T7).
- [ ] Typecheck + commit `feat: drag state machine with swap preview`.

### Task 5: Event-stream Animator (the juice)

**Files:**
- Create: `src/render/animator.ts`, `src/render/tween.ts`, `src/render/fx.ts`

**Interfaces:**
- Consumes: `GameEvent[]` (core), `BoardView`, `TextureSet`.
- Produces: `class Animator { play(events: GameEvent[], finalState: BoardState): Promise<void> }` — sequences event groups: swap glide (140ms) → per-merge: converge (120ms, matched sprites slide to anchor with 0.9 squash) + white flash + result pop (180ms, overshoot 1.15) + tier-colored glow ring + 12-particle radial burst (fx layer) → falls batched per gravity pass (quad-in, 60ms/cell, landing squash 80ms) → spawns slide from above the top mask edge (160ms) → survivor beats (grounded: hop + bubble pop-away; housed: walk-to-dome 200ms + heart puff; lost: fade 400ms; needTick: pip update, pulse red when ≤3) → win/lost banner trigger. `tween.ts`: minimal promise tween runner on Pixi ticker with easings (`outQuad, inQuad, outBack`); `fx.ts`: flash, glowRing, burst, ripple helpers. After every `play`, call `view.syncFrom(finalState)` as safety net. Cascade merges (2nd+ gravity pass) escalate: burst count ×1.5, flash brighter.

**Steps:**
- [ ] Implement tween runner; smoke-test in dev page (tween a test sprite; remove after).
- [ ] Implement Animator handling: swap, merge (+pod/dome variants using their textures), fall, spawn, survivor events, needTick pips (pips drawn in T6 — call a hook `view.updateNeed(id, movesLeft)` that T6 fills in; until then it may be a no-op **with a `// wired in T6` comment**).
- [ ] Replace T4's instant `onMove` with `animator.play(result.events, result.state)`; queued moves drain FIFO.
- [ ] Verify on desktop against Animation spec timings: swap glides; merges converge-flash-pop with burst; falls accelerate and squash; spawns slide in; snap-backs spring. Compare feel side-by-side with reference video moments (0.25×): merge beat and refill cadence should read the same.
- [ ] Typecheck + commit `feat: event-driven animator with merge/fall/spawn juice`.

### Task 6: Survivors, needs, and goal HUD

**Files:**
- Create: `src/render/hud.ts`
- Modify: `src/render/boardView.ts` (survivor sprites: bob idle, ripple when swimming, need bubble + pip bar child)

**Interfaces:**
- Produces: `class Hud { constructor(layers.hud, goal); setProgress(rescued: number): void; showBanner(kind: 'won'|'lost', onAction: () => void): void }` — top-left goal chip (survivor icon + `rescued/N` text with tick-bounce), settings gear placeholder (non-functional), bottom tray with 3 greyed power-up slots (locked look, per original's early game); banners: WON = "Sector Rescued!" + replay ▶ next placeholder; LOST = gentle "They drifted away… Try again" + instant retry button that reloads LEVEL_001 fresh.
- `view.updateNeed(id, movesLeft)`: bubble shows pips (needMoves max→0), pips turn `#e05555` and bubble pulses at ≤3.

**Steps:**
- [ ] Implement; wire Animator's survivor/needTick/win/lost hooks to view + hud.
- [ ] Verify full loop on desktop: play LEVEL_001 to a win (rescue both) and to a loss (stall 12 moves); banners show; retry restarts cleanly (fresh `loadLevel`, no stale sprites).
- [ ] Typecheck + commit `feat: survivors, need pips, goal hud, win/fail flow`.

### Task 7: iPhone verification pass (feel gate)

**Files:**
- Modify: whatever the pass surfaces (expect small fixes: dpr, touch offsets, perf).

**Steps:**
- [ ] Run `npm run dev -- --host`; find LAN IP (`ipconfig` → IPv4); user opens `http://<ip>:5173` on the iPhone.
- [ ] Checklist on device: no scroll/bounce/zoom during play; drag tracks finger with no visible latency; 60fps during cascades (no hitching); tiles readable at arm's length; tap targets comfortable; audio absent (Plan 4) — silence is fine.
- [ ] Fix what fails; commit fixes individually (`fix: ...`).
- [ ] **Mechanics sign-off gate:** user plays Level 1 on the phone and confirms: swap feel, merge behavior, gravity/refill direction, need pressure, win/fail. Also re-check the spec's "verify at implementation" list against the reference video at 0.25× (merge anchor position, cascade celebration, no-match snap-back) and correct core (failing test first) if any rule differs.
- [ ] Commit `docs: record mechanics sign-off outcomes in spec verify-list`.

## After this plan

Plan 3 (content systems: power-ups, overlays, goals, levels 1–70, endless generator) unlocks once the sign-off gate passes — content stacks on a feel that's already right. Plan 4 (story, colony, audio, PWA install, deploy) ships the gift.

## Self-review

- Covers spec: Animation §1–8 + §10 partially (idle life T2/T3, drag T4, merge/fall/spawn T5, survivor beats + HUD T6; level-complete celebration full version and transitions land in Plan 4 with story assets). §9 (celebration) minimal banner now, full fireworks Plan 4 — acceptable for playable gate.
- No task depends on unbuilt names: `updateNeed` declared T5, implemented T6, flagged inline.
- Type names consistent: `Layers`, `TextureSet`, `BoardView`, `Animator`, `Hud`, `LEVEL_001`.
