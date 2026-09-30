# Sliding Stars gameplay review — September 25, 2026

## Product goal to preserve

**Build a space version of the Sliding Seas iPhone experience:** merge terrain into safety, rescue people through spatial planning, and turn those rescues into a growing, personal home. The rescue puzzle and the pleasure of building a home are the central loop. Space art, extra hazards, and an endless level counter support that loop; they do not replace it.

The reference game's official description emphasizes matching/merging land, varied rescue challenges, and growing/decorating a home island. See [Sliding Seas](https://www.slidingseas.com/) and its [iPhone listing](https://apps.apple.com/us/app/sliding-seas/id1436245163). This review compares those broad product pillars, not every rule of the current commercial game.

## Assessment

There is a substantial foundation here. This is a playable Pixi/TypeScript web game with PWA support, rather than a native iOS project. The engine implements adjacent swaps, straight and intersecting matches, five terrain tiers, gravity, astronaut rescue timers, station doors, supply boxes, ice, reactors, comets, rovers, boosters, VIP collections, and station construction.

The biggest gaps are input reliability, understandable rescue rules, continuity on phones, and the connection between playing a level and growing a place the player cares about. More content should follow those fixes.

## Evidence and scope

- Ran the existing suite: **124 tests across 24 files passed**.
- `npm.cmd run typecheck` and `npm.cmd run build` succeeded.
- Played the opening board in the local browser, tested boosters and store interactions, inspected the station screen, reloaded mid-level, and tested a 390 × 844 portrait viewport and a viewport change.
- Generated levels 1–100 through the actual generator and compared their opening hints with `trySwap`. **39 opening hints were illegal**. No fallback-level signature occurred in this sample.
- Timed the same generation sweep: about 23.5 seconds total, with the slowest single level about 1.23 seconds on this Windows machine. These are Node measurements, not iPhone benchmarks.
- Examined core rules, render event handling, input propagation, persistence, level generation, and station progression.
- Physical iPhone Safari, installation/offline behavior, sustained device performance, and full campaign play were not tested. Later mechanics were inspected in code and core probes, not all played manually.
- Gameplay source was not modified. The accompanying `2026-09-25-audit-probe.mjs` preserves the core diagnostic. Run it from the repository root with `node docs/reviews/2026-09-25-audit-probe.mjs`.

## Prioritized defects

### 1. P1 — Targeted boosters cancel themselves

**Observed:** On level 1, tap the owned Demolition booster, then tap an ordinary unoccupied tile. The tile stays intact and the charge stays owned. The booster never remains armed.

**Cause:** The HUD's `pointertap` arms `pendingPowerUp`, then that same event bubbles to the stage target-picker. The stage immediately clears `pendingPowerUp` and tries to target the tray's screen coordinates. Tractor uses the same path and is affected by the same code defect; it was not separately exercised with a purchased charge.

**Source:** [main.ts:190](<H:/Projects/iPhone Apps/sliding-stars/src/main.ts:190>), [main.ts:207](<H:/Projects/iPhone Apps/sliding-stars/src/main.ts:207>), `src/render/hud.ts` booster tap handler.

**Fix direction:** Isolate HUD events from board target events. Keep the booster armed until a valid board target or explicit cancel, and highlight valid targets.

### 2. P1 — Modal screens allow hidden gameplay, with wallet overwrite

**Observed:** Open Store on the initial level. Swipe the leftmost green tile in row 5 down into row 6 (one-based). A station forms behind the store and the station-door tutorial appears over it. Close the tutorial and store: the board has changed, but the wallet is still 300.

**Cause:** An interactive backdrop prevents hit-testing lower siblings, but events still bubble to the stage, where the drag handlers live. The drag lock checks only booster selection, not modal state. The store keeps its opening wallet snapshot and returns it on close, overwriting coins earned during the hidden move.

**Source:** [main.ts:98](<H:/Projects/iPhone Apps/sliding-stars/src/main.ts:98>), [main.ts:238](<H:/Projects/iPhone Apps/sliding-stars/src/main.ts:238>), `src/input/drag.ts`, `src/render/store.ts`.

**Fix direction:** Establish one input mode for board play, animation, booster targeting, and modal screens. Block board gestures during overlays. Apply wallet purchases against authoritative current state rather than replacing it with an old snapshot.

### 3. P1 — Hints and dead-board detection disagree with legal moves

**Reproduced in core:** Level 7's first hint is `(0,1) → (0,2)`, but `(0,1)` is frozen and `trySwap` rejects it. This happened on **39 of 100** generated opening boards.

