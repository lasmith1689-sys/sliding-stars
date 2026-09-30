# Sliding Stars — Mechanics & Station Design Spec

**Date:** 2026-07-06
**Builds on:** [2026-07-03 design spec](2026-07-03-sliding-stars-design.md). Same game, same
LOCKED core loop (full board, merge-up, astronaut rides its tile, match max-tier
living land → space station, on/next-to station = rescued; no rafts).
**What this adds:** four gameplay changes plus one large new meta-progression
subsystem, requested after the art pass. Each is scoped to preserve the existing
solver-verified difficulty guarantee and the pure-core architecture.

## Scope at a glance

Six features, grouped into three implementation plans so each stays shippable, built
in order **A → B → C**:

**Plan A — Core match mechanics** (core / render / generator; no new persistent state):
1. **Junction (L/T/+) matches** — a horizontal run and a perpendicular vertical
   run of the same tier that share a cell merge as ONE match, resulting one tier
   up at the shared cell (the pivot).
2. **Drift-timer pressure** — tighten and always-surface the existing per-survivor
   rescue countdown so levels have real tension; keep the global turn budget for
   select levels only.
3. **Gradual variable boards** — board size and mask shape ramp with the level
   index (small/full early → larger, irregular, holed later).
4. **Birthday-window message** — the "Happy Birthday, Zena ♥" ribbon shows only
   during the week before through the week after July 12, every year.

**Plan B — Obstacle & creature mechanics** (extends the existing overlay/entity layer):
5. **Volcano** (countdown eruption), **Turtle** (rideable survivor ferry), **Whale**
   (multi-cell blocker), and the previously-designed **Crystal/ice** freeze.

**Plan C — The Ever-Expanding Station** (new meta subsystem):
6. A persistent home base that grows across the whole game, seeded by Zena &
   Pepper's mission-control office, populated by rescued **VIP** crew.

Plan A ships first (mechanics are close to done); B and C follow, each as its own
spec → plan → implementation cycle.

---

## What already exists (important)

Investigation of the current core shows most of the substrate for features 2 and 3
is already present and merely un-tuned or un-surfaced:

- **Per-survivor timer:** `Survivor.need = { type, movesLeft }` ticks each real move
  while adrift, pauses when the survivor reaches land/station, and sets the survivor
  `lost` (→ level lost) at zero. Currently `needMoves` is a flat **30** (too generous)
  and the render layer only shows the bubble/bar once `movesLeft <= CALLOUT_AT`.
- **Global turn budget:** `BoardState.movesLeft` is enforced (`<=0` → lost) and the
  HUD "N TURNS" chip already shows/hides on it. Generated levels leave it `null`.
- **Variable boards:** `BoardState` carries `rows`, `cols`, and a boolean `mask`;
  `applyGravity` already splits each column into mask segments and refills each
  segment from its own top. The generator just always emits a full 7×6 with tiny
  corner cuts.

So feature 2 is tuning + always-on rendering, feature 3 is generator + render work,
and only feature 1 and feature 5 are genuinely new logic.

---

## Feature 1 — Junction (L/T/+) matches

**Rule.** After a swap, any horizontal run (len ≥3) and vertical run (len ≥3) of the
**same tier** that intersect at a cell form a single *junction* match. The intersection
cell is the **pivot**. This one rule covers every cross shape:
- **L** — pivot at the end of both arms.
- **T** — pivot at the end of one arm, the middle of the other.
- **+** — pivot in the middle of both arms.