**Cause:** `findHint` checks terrain occupancy and excludes domes, but does not exclude overlays. `hasLegalMove` uses that same function. It can therefore count an impossible blocked swap as playable, and ignores legal station slides in the other direction.

**Source:** [shuffle.ts:7](<H:/Projects/iPhone Apps/sliding-stars/src/core/shuffle.ts:7>).

**Fix direction:** Share the move-legality rules among dragging, hints, the solver, and dead-board detection. After correctness, rank hints for rescue/goal progress rather than returning the first match in scan order. The opening-hint defect is confirmed; a fully stuck generated board was not reproduced.

### 4. P2 — Reshuffling moves supposedly fixed terrain and separates it from its rider

**Reproduced in core:** Shuffling level 7 changes the terrain under the frozen cell `(0,1)` from tier 1 to tier 5. Terrain under both astronauts moves elsewhere, while astronaut coordinates stay unchanged.

**Cause:** `shuffleBoard` includes every ordinary tile, including overlay-held tiles, and does not carry survivors with the permutation. This conflicts with the normal rule that survivors ride their tiles and frozen terrain stays fixed.

**Source:** [shuffle.ts:48](<H:/Projects/iPhone Apps/sliding-stars/src/core/shuffle.ts:48>).

**Fix direction:** Define the intended shuffle rule explicitly, preserve frozen/blocked cells, and keep survivor safety and visuals consistent with that rule. Validate the final board with the same legality predicate as normal play.

### 5. P2 — Viewport changes crop the game; the HUD overlaps even on a fresh phone load

**Observed:** Changing the viewport from 585 × 1270 to 390 × 844 crops the old board and removes the right/bottom controls from view. Reloading fits the board, but the currency chip partly covers the centered level label.

**Cause:** Pixi resizes the canvas, but board and HUD positions are calculated at construction or level start. There is no resize-driven relayout. HUD chip dimensions depend on screen height without reserving space for the centered level label.

**Source:** `src/render/app.ts:15`, `src/render/boardView.ts:38`, `src/render/hud.ts:92–168`.

**Fix direction:** Recalculate all scene layouts on viewport/safe-area changes and allocate explicit non-overlapping HUD regions. Verify small phones and orientation/browser-chrome changes on a physical iPhone.

### 6. P2 — Unfinished levels are not saved, while spending and earnings are

**Observed:** Reload after changing the opening board returns to the original level-1 board. The wallet and tutorial flags persist.

**Cause:** Only the level number, wallet, station, and tutorial flags are stored. Boot always creates a fresh board from `levelFor(currentLevel)`; it never restores the current puzzle, timers, or RNG state. Booster spending is persisted immediately and points are banked during animations.

**Impact:** A phone reload can erase a player's puzzle work while retaining spent boosters. Conversely, repeated partial attempts can bank earnings without preserving their board consequences.

**Source:** `src/main.ts:34–46`, `src/main.ts:112–113`, `src/main.ts:128–131`.

**Fix direction:** Persist a versioned run snapshot together with its committed rewards/spending, and restore at a stable move boundary.

### 7. P2 — New input is evaluated against a future board during animations

**Code-confirmed risk:** `applyResult` immediately replaces the logical board; the animator queues its display changes. Drag remains enabled, so a second gesture on the board still being shown is evaluated against the already-advanced board. HUD progress also jumps ahead of the displayed rescue.

**Source:** `src/main.ts:156–166`, `src/main.ts:238–242`, `src/render/animator.ts:24–31`.

**Fix direction:** Allow interaction only at a coherent board state, or queue input intentions and validate them after the preceding animation. A full rapid-input failure sequence was not captured, so this is distinguished from the reproduced defects above.

### 8. P2 — Several important events have no animation or visible warning

**Code-confirmed:** The core emits crystal, reactor, comet, and rover events, but `Animator.run` has no cases for them. These changes appear at the final `syncFrom` instead. Reactor overlays do not display fuse values. Clustered astronauts are offset from tile centers, while `ridersAt` recognizes only nodes within one pixel of the center; grouped survivors therefore miss the normal riding animation. Dome-door graphics also update only during final sync.

**Source:** `src/core/events.ts`, `src/render/animator.ts`, `src/render/boardView.ts:119–125`, `src/render/boardView.ts` overlay and survivor synchronization.

**Impact:** The player sees teleporting movement or unexplained board changes at exactly the point when understanding cause and effect matters.

**Fix direction:** Animate every gameplay-significant event, show reactor countdowns, and associate rider nodes with logical cells rather than their exact current pixel positions.

### 9. P2 — Runtime generation can visibly stall level transitions

**Measured:** Levels 61 and 67 each took roughly 1.2 seconds to generate on this machine. Generation and greedy solving happen synchronously on the app's main path before a new level is displayed.

**Source:** `src/core/generator.ts:202`, `src/levels/index.ts`, `src/main.ts:46,113`.

**Fix direction:** Precompute authored opening levels and generate/verify later boards ahead of time or in a worker. Also verify the fallback path: after 60 attempts it returns an unverified rescue level despite the function's solvability promise. No fallback was encountered in the 1–100 sample, so that is a coverage risk rather than a demonstrated failing level.

## What needs to work better as a Sliding Seas-style game

### Make rescue understandable before making it harder

The introductory card teaches matching, green terrain, and the door, but not oxygen, the safe tier-4 intermediate terrain, or the fact that a station can be slid without making a match. The oxygen countdown is hidden until six moves remain. A new player can spend half their starting rescue budget before learning that the budget exists.

The first level is generated by the same system as later boards, despite an existing handmade fixture. Introduce a short authored sequence: one terrain merge, one visible rescue deadline, safe ground, a station, its entrance, and a completed rescue. Show each rule through a successful action. Display the five-tier progression and preview where the merged result will land.

Door presentation needs particular attention. The current station sprite has a prominent illustrated entrance, while the separate blue side marker identifies the actual rescue side. Use one unmistakable entrance and highlight its target cell when useful. Explain the own-tile rescue exception consistently.

### Make the puzzle feel like shaping a place

The terrain progression is present, but the board reads as separate patterned squares. Several dark space/rock tiers are similar at phone scale, and danger versus safety is not labeled clearly. Strengthen the visual progression from void to debris to solid surface to habitat, keep boundaries readable, and make the destination of each merge predictable.

The goal is the satisfaction of planning terrain around endangered crew. Judge hints and level difficulty by that experience, not merely whether a greedy solver can win. Rescue levels have no general turn budget once crew are safe; freely sliding stations can become the dominant finish. Playtest whether that feels like a satisfying spatial puzzle or repetitive transport before changing the rule.

### Make station growth a visible reward

The current station has charm, particularly Zena and Pepper, but little active interaction: a hub with module sprites in fixed ring positions and small resident faces. It lacks a browsable crew roster, clear previews of locked rewards, placement/decorating choices, and a visible rescue-to-build progress meter on the main screen.

The first VIP appears at level 6, so the home-building payoff is delayed. An early guaranteed recruit and first construction would establish why rescues matter. Keep build choices, show the next unlock and its requirement, and let the player inspect their residents and completed places.

Only two station catalogs exist. `stationDef` clamps later station indices to the second catalog, reusing its modules and already-collected VIP identities. Completion clears the current module list and the UI offers no way to revisit completed stations. This is a bounded content implementation, not fresh endless station progression. Preserve completed homes and define what happens after catalog exhaustion.

### Improve the small pieces of game feel

- Give different feedback for rescues, box collection, oxygen loss, and running out of turns. The current banners always say “Sector Rescued!” or “They drifted away…”, even for box-only levels.
- Add an accessible help/replay-tutorial entry and a deliberate restart/pause flow.
- Add sound and optional feedback settings; no audio or haptic implementation is present in `src`.
- Keep currency/reward timing coherent with visible actions. `Animator.onPoints` currently performs the actual persistent earnings; swallowed animation failures can skip later economic events. Rewards should be committed by game state, with animation displaying them.
- Do not globally suppress every unhandled rejection. It obscures unrelated failures and makes a silent stuck interaction harder to diagnose.
- Add interaction/integration coverage. The green unit suite did not catch the broken booster activation, modal leakage, resize behavior, or illegal opening hints.

## Recommended next implementation pass

1. Fix input modes, event propagation, booster targeting, and wallet/state ownership; add regressions that reproduce the observed UI bugs.
2. Unify move legality for swaps, hints, shuffle, and dead-board checks; preserve obstacle and rider rules during shuffle.
3. Add resumable run saves and responsive scene layout.
4. Build an authored introduction and clear rescue/door/oxygen feedback, then complete hazard/rover animations.
5. Playtest the first 10–20 levels on iPhone and bring the first station-building reward forward; expand decoration and progression only after that loop feels good.

Continue in the current task. A new task is not required. This document records the product goal and findings so the implementation can stay focused on the Sliding Seas-style rescue-and-home-building loop.