**Result.** The junction clears the union of both arms and places the merged result
**one tier up at the pivot** (the angle of the L, per the user). Because a junction is
always ≥4 cells it also earns the existing `bigMerge` point bonus. If both arms are
already `MAX_TIER` living land, the pivot builds a **Space Station** (a `dome`),
consistent with how a straight 5-match already behaves. Survivors standing on any
cleared cell sweep to the pivot (same as today's merge sweep).

**Where.** `resolveMatchesOnce` (in `core/resolve.ts`) gets a pre-pass that groups the
raw `findMatches` output into junctions before the straight-run loop:
1. Build the h-runs and v-runs from `findMatches`.
2. For each (h, v) pair of equal tier sharing a cell, record a junction keyed by its
   connected component of runs (transitively merge runs that share cells, so a run
   feeding two junctions is handled once). Pivot = an intersection cell; when several
   exist, prefer the one equal to the moved cell, else the first.
3. Resolve junctions first (clear union, place merged/dome at pivot, sweep survivors),
   marking their cells consumed. Then the existing straight-run loop runs, its
   `live.length < 3` guard naturally skipping cells a junction already consumed.

**Solver / generation.** The solver drives the real `trySwap`, so it benefits
automatically; junctions only *increase* solvability, so no level regresses. Re-run
the full generated-level solvability sweep afterward.

**Tests (TDD).** New cases: L, T, and + each yield exactly one merged tile at the
pivot; MAX_TIER arms yield a `dome` at the pivot; points include `bigMerge`; a
survivor on a consumed arm cell ends on the pivot; a straight run with no
perpendicular partner still behaves exactly as before.

---

## Feature 2 — Drift-timer pressure

Keep the existing model; tune and surface it.

- **Tighten the reprieve.** Replace the flat `needMoves: 30` with a per-level value
  that ramps with difficulty — roughly **12 moves early → 8 moves later** (deliberately
  a bit more punishing than a gentle curve, but still fair). The value comes from
  `paramsForLevel` and is written into the `LevelDef`.
- **Always visible.** Show a small countdown over every adrift (`swimming`) astronaut
  from the moment they are stranded, not only near zero. Escalate the existing bubble +
  bar to the urgent red state as the count drops (keep `CALLOUT_AT` as the escalation
  threshold, but render a subtle number before it).
- **Pause on safety (unchanged).** Reaching tier ≥4 land, a pod, or a station clears the
  need and stops the countdown — the "get them to safety in time" pressure.
- **Fair by construction.** `makeSolvableLevel` only accepts a seed whose solver run
  still WINS under the tightened `needMoves` (a win means no survivor was ever lost), so
  tighter never means impossible. The existing 40-try + relaxed-fallback safety net stays.
- **Global turn budget stays selective.** Apply `moveLimit` (the "N TURNS" chip) only to
  a subset of levels — e.g. the collect-canister levels — so most rescue levels remain
  drift-driven, matching how the real game plays.

**Tests.** Survivor lost exactly when the tightened countdown hits zero; countdown
pauses on a safe tile; `paramsForLevel` returns a ramping `needMoves`; generator rejects
seeds unbeatable within it.

---

## Feature 3 — Gradual variable boards

**Generator (`paramsForLevel` + `generateLevel`).**
- **Size ramps by band:** 6×5 (full) for levels 1–3 → 7×6 → up to ~**9×8** on the
  largest late boards (with correspondingly smaller tiles), plus occasional narrow
  "puzzle" boards for variety. `computeLayout` scales tiles to fit; on the biggest
  boards tiles may shrink toward a ~34px floor (below Apple's 44px ideal, acceptable for
  later levels per the user) but never smaller, so swaps stay reliably tappable.
- **Shape ramps:** full rectangles early → corner cuts / edge notches mid → interior
  holes and non-rectangular silhouettes (carved center, diamond, cross) later, drawn from
  a small **mask template library** selected by level index. Out-of-mask cells are
  permanent gaps the engine already handles.
- Survivors and canisters continue to spawn only on in-mask cells (already true).

**Rendering holes.** Replace the single board-tray rectangle (which would show behind
gaps) with a subtle **recessed cell backing behind each real tile only**, so holes read
as genuine open space rather than empty tray. Board-view draws pieces per mask.

**Solver / layout.** The solver and gravity are already mask-aware; `makeSolvableLevel`
re-verifies every generated mask, and unsolvable shapes are rejected or relaxed by the
existing fallback. `computeLayout` already adapts to rows/cols; only add the tile-size
floor + dimension cap.

**Note:** this feature delivers the "endless generator / variable later levels" portion
of the previously-planned task 31.

---

## Feature 4 — Birthday-window message

The title screen's dedication ribbon (`render/title.ts`) renders only when the current
date falls in **July 5–19 inclusive** (the week before through the week after July 12),
in any year. Today (2026-07-06) is inside the window, so it shows this year. Outside the
window the same cozy office scene shows just the SLIDING STARS logo + PLAY. Pure date
check, no persistent state.

---

## Feature 5 — Obstacle & creature mechanics (Plan B)

Faithful reconstructions of the original's hazards. Public guides lacked specifics, so
the behaviors below are the ones the user selected; frame-step the reference videos at
implementation time to fine-tune numbers. All extend the existing overlay/entity layers
and none change the LOCKED core loop.

### Volcano — countdown eruption
An overlay on a tile carrying a `fuse` (moves until eruption) and `hp`; the volcano tile
is unswappable while active.
- **Each real move:** `fuse--`. At `fuse <= 0` it **erupts** — every orthogonally adjacent
  tile is knocked down one tier toward danger, and any survivor beside it that ends on tier
  ≤3 is thrown back to `swimming` (its rescue timer resumes). `fuse` then resets to its
  period.
- **Neutralize:** a match orthogonally adjacent (same rule as the canister) costs the
  volcano `hp`; at `hp <= 0` it goes dormant and clears, freeing the tile.
- **Skin:** a cracked, glowing magma vent on a volcanic alien moon. Goal variants: rescue
  while managing it, or a later "cap N vents" goal.

### Turtle — rideable survivor ferry
A mobile safe platform on the entity layer (like survivors), carrying a rider.
- **Movement:** after matches settle, the turtle drifts one cell per move in its authored
  direction (or toward the nearest station), stopping at holes, edges, stations, and domes.
- **Rider:** a survivor aboard is safe and its rescue timer is paused; when the turtle
  reaches or sits orthogonally adjacent to a station, the rider is **rescued**. A swimming
  survivor the turtle passes under climbs aboard.
- **Integration:** the turtle rides on top of the tile grid and does not participate in tile
  matching or gravity (resolved after settle, like survivor re-evaluation). Movement
  resolution order is the trickiest part and is flagged for the implementation plan.
- **Skin:** a friendly space tortoise / drone-raft ferrying a crew member.

### Whale — multi-cell blocker
A large creature occupying a contiguous block of cells (e.g. 1×3 or 2×2), each a `whale`
overlay segment sharing one `hp` pool.
- **Blocks:** its cells are unswappable and act as gravity barriers (like a dome/hole
  cluster) — tiles neither occupy nor fall through them.
- **Clear:** matches orthogonally adjacent to any segment damage the shared `hp`; at zero
  the whale is **freed** — it swims away with a flourish, its cells reopen and refill, and it
  counts toward a "free the whale" goal (or simply reopens the path to survivors/station).
- **Skin:** a gentle space-whale / leviathan tangled in asteroid netting.

### Crystal / ice (previously designed, folded in)
The already-specced freeze overlay: freezes its tile (unswappable + immovable) until an
adjacent match cracks it away. Included here since it shares the overlay machinery.

### Shared work
- Extend the `Overlay` union (`volcano`, `whale`; `crystal` already typed) and add a turtle
  entity; extend `damageOverlays` / `settle` to drive fuses, eruptions, whale hp, and turtle
  movement; add events per obstacle so the animator can play them.
- The **solver** must understand each obstacle enough to still verify solvability (wait out
  or neutralize a volcano, use a turtle, clear a whale). This is the main risk in this plan;
  `makeSolvableLevel` must keep every generated level beatable.
- Pixel-art assets via the pipeline: volcano (active/dormant), turtle, whale, crystal.
- TDD each: volcano fuse/eruption/neutralize; turtle movement + rider rescue; whale
  hp/clear/reopen; crystal freeze/crack.

## Feature 6 — The Ever-Expanding Station (Plan C)

A persistent home base that grows across the entire game — the emotional core of the
gift. **Seed = Zena & Pepper's mission-control office** (the title-screen room). New
sections *dock onto* it like a real space station accreting modules.

### State (new, app-layer — keeps core pure)
`src/meta/station.ts`, backed by `localStorage`:
```
StationState {
  totalRescued: number;                   // cumulative survivors rescued, all levels
  collectedVips: VipId[];                  // unique VIP characters rescued (200+ pool)
  builtModules: ModuleId[];                // station modules docked so far
  placements: Record<ModuleId, VipId[]>;   // which VIPs live in which module
  lastMilestoneIndex: number;             // highest expansion milestone already granted
}
```
Core stays render-free; the meta module is loaded/updated only from the app layer
(`main.ts` / station screen).

### VIPs and modules (decoupled, so it scales to thousands of levels)
Because Zena will play thousands of levels, the VIP pool must be large while the buildable
station stays curated:
- **A large VIP roster — 200+ unique characters.** Space *and* town themed, matching the
  original's variety (it has things like go-kart tracks, so not pure space): astro-botanist,
  ice-cream vendor, go-kart racer, barista, DJ, teacher, florist, mechanic, chef, medic,
  librarian, beekeeper, arcade kid, and so on. Each is a distinct little sprite defined in a
  `VIP_ROSTER` data table (`id`, `name`, `moduleCategory`, sprite asset).
- **A bounded set of station modules — ~15–25.** Each module is a *category* home that holds
  several VIPs: e.g. **Greenhouse** (botanist, florist, beekeeper), **Galley/Cantina** (chef,
  barista, ice-cream vendor), **Rec Deck** (go-kart racer, DJ, arcade kid), **Observatory**
  (astronomer, navigator), **Learning Pod** (teacher, librarian), **Medbay** (medic, nurse),
  **Workshop** (mechanic, engineer), and a **Pet Bay** for Pepper's crew. Modules are what an
  expansion builds; collected VIPs fill their category's module slots.
- **Distinct VIP sprites:** a VIP is a normal survivor to rescue, rendered with its own sprite
  so she can tell it's special. Core change: `Survivor.vip?: string` (a plain VIP id — core
  imports nothing from meta) and `LevelDef.survivors` entries may carry that id; a VIP
  `survivorHoused` awards a bonus.
- **Sporadic:** the generator flags a survivor as a VIP only occasionally (deterministic by
  seed — e.g. ~1 in 4–5 rescue levels), preferring VIPs not yet collected so the roster fills
  steadily over hundreds of levels. VIPs are banked only on a level **win**; `main.ts` reads
  which VIP survivors ended `housed` and updates `collectedVips` + `totalRescued`.

### Expansion
- **Trigger: rescue-count milestones.** When `totalRescued` crosses the next milestone
  (spaced to land roughly every 5–10 levels) and at least one module is unlocked-but-unbuilt,
  an expansion is offered after the win banner. A module is **unlocked** once she has
  collected ≥1 VIP of its category.
- **Choice: free choice from all unlocked.** The station screen presents every unlocked,
  unbuilt module; she picks one to dock on, its category's VIPs move into it, and the station
  visibly grows. Remaining unlocked modules stay available for the next milestone; VIPs of an
  already-built module's category simply move into it when collected.

### Station screen (`src/render/station.ts`)
A dedicated view drawing the office core + docked module sprites in a pleasing layout,
plus the roster. Auto-pops at each expansion (the "your home grew" moment) and is
reachable between levels via a small HUD button. Choice persists to `localStorage`.

### Art
New pixel-art assets via the existing OpenAI pipeline (`scripts/gen-art.mjs` +
`clean-art.mjs`), style-matched to the office/commander/Pepper:
- **~15–25 module sprites** at high quality (they render large as station sections that
  dock onto the core).
- **200+ VIP sprites** generated in themed batches. VIPs render small on-screen, so they
  use a lower-cost quality tier (~$0.04 each at medium 1024²), keeping the full set on the
  order of ~$8–12 total; batches are spread across sessions to respect the $20/day cap.
The roster and its sprite filenames live in the `VIP_ROSTER` table so generation, cleanup,
and rendering all read the same source of truth.

**Tests.** Meta-state load/save/round-trip; milestone math (crossing a threshold grants
exactly one expansion; none when no unlocked module is unbuilt); a VIP rescue on a win
adds its role once; core `vip` tag survives swap/merge/gravity sweeps.

---

## Sequencing & relationship to existing tasks

- **Plan A** (features 1–4) first — cohesive core/render/generator changes, each
  independently shippable and verifiable via the solver sweep + browser device check.
- **Plan B** (feature 5, obstacles) next, as its own plan — the user's requested focus
  after the core mechanics.
- **Plan C** (feature 6, station) last, as its own plan.
- Feature 3 subsumes the generator half of prior **task 31** (its remaining exotic
  hazards — wells, geysers — stay deferred). Feature 5 absorbs prior **task 30**
  (crystal/ice) and the whale from task 31. The station (feature 6) is the richer
  successor to **task 34**'s "Pepper finale" idea and may absorb it.

## Non-goals (YAGNI)

- Obstacle set is bounded to volcano, turtle, whale, and crystal/ice for now; other
  original hazards (wells, geysers, pirates, whirlpools, penguins) stay deferred.
- No cloud save / accounts; `localStorage` only.
- No economy rebalance beyond the VIP bonus and existing point values.
- Station modules are cosmetic/progression rewards; they do not alter in-level rules.

## Success criteria

1. L/T/+ matches resolve as one merge at the pivot, verified by tests and visible in play.
2. Levels feel tense: adrift astronauts show a ticking countdown from the start and can
   actually be lost, yet every generated level remains solver-verified beatable.
3. Boards visibly vary in size and shape as levels climb, with holes reading as open
   space; tiles never shrink below a thumb-friendly size.
4. The birthday ribbon appears only July 5–19.
5. Obstacles behave faithfully and remain fair: a volcano erupts on its countdown and can
   be neutralized, a turtle ferries and rescues its rider, a whale blocks until cleared,
   crystals thaw on an adjacent match — and every generated level stays solver-verified.
6. Rescuing VIPs grows a persistent station from Zena & Pepper's office; expansions let
   her freely choose unlocked modules; the base and roster persist across sessions.
