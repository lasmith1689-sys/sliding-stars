# Sliding Stars 1,000-Level Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a cute, relaxed but thoughtful space-rescue campaign with 1,000 fixed levels, 25 distinct mechanics, varied boards, continuing home rewards, and reliable iPhone web-app installation.

**Architecture:** Keep the current engine available for unfinished legacy games. Build a separately versioned campaign engine with a single deterministic transition function used by play, hints, validation and replay; render its ordered events without inventing game rules. Ship curated level data and finished assets in the improved app only.

**Tech Stack:** Existing TypeScript, Vite, PixiJS, Vitest, Sharp, static PWA and Netlify `next` alias. Keep existing dependencies; use the available browser tools for manual checks. Offline content tools run with the existing Node runtime.

**Spec:** [Approved design v2](../../1000-LEVEL-CAMPAIGN-DESIGN-v2.md), [rollout CSV](../../campaign-mechanics.csv), [broader research](../../SLIDING-SEAS-BROADER-RESEARCH.md). Read all three before execution. Reference-inspired categories are not claims of exact Sliding Seas rules or unlock levels.

## Global Constraints

- All paths below are relative to `H:/Projects/iPhone Apps/sliding-stars/sliding-stars-next`. Preserve parent source, original save/cache namespaces and original production deployment.
- Ship exactly 1,000 fixed numbered definitions. Retain five existing mechanics and add twenty; cosmetics, sizes, boosters and durability do not inflate the total of 25.
- Preserve Zena/Pepper and the existing rounded, friendly visual style. No paid lives, real-time deadlines or waiting to retry.
- Normal boards: 4–7 columns, 4–9 rows; smaller teaching boards allowed. At least 40 CSS-pixel playable-cell hit targets at 375×667 and 390×844; inspect 320×568 too.
- Most levels use one or two additional mechanics; maximum three. Default caps: six active crew, two moving carriers, one spreading system. Exceptions need recorded playtest justification.
- Follow the exact seven-stage turn order and compatibility restrictions in the approved design. Rejected actions and existing boosters do not tick clocks or actors.
- Keep all existing wallet balances, boosters, homes, VIPs and the exact active legacy board. Schema, engine rules and campaign versions are separate.
- Required campaign data and compressed art must be available offline before announcing offline readiness. Publish only to `https://next--sliding-stars.netlify.app`.
- A solver timeout is unresolved, not a passing test. Every shipped level needs a booster-free winning trace replayed by the shipped rules.
- Internal builds are progress, not completion of the requested 1,000-level game. Do not claim physical iPhone performance until measured on hardware.

## Review Focus

1. Legacy progress at 1, 1000 or above 1000, corrupted storage and a reload during victory must preserve earned possessions without inventing new completions or paying twice: Tasks 4 and 31.
2. A blocked wave entry or portal receiver must wait without overwriting a passenger, starving a refill segment or entering an infinite settle loop: Tasks 2, 8 and 13.
3. The final rescue on an expiring turn must win before unresolved counters tick, while scheduled future crew prevent premature victory: Tasks 2, 7 and 8.
4. Backgrounding, resizing or interrupting an animation must recover to the saved final state, apply no second move and leave controls usable: Tasks 5 and 33.
5. Tall irregular boards on small phones, low storage and an interrupted service-worker update must not hide controls or falsely promise offline play: Tasks 5 and 33.

## File and interface boundaries

One integrated plan is appropriate because the engine, level format, renderer and save version share contracts. Tasks produce independently testable slices; chapter content is curated as its rules become available, then audited as one campaign.

### Engine and content

- Keep `src/core/game.ts`, legacy level generation and `src/meta/run.ts` callable for version-1 saves. Do not run the legacy full turn resolver inside the campaign resolver: that would tick and rescue twice.
- Create `src/campaign/types.ts`: `MechanicId` is the exact 25-ID CSV union; `CampaignLevel`, `CampaignState`, `CampaignAction`, `CampaignEvent`, `CampaignTransition`, `CampaignGoal`, `GeometryDef`, `MechanicDef`, `MechanicRuntime`, `SolutionTrace`, `ValidationIssue`.
- Create `src/campaign/schema.ts`: runtime parsing of unknown data into the above types. No unchecked JSON casts at save or level boundaries.
- Create `src/campaign/catalog.ts`, `schedule.ts`, `lessons.ts`, `chapters.ts`, `compatibility.ts`: fixed content, progression, teaching, chapter metadata and allowed combinations respectively.
- Create `src/campaign/engine/{load,turn,settle,geometry,occupancy,transport,goals,needs,actions,hash}.ts`, each named for its single responsibility.
- Create `src/campaign/mechanics/<id>.ts` and `registry.ts`. Each module owns its discriminated definition/runtime types, match effects and scheduled effects. Existing mechanics also get modules; port their actual behavior, not merely their names.
- Create `src/campaign/content/chapter-01.json` through `chapter-20.json`: 50 committed definitions each. No runtime generation fallback.
- Create `scripts/campaign/{generate,solve,validate,replay,report}.mts` and `validation/campaign/{traces,report.json,playtests.md}`. Winning traces are development artifacts, excluded from the production build.

### Shared contracts (defined by Task 1; consumed by all later tasks)

- `CampaignAction = {type:'swap'; from:Pos; to:Pos} | {type:'translate'; actorId:string; dr:number; dc:number} | {type:'booster'; kind:PowerUpKind; at:Pos}`. Booster inventory/charging belongs to the session, not the engine. Translation requires `abs(dr)+abs(dc) === 1`.
- `CampaignLevel`: `id` (1–1000), `campaignVersion`, `rulesVersion`, `chapter`, `seed`, `geometry`, initial pieces/crew/actors/fixtures, finite arrivals, `mechanics`, one or two `goals`, `moveLimit`, `needMoves`, presentation/lesson/reward IDs and authoring metadata. Metadata includes shape family, difficulty, puzzle-purpose tags, assisted allowance and any reviewed cap override.
- `CampaignState`: complete immutable transition snapshot: level/rule versions, turn, next entity ID, RNG, active geometry, pieces with stable IDs, crew and their independent rescue/shelter needs, actor/fixture runtime, scheduled arrivals, goal progress, moves remaining, points and status. All queues and per-feature counters affecting the future are serialized.
- `CampaignPiece`: existing tile/pod/station concepts plus cargo; all have stable IDs and positions. Cargo has a kind (`capsule`, `harvest`, `key`, `kit`), destination reference and passenger IDs where applicable. It falls/transports with attached passengers, cannot merge and cannot be overwritten. Stations remain fixed during gravity and retain the existing player-slide rules. Moving actors are a separate layer over ordinary terrain.
- `CampaignGoal`: discriminated goals for home crew, recover supplies, evacuate cargo/capsules, guide/transfer creatures, intercept drones, restore infrastructure, grow/deliver harvest and simultaneous departures. Definitions list required IDs or a finite eligible-source set plus target; progress derives from unique completion IDs, not repeated visual events.
- `GeometryDef`: dimensions, mask, refill sources, directed gravity segments/chambers, routes, connections and endpoint positions. Each referenced cell is validated against its permitted layer and activation state.
- `CampaignEvent`: typed merge/spawn/move/transfer/fixture/need/goal/status/points effects. Every event has a stable sequence ID; movement contains entity ID, source, destination and passenger IDs; state changes carry before/after values. Timing groups permit independent effects to overlap. Extend the union explicitly for each mechanic; no arbitrary payload blobs.
- `CampaignTransition = {accepted:boolean; state:CampaignState; events:CampaignEvent[]; rejection?:string}`. Rejection returns the unchanged state and no economic or turn effects.
- `loadCampaignLevel(level:CampaignLevel):CampaignState`; `transition(state:CampaignState, action:CampaignAction):CampaignTransition`; `legalActions(state:CampaignState):CampaignAction[]`; `hashState(state:CampaignState):string`; `validateLevel(level:CampaignLevel):ValidationIssue[]`.
- `MechanicDef` and `MechanicRuntime` are discriminated unions of module-owned types. `MechanicModule` exposes `id`, `validate(level):ValidationIssue[]`, `onMerge(context, event):void`, `transfer(context):void`, `environment(context):void`, `admit(context):void`. Here `context:TurnContext` is a mutable draft local to one transition, with `state`, append-only `events`, processed merge IDs and stepped actor IDs. Absent hooks are omitted. The registry fixes hook order; modules cannot start another turn or persist state.
- `SolutionTrace = {levelId:number; campaignVersion:string; rulesVersion:string; initialHash:string; actions:CampaignAction[]; finalHash:string}`; `ValidationIssue = {code:string; levelId?:number; entityId?:string; message:string}`.
- New engine values start with `rulesVersion:'campaign-1'`, `campaignVersion:'2026.1'`; retain legacy rule ID `legacy-1`. Freeze them at release; edits after publication require explicit version handling.

### Presentation and persistence

- Create `src/session/{types,storage,migrate,campaignSession,adapter}.ts`; legacy `GameSession` remains the version-1 executor. The adapter selects the executor from persisted rule version, not the current app version.
- `SaveV2` has `schemaVersion:2`, `revision`, `active:{kind:'legacy';run:RunData}|{kind:'campaign';level:CampaignLevel;state:CampaignState;events:CampaignEvent[]}`, preserved wallet/station/preferences, campaign completion/reward ledgers, attempts, assisted completions, learned mechanics, annex layouts and migration entitlements. The active legacy `RunData` remains intact until completion; define a single owner for the preserved meta fields when switching executors.
- `migrateRun(run:RunData):SaveV2`; `loadSave(storage:SaveStorage):SaveV2|null`; `saveSnapshot(storage:SaveStorage, save:SaveV2):{ok:boolean;error?:string}`; `dispatch(action:CampaignAction):CampaignTransition|null` on `CampaignSession`; `finishPresentation():void` releases its input lock.
- Create `src/render/campaign/{snapshot,board,animator,mechanics}.ts`. `makeScene(state:CampaignState):CampaignScene` produces a read-only scene containing geometry and stable-ID render entities; `CampaignBoard.sync(scene)` and `CampaignAnimator.play(events, finalScene):Promise<void>` implement presentation. Use existing textures, palette, tween and FX helpers where compatible. Do not force the new model through a fake legacy goal.
- Create `src/input/campaign.ts`: converts drag/tap into `CampaignAction`, using the same `legalActions`/`transition` preview contract as the engine. Modify `src/main.ts`, `src/ui/shell.ts`, `src/ui/style.css`, `src/render/layout.ts` to select the appropriate session/view and responsive UI.
- Create `src/ui/{campaignMap,discoveryGuide,campaignCoach,chapterHomes}.ts`, `src/meta/{campaignRewards,chapterRoster}.ts`, `src/assets/campaign-manifest.ts`.

## Test and commit convention

Run commands from the improved folder using PowerShell and `npm.cmd`. Tasks use meaningful state-transition and regression tests, not snapshots that merely mirror implementation. Before each implementation, run its focused test and confirm it fails for the intended missing behavior; after implementation, require PASS plus `npm.cmd run typecheck`.

Each task ends with a scoped commit when Git writes are available: `git add -- <only that task's paths under sliding-stars-next>` then `git commit -m '<task title>'` from the parent Git root. Never use `git add .`; never include original app changes. If Git metadata requires approval, preserve finished file changes and report the commit limitation rather than rerunning or discarding work.

## Task 1: Versioned content schema and schedule

**Files:** types/schema/catalog/schedule/chapters/compatibility above; `tests/campaign/schema.test.ts`, `schedule.test.ts`; `package.json`.
**Interfaces:** Produces the shared contracts and `getCampaignLevel(id:number):Promise<CampaignLevel>`. Until a chapter exists, a development error identifies missing content; it must never silently generate a replacement.

- [x] Write failing assertions: `expect(ids).toHaveLength(25)`, `expect(newIds).toHaveLength(20)`, `expect(first('rendezvous')).toBe(961)`; reject duplicate IDs, bad references, malformed runtime values and unknown rules versions.
- [x] Run `npm.cmd test -- tests/campaign/schema.test.ts tests/campaign/schedule.test.ts`; confirm intended failures.
- [x] Implement typed parsing, CSV-equivalent schedule and chapter metadata, with prerequisite teaching complete before introduction. Preserve the existing first three lesson definitions as conversion fixtures.
- [x] Run the focused tests and typecheck; add scripts for `campaign:generate`, `campaign:solve`, `campaign:validate`, `campaign:replay`, `campaign:report` as their executors are implemented, not empty success stubs.
- [x] Commit the versioned schema and schedule.

## Task 2: Deterministic terrain, geometry and turn stages

**Files:** all `src/campaign/engine` files above; `tests/campaign/{turn,geometry,transport,terminal,purity}.test.ts`; `tests/campaign/fixtures/base.ts`.
**Interfaces:** Produces `loadCampaignLevel`, `transition`, `legalActions`, `hashState`; consumes Task 1 contracts. Reuse existing RNG and match discovery only after adapting their board-reading interface with legacy regressions intact.

- [x] Write failing fixtures proving `expect(after.turn).toBe(before.turn+1)` for one accepted swap; rejected/booster actions leave turn and actor clocks unchanged; frozen input remains unchanged. Compare base merge, pod/station creation, scoring and rescue outcomes with the existing engine on equivalent boards.
- [x] Run `npm.cmd test -- tests/campaign/turn.test.ts tests/campaign/geometry.test.ts tests/campaign/transport.test.ts tests/campaign/terminal.test.ts tests/campaign/purity.test.ts`; confirm failures.
- [x] Implement seven stages exactly as the spec, stable ID ordering, processed-merge cursors, layer-specific occupancy and finite settle guards that report invalid authored content rather than silently truncating play. Piece movement carries riders; actor movement does not move terrain. Rebuild gravity segments after geometry changes. Implement legal-move recovery respecting fixed fixtures/cargo/actors; never shuffle them through barriers.
- [x] Prove gaps stop falls, destinations cannot overwrite riders, a carrier can move into its own old footprint, final-goal completion wins before counter expiry, no admitted crew tick on arrival, and repeated settling cannot tick twice. Assert every moved entity appears in ordered events and complete-state hashes differ when queues/RNG/needs differ. Run focused tests, existing core tests and typecheck.
- [x] Commit the campaign kernel.

## Task 3: Port the five existing mechanics and foundation lessons

**Files:** mechanics `crates.ts`, `ice.ts`, `rovers.ts`, `reactors.ts`, `comets.ts`, `registry.ts`; `lessons.ts`; `tests/campaign/existing-mechanics.test.ts`; first chapter content fixtures.
**Interfaces:** Implements `MechanicModule`; consumes Task 2 turn hooks. Presentation assets may reuse the existing art.

- [x] Write failing equivalence cases for crate per-merge damage, ice immobility/thaw, rover route/boarding, reactor fuse/cooling and shared connected-comet HP. Assertions compare actual state and events against legacy fixtures, not assumed Sliding Seas behavior.
- [x] Run `npm.cmd test -- tests/campaign/existing-mechanics.test.ts` and confirm intended failures.
- [x] Port the five rules, adapting only the explicitly improved turn/occupancy contract. Create five distinct teaching boards at 4–8, 16–20, 31–35, 56–60 and 81–85; preserve foundational lessons 1–3 and the level-3 botanist.
- [x] Run equivalence and turn tests; verify existing boosters do not tick these mechanics and cannot bypass a fixed fixture unintentionally. Record deliberate versioned differences in `docs/campaign-rule-compatibility.md`.
- [x] Commit the existing-mechanic campaign slice.

## Task 4: Transactional session and legacy save migration

**Files:** `src/session/*` listed above; `tests/session/{migration,storage,campaignSession}.test.ts`; representative sanitized fixtures under `tests/session/fixtures/`.
**Interfaces:** Produces `SaveV2`, `CampaignSession`, migration/storage functions and executor adapter; consumes Task 2 transitions.

- [x] Write failing assertions that wallet, booster counts, exact legacy board, layouts and VIP IDs are deep-equal before/after migration; progress above 1000 remains recorded while `completedCampaignIds` is empty absent evidence. Repeated victory must leave reward-ledger size unchanged.
- [x] Run `npm.cmd test -- tests/session` and confirm intended failures.
- [x] Store V2 in a separate `sliding-stars-next-run-v2` primary slot with last-valid backup and revision. Read V1 without overwriting it; validate candidates and recover the latest valid snapshot. Commit the final state and events before animation, hold the input lock, and expose storage failure honestly. Preserve the legacy board under `legacy-1` until finished, then enter the next uncompleted campaign number. Use replay/catch-up for progress beyond 1000.
- [x] Test denied/quota storage, truncated JSON, crash between backup and primary writes, reload mid-animation, duplicate dispatch, repeated victory, unknown future version and legacy current/completed board boundary. No silent reset or automatic deletion of unknown saves. Run session/core tests and typecheck.
- [x] Commit migration and session handling.

## Task 5: Playable campaign presentation and mobile input

**Files:** campaign renderer/input, main/shell/style/layout listed above; `tests/render/campaign-layout.test.ts`, `campaign-events.test.ts`; `tests/session/input-lock.test.ts`.
**Interfaces:** Produces `CampaignScene`, `makeScene`, `CampaignBoard`, `CampaignAnimator`, campaign input adapter. Consumes committed transitions and session lock.

- [x] Write failing assertions for 40-pixel hit targets on 375×667 and 390×844 with 7×9 geometry, correct hole hit-testing, and one dispatch for a drag interrupted by resize/backgrounding. Assert `renderedEntityPositions === makeScene(finalState).entityPositions` after completion or cancellation.
- [x] Run the focused renderer/session tests and confirm intended failures.
- [x] Build the separate campaign view using existing art/palette, clear non-color terrain differences, two-goal maximum HUD, future-wave previews and readable route/need indicators. Reflow top/tray bands for tall boards rather than shrinking all tiles. Preserve the legacy view while finishing old games.
- [x] Implement 140–180 ms swaps, 250–400 ms single merges, 180–300 ms transport, 400–650 ms rescues; overlap independent event groups and accelerate long cascades. Reduced motion retains brief position transitions. Stop idle/audio when hidden; resume to saved state without redispatch. Verify portrait layouts and event recovery in a browser, with typecheck/tests passing.
- [x] Commit playable campaign presentation.

## Task 6: Solver, trace replay and candidate validation

**Files:** `src/campaign/solver.ts`, `validator.ts`; campaign scripts; `tests/campaign/{solver,validator,replay}.test.ts`; `validation/campaign/traces/`.
**Interfaces:** `solveCampaign(level:CampaignLevel, limits:{maxNodes:number;maxDepth:number;maxMilliseconds:number}):{status:'solved';trace:SolutionTrace}|{status:'timeout'|'exhausted';explored:number}`; `replayTrace(level,trace):{won:boolean;issues:ValidationIssue[]}`. Search calls the shipped `transition` and complete-state hash.

- [x] Write failing assertions: a known two-action puzzle returns a replayable win, a cyclic carrier puzzle terminates within the budget, altered RNG/queue changes the hash, and a timed-out candidate cannot enter the release catalog.
- [x] Run `npm.cmd test -- tests/campaign/solver.test.ts tests/campaign/validator.test.ts tests/campaign/replay.test.ts` and confirm failures.
- [x] Implement bounded search with transposition deduplication, deterministic action order and objective-distance heuristics. All search budgets are CLI options; trace validity, not search speed, is the gate. Reject booster actions in release traces. Validate reference IDs, finite supply quotas, refill access, route footprint fit and compatibility restrictions before search.
- [x] Replay traces in a fresh process and check initial/final hashes and won state. Confirm packaged app excludes traces and solving tools. Run focused tests/typecheck.
- [x] Commit solver and validation tools.

## Tasks 7–26: Twenty complete new mechanic slices

Each row below is a separate task and commit, executed in order. **Files for every row:** `src/campaign/mechanics/<id>.ts`, registry/type-union entries, `tests/campaign/mechanics/<id>.test.ts`, the indicated five teaching levels in their chapter JSON, lesson entry, renderer mechanic handler, asset-manifest entry and `public/art/campaign/<id>/` finished assets. **Interfaces:** implement `MechanicModule`, typed definition/runtime/events, consumed by Tasks 2/5/6; existing signatures stay stable.

For each row, carry out this exact test cycle and check it off in the execution log:

- [ ] Write the row's failing rule tests, including the stated assertions, plus save/reload equivalence and its allowed prerequisite combination.
- [ ] Run `npm.cmd test -- tests/campaign/mechanics/<id>.test.ts`; confirm the intended failure.
- [ ] Implement the rule, five teaching levels (demo/guided/two independent/familiar combination), typed events, visible previews and finished art states. Use the game-asset-production skill before producing assets and imagegen for raster generation/editing. Inspect existing art first; keep source/licensing and optimization manifests. No reference-game assets are copied.
- [ ] Pass the focused tests/typecheck; solve and replay all five lessons with Task 6 tools. Manually play the sequence at phone size, inspect blocked/warning/action/completion states and reduced motion, then record evidence in `validation/campaign/playtests.md`. A placeholder cannot close this checkbox.
- [ ] Commit that mechanic slice and mark its row complete in the execution log.

| Task / ID / lessons | Rule implementation and essential regression assertions |
|---|---|
| 7 / `exits` / 111–115 | Consume designated cargo/capsule IDs at bottom-edge exits after gravity, credit once. `expect(deliveredIds).toEqual(['capsule-a'])` on first arrival and remain length 1 on another settle; safe passenger never gets a rescue countdown; final exit wins before unrelated needs tick. |
| 8 / `waves` / 146–150 | Finite scheduled queue admits after departures and unresolved-need checks. Ordinary terrain permits entry; a rider/actor/fixture blocks it. `expect(queue[0].id).toBe('wave-a')` while blocked, then admit exactly once at free entry; respect cap 6; arrival need remains full. Pending required arrivals prevent win. |
| 9 / `moonwhales` / 186–190 | One loop step each turn; adjacent merge queues transfer to the authored adjacent safe tile/pod. `expect(passenger.carrierId).toBe(whale.id)` when blocked/unsafe; safe transfer emits one continuous transfer and removes the carrier link once. No release to an arbitrary free cell. |
| 10 / `pups` / 231–235 | One shortest safe-terrain step toward nursery, stable row/column tie-break, no station/pod boarding. `expect(stepsThisTurn).toBe(1)`; blocked route waits, unsafe shortcut is rejected, nursery credits only the pup goal. |
| 11 / `currents` / 276–280 | Rotate authored cyclic-lane pieces and riders simultaneously once after actor stage. `expect(pieceAfter.id).toBe(pieceBefore.id)` at the next lane cell; passenger follows. Reject a lane crossing fixed/frozen cells unless explicitly split into valid cycles. No sequential-overwrite loss. |
| 12 / `pirates` / 326–330 | Route step and two distraction points; adjacent matches reduce points. At zero, return parcel and leave before reaching-dock failure. `expect(hpAfterOneQualifyingMerge).toBe(1)`; reached dock loses mission but wallet unchanged. Blocked routes wait without overwriting. |
| 13 / `portals` / 376–380 | Transfer piece and riders before ordinary refill; receiver has no ordinary source and feeds its segment. `expect(portalTransfersFor(pieceId)).toHaveLength(1)` per turn; occupied receiver waits; clear receiver accepts before refill. Reject portal chains/tracks/currents; no deadlocked receiver design passes validation. |
| 14 / `bridges` / 426–430 | Two qualifying adjacent merges activate specified absent cells permanently, then rebuild gravity/refill. `expect(activatedCells).toHaveLength(0)` after one, expected count after two; fixture receives each merge once; no terrain outside bridge moves during activation. |
| 15 / `shelter` / 471–475 | Labeled guest starts 20-move shelter need on first safe arrival; independent rescue need resumes in danger. `expect(shelter.movesLeft).toBe(20)` at activation; never resets by leaving/re-entering safe ground. Earlier deadline displayed; station completion clears both; ordinary missions remain unchanged. |
| 16 / `gardens` / 516–520 | Each actual merge containing a plot advances one of three stages; stage 3 produces one harvest cargo for an exit. `expect(stageAfterLargeSingleMerge).toBe(1)`; three distinct merges yield one token, not repeated yields from reprocessing events. Token placement is authored and must be available or visibly pending. |
| 17 / `keys` / 561–565 | Matching-ID cargo arriving at lock is consumed once and opens its linked permanent gate. `expect(gate.open).toBe(false)` for wrong key, true for correct arrival; required goal supply cannot be stranded or destroyed by a merge. |
| 18 / `gravity` / 611–615 | A merge containing the switch toggles its chamber down/left; refill from opposite edge. `expect(direction).toBe('left')` after one trigger, `'down'` after next; fixture positions unchanged, riders follow pieces, unrelated chamber unchanged. Reject banned combinations. |
| 19 / `solar` / 661–665 | Adjacent actual merges of requested terrain tier charge one each; authored quota enables endpoint. `expect(charge).toBe(0)` on wrong tier and 1 on matching tier; one large merge is one charge; completed collector remains a usable rescue endpoint. |
| 20 / `jelly` / 711–715 | Every third valid turn coat one eligible adjacent ordinary tile with next target preview; adjacent clear cancels that turn's spread. `expect(newCoatings).toHaveLength(0)` on turn 3 when cleared; no eligible target means wait; never coat riders/specials/cargo/fixtures/prohibited cells. |
| 21 / `docks` / 756–760 | Destination moves one track step; aligned entrance rescues waiting passengers. `expect(passenger.pos).toEqual(before.pos)` until boarding; misalignment cannot rescue through another cell; passenger and dock never silently drag terrain. |
| 22 / `phase` / 801–805 | End-turn open/closed alternation; occupied closure becomes pending until clear. `expect(door.open).toBe(true)` while occupied even on close phase; departing occupant can leave, then closure occurs without crushing/displacing. Validate shelter-route opening slack. |
| 23 / `relays` / 841–845 | Only next numbered node responds to adjacent merge; completed chain opens endpoint. `expect(nextNode).toBe(1)` after touching node 3 early; each actual merge can advance only its eligible next node once. |
| 24 / `tethers` / 881–885 | Orthogonal player drag translates a rigid two-cell carrier, valid without a match, then advances one turn. Ignore own old footprint, block unrelated occupants. `expect(turnDelta).toBe(1)` accepted and 0 rejected; adjacent merge releases only with both safe landings, never one passenger. |
| 25 / `repair` / 921–925 | Delivered kit enables next route job; bot steps along displayed route and restores one specified broken cell per kit. `expect(kitsUsed).toBe(1)` for one job; two jobs require two kits; blocked route waits; rebuilt cells get valid gravity and refill. |
| 26 / `rendezvous` / 961–965 | Two marked destinations check required passengers simultaneously at end turn. `expect(status).toBe('playing')` with only one ready, won/credited once with both; waiting passengers are safe and neither is consumed early. |

**Common pairwise gate:** For every mechanic pair actually used in a committed level, add a focused case in `tests/campaign/combinations/<a>-<b>.test.ts` exercising their shared occupancy/timing boundary. Test rejected combinations in validator tests. A pair with no meaningful shared boundary may use a coexistence/round-trip fixture, with that reason recorded. Do not assert universal support for unshipped combinations.

## Task 27: Chapter curation and all 1,000 fixed levels

**Files:** chapter JSONs; generator/report scripts; `src/campaign/content/templates.ts`; `tests/campaign/{pacing,diversity,catalog}.test.ts`; validation reports and traces.
**Interfaces:** `generateCandidates(chapter:number, seed:number, count:number):CampaignLevel[]` is an offline authoring function; `auditCampaign(levels:CampaignLevel[]):ValidationIssue[]` checks the entire catalog. Neither is a runtime fallback.

- [ ] Write failing assertions for exactly IDs 1–1000; 20 chapters of 50; 25 complete five-level teaching spans; last introduction 961; 12 shape families overall. Assert chapter 1 has ≥4 families; later chapters have ≥6, ≥3 dimension pairs and ≥10 boards with ≤30 playable cells. Reject repeated adjacent masks and >3 consecutive boards of one family.
- [ ] Run `npm.cmd test -- tests/campaign/pacing.test.ts tests/campaign/diversity.test.ts tests/campaign/catalog.test.ts` and confirm failures.
- [ ] Author teaching/milestone/finale levels by hand, generate deterministic constrained candidates for remaining slots, curate and commit accepted definitions. Work chapter by chapter as Tasks 3/7–26 unlock required rules. Save a winning trace for every accepted candidate. Reject trivially reskinned/redundant layouts; inspect actual decisions and destination placement, not just mask labels.
- [ ] Audit recurrence: define “recent” as the two chapters following introduction; each recently introduced mechanic appears meaningfully ≥4 times in each. Each introduced objective family recurs in every later rolling 100-level window. Chapters 15–20 use ≥6 available objective families. Every ten-level block has ≥2 quick boards and ≤1 thoughtful challenge; no challenge adjacent to any first introduction, and a challenge is followed by gentle content. Most boards have ≤2 mechanics; all respect max/caps. From chapter 4, require all five geometry-purpose tags in each chapter.
- [ ] Run `npm.cmd run campaign:validate`, `campaign:solve`, `campaign:replay`, `campaign:report`; require 1000 parsed, 1000 valid winning traces, zero unresolved content errors. Commit chapter data and evidence, in chapter-sized commits rather than one opaque generated dump.

## Task 28: Discovery guide, campaign map, hints and generous retries

**Files:** campaign UI files, lessons, `src/campaign/hints.ts`, session attempt tracking; `tests/campaign/teaching.test.ts`, `tests/session/progression.test.ts`.
**Interfaces:** `findCampaignHint(state:CampaignState):CampaignAction|null` uses shared transitions; `requiredCatchup(level:CampaignLevel, learned:MechanicId[]):MechanicId[]`; `assistOffer(attempts:number):boolean` returns true at ≥3 failed attempts. Practice boards do not mutate the active run.

- [ ] Write failing assertions that a legacy player entering level 612 gets missing-rule practice, without losing their current board or earning duplicate rewards; replay selection preserves progression; assistance is offered only after three failed attempts and is opt-in/labeled.
- [ ] Run focused teaching/progression tests and confirm failures.
- [ ] Implement chapter map/replay, concise goal explanations, guide with unlocked rules and practical examples, five-stage teaching cues, catch-up practice, visible next mechanic discoveries and hint highlight. Track failed attempts separately from voluntary practice resets. A no-failure demo restores its teaching setup on a mistaken action with brief explanation; it does not silently alter ordinary puzzles.
- [ ] Add optional assistance: +5 moves where a move limit exists and +5 to unresolved individual needs, once per attempt, explicitly labeled and recorded; never alter fixtures/refill seeds or count assisted traces as baseline validation. Verify tutorial cues survive reload and cannot block normal control. Run focused tests/typecheck and manual map/hint/retry flow.
- [ ] Commit progression and teaching UI.

## Task 29: Finished mechanic art, motion and readability audit

**Files:** campaign asset manifest, assets, renderer handlers, `scripts/prepare-art.mjs`; `tests/render/campaign-assets.test.ts`; `validation/campaign/art-review.md`.
**Interfaces:** `CampaignAssetRef` contains ID, optimized path, source/provenance, dimensions and named states (`idle`, `actionable`, `blocked`, `complete`); manifest links every mechanic to its required render states.

- [ ] Write failing asset checks: all 25 mechanic IDs resolve complete state sets, every event variant has a handler, required files exist and are included in the optimized build. Shared base drawings with distinct explicit state treatments are allowed; anonymous placeholder blocks are not.
- [ ] Run asset/event checks and confirm any missing coverage is exposed.
- [ ] Inspect all twenty new mechanic sheets in the existing game's palette; refine silhouettes, expressive creature faces, warning readability and terrain material differences. Preserve original character assets. Optimize with the existing Sharp pipeline, keeping runtime images sized to actual use.
- [ ] Inspect each mechanic at phone scale in its most crowded shipped combination and reduced-motion mode; record screenshots/observations and repair rider discontinuities or ambiguous effects. Check long cascades, event overlap, particles and audio/background behavior. Run asset tests and build.
- [ ] Commit final visual refinements and audit evidence.

## Task 30: Five annexes, twenty rooms and forty named VIPs

**Files:** chapter roster/rewards/UI, campaign art, `src/meta/roster.ts` compatibility exports; `tests/meta/{chapter-roster,chapter-homes}.test.ts`.
**Interfaces:** `CHAPTER_HOMES` contains five annexes (chapters 1–4, 5–8, 9–12, 13–16, 17–20), twenty room IDs `chapter-01-room`…`chapter-20-room`, two arrangements each; `CHAPTER_VIPS` has IDs `chapter-01-vip-a/b`…`chapter-20-vip-a/b`, names, portraits, roles and room references.

- [ ] Write failing assertions for totals 7 home locations, 32 rooms, 64 VIPs; unchanged original IDs and costs; each chapter's two new VIP appearances at offsets 25 and 45; level-3 botanist still present.
- [ ] Run `npm.cmd test -- tests/meta/chapter-roster.test.ts tests/meta/chapter-homes.test.ts` and confirm failures.
- [ ] Produce named characters suited to the twenty approved room roles and finished portraits/room art; retain exact approved room names. Add two meaningful visual arrangements per room and adequate decoration positions. Keep old homes visitable and annex access independent of unfinished older rooms.
- [ ] Test catalog references, art completeness, arrangement persistence, original archives and immediate use of a chapter's free room kit. Manually inspect all five annexes and both arrangements per room. Run focused tests/typecheck.
- [ ] Commit expanded home catalog.

## Task 31: Reward ledger and explicit legacy entitlements

**Files:** campaign rewards, migrate/storage/session, `tests/meta/campaign-rewards.test.ts`, `tests/session/entitlements.test.ts`.
**Interfaces:** `rewardsForFirstCompletion(levelId:number):Reward[]`; `claimReward(save:SaveV2,rewardId:string):SaveV2`; `legacyEntitlements(run:RunData):Reward[]`. `Reward` is a typed union of credits, decoration, named VIP or chapter room kit, each with stable unique ID.

- [ ] Write failing assertions: completing level 50 twice yields one `chapter-01-kit`; claim and reload cannot duplicate a VIP; kit construction does not charge credits or require original rooms; existing layouts remain deep-equal after catch-up claims.
- [ ] Run reward/entitlement tests and confirm intended failures.
- [ ] Implement atomic completion/reward ledger updates. Use verified legacy evidence (claimed active win, stored home/VIP ownership and any explicit completion record) for an explicit entitlement list; a lone high level number cannot prove newly authored goals completed. Expose eligible catch-up claims without auto-rearranging homes. Preserve uncertain historical progress separately rather than fabricating evidence.
- [ ] Test repeated victory/reload, duplicate claim, failed persistence, replay and progress beyond 1000. Add small decoration/credit milestones with deterministic IDs; ensure placement capacity matches awarded decorations. Run focused tests/typecheck.
- [ ] Commit reward and entitlement handling.

## Task 32: Full-campaign playtesting and balance correction

**Files:** validation reports/playtests, chapter definitions/traces, relevant mechanic fixes and tests.
**Interfaces:** Uses the same released level/transition interfaces. Any edited level invalidates and regenerates its trace; published IDs are never silently rebound to unrelated puzzles.

- [ ] Run complete tests, typecheck, catalog validation and all 1000 trace replays. Require zero failures, not a percentage pass rate. Record command outputs and campaign/rules versions.
- [ ] Manually play all 25 five-level teaching sequences and all 20 finales; sample at least two mixed boards from each chapter, including compact late-game boards and every shipped mechanic pair's most crowded fixture. Record level IDs, attempts, hint/assist use, ambiguous cues and observed pacing.
- [ ] Correct overly tight counters, unhelpful refills, repetitive objectives, unclear previews and slow animations. Choose generous fixed allowances from observed play, not a hidden runtime difficulty modifier. Never treat solver success alone as proof of relaxed difficulty.
- [ ] Repeat only affected manual checks and traces after a change, then run the full automated gate once on final content. Produce a report separating actual manual observations, automated evidence and untested physical-device behavior.
- [ ] Commit balanced campaign and validation evidence.

## Task 33: Offline installation, release and original preservation

**Files:** `scripts/offline.mjs`, service-worker template/output logic, manifest/install UI, build configuration as needed; `tests/pwa/offline-manifest.test.ts`; `validation/campaign/release.md`.
**Interfaces:** Offline readiness requires an acknowledged worker response listing the current build ID and complete required-resource manifest, not merely `navigator.serviceWorker.ready`. Preserve `sliding-stars-next-` cache prefix and `ignoreVary:true` matching behavior already required for offline reloads.

- [ ] Write failing checks for complete required campaign/art precache, absence of solver traces, no deletion of original-app caches, and no readiness acknowledgement after any missing required asset.
- [ ] Run PWA checks; simulate missing asset/install failure and confirm readiness remains false and the last working app stays launchable.
- [ ] Build optimized production output; measure total and compressed sizes, use chapter chunks if useful while still caching all required content. Keep old worker controlling until a complete new cache is installed; do not force `skipWaiting` over an active game. Verify background/reload/save boundaries and update recovery.
- [ ] Run browser checks for installed-like viewport/safe areas, standalone manifest/icons, cold offline launch, chapter 20 offline, mid-animation refresh and online update. Record desktop limitations. On available iPhone hardware test Safari installation, Home Screen mode, touch, offline restart and frame-time response; otherwise explicitly report that physical-device verification remains outstanding without fabricating measurements.
- [ ] Before deployment, capture original production deploy ID and parent source hashes. Deploy only the built improved folder with `npx.cmd --yes --package netlify-cli netlify deploy --site bc41ec96-bbad-4e56-b0d1-c612c54db038 --dir 'H:\Projects\iPhone Apps\sliding-stars\sliding-stars-next\dist' --alias next --no-build --message 'Validated 1000-level campaign' --json`. Never use `--prod`.
- [ ] Verify live file hashes, manifest, complete required asset retrieval, offline acknowledgement and a playable new/returning save. Verify the original production deploy ID and original file hashes remain unchanged. Record the improved URL and actual validation limits; commit release documentation.

## Completion evidence and self-review

Do not mark the request complete until the release report accounts for 1,000 definitions and winning traces, 25 finished mechanics, all teaching sequences, shape/pacing audits, 20 finales, all new rooms/VIPs, save migration and the live improved deployment. Report physical iPhone checks honestly if hardware is unavailable.

Self-review performed on this plan: design sections map to Tasks 1–33; all five Review Focus risks have explicit owning tests; shared signatures are defined above; the five existing mechanics are implemented/tested rather than merely counted; twenty new slices each include lessons, art, animation, persistence and traces. Curation and asset audits have independent gates, so a mechanically implemented feature cannot be mistaken for finished game content.

**Execution:** the user selected subagent-driven implementation and review. Continue the remaining tasks in order, including independent reviews, campaign validation and deployment to the existing `next` alias. Routine steps and phase transitions do not require renewed approval. No new user task is required.

## Execution log

- Task 7 (evacuation exits, lessons 111-115): complete and independently reviewed through commit 55cfc72. Rule, lesson, art, solver/replay and phone-viewport play evidence recorded in validation/campaign/playtests.md; focused UI feedback fix reviewed separately.
- Task 8 (incoming rescue waves, lessons 146-150): complete and independently reviewed through commit d215142. Five winning search/replay proofs and actual phone-size plays recorded; full-frame shuttle artwork correction independently reviewed with focused checks and a fresh lesson147 play. Final local build cache8067f833576d; deployment remains Task33.
- Task 9 (moonwhales, lessons 186-190): complete and independently reviewed through commit 28defc8. Five causal search/replay proofs and actual phone playthroughs, full original artwork and carrier ownership/animation checks recorded. Full-suite aggregate legacy timing issue resolved as identical70 per-level checks; final focused31 and build/audit passed. Strict initial semantic-RED chronology exception is explicit in execution evidence.
- Task 10 (moon-pup herding, lessons 231-235): complete and independently reviewed through commit c13d257. Safe shortest-path rules, five genuine proofs/replays and phone playthroughs, original pup/nursery art and durable arrival visuals; waiting-pose fix independently re-reviewed with 14 focused checks and targeted actual phone evidence. Legacy seed53 functional test budget amended with exact timeout/pass chronology retained; final local cache81ebc10b6d71. Deployment remains Task33.
- Task 11 (orbital currents, lessons 276-280): complete and independently reviewed through commit eee8d5d. Atomic cyclic terrain/rider transport, blocked-lane feedback, five causal proofs and phone playthroughs; final full suite 639 passed. Saved-route validation correction independently re-reviewed with 109 focused checks, preserving valid blocked lanes and backup recovery. Final local cache ec1b3180d44a; deployment remains Task33.
- Task 12 (pirate-drone interception, lessons 326-330): complete and independently reviewed through commit 7a50bf3. Two-point distraction, visible routes/warnings/parcel returns, safe demonstration pause and free retry; five genuine proofs and phone wins, actual loss/retry preserves credits/inventory. Terminal loss precedence corrected with focused regression; terminal coaching correction independently re-reviewed. Full698 tests passed before the outcome correction; post-correction72 and final copy-focused16/typecheck/build/audit passed. Final local cache3d2f901a64e4; deployment remains Task33.
- Task 13 (paired portals, lessons 376-380): complete and independently reviewed through commit b546a4b. Before-refill piece/rider transport, persistent consumed identity history, saved receiver topology and visible linked/wait/arrival states; five genuine proofs and phone wins, independently played380 with waiting reload. Full737/743 preceded six stale shared-lesson assertion corrections; focused133 and final97/typecheck/build/audit passed. Final local cache42ebae2334cd; deployment remains Task33.
- Task 14 (fold-out bridges, lessons 426-430): complete and independently reviewed through commit 8c438a6. Two real combinations open permanent cells/connections, rebuild refill and let waiting rovers cross; five genuine proofs and phone wins, independently played430 with opening reload. Main774 tests passed; a partial-opening refill validation defect was fixed and independently re-reviewed with212 focused checks, preserving atomic spans and separately sourced bridges. Final local cacheb7558c71eef4; deployment remains Task33.
- Task 15 (shelter requests, lessons 471-475): complete and independently reviewed through ec124aa with no findings. Independent 20-move requests, wave admission, visible urgency and saved lifetime state; five genuine proofs and phone wins plus independent474 reload. Focused127 passed; broad805/806 preceded obsolete validator-fixture correction, covering3/typecheck/build/audit then passed. Final local cache1c94633fc277; deployment remains Task33.
- Task 16 (moon gardens, lessons 516-520): complete and independently reviewed through be4d44c. Three real containing combinations grow a crop; blocked output waits and one cargo harvest reaches its exit. Five genuine proofs and actual phone wins, root520 mid-growth reload/three-move paired win. Full826 tests passed; duplicated pair tests were replaced with concrete blocked production/descent cases and independently re-reviewed after195 focused passes/typecheck. Production unchanged by that fix; final local cached18df4b3706d. Deployment remains Task33.
- Task 17 (star keys and gates, lessons 561-565): complete and independently reviewed through a08a5fc. Exact cargo delivery opens permanent routes with independent bridge/gate ownership and reload safety. Five searched proofs/fresh replay receipts, five phone wins and root565 partial-opening reload; full850 passed. A forged-ledger validation gap was fixed and independently re-reviewed after90 covering passes/typecheck/build/audit. Original RED/search raw logs were not retained after interruption; their provenance remains explicitly attributed to the original worker handoff. Final local cachebc34accb594b; deployment remains Task33.
- Task 18 (gravity switches, lessons 611-615): complete and independently reviewed through93b8f17, no findings. Actual ordered down/left gravity and opposite-edge refill, immutable source/parity ownership and genuine portal transport followed by sideways fall. Five causal searched proofs/fresh replays, five phone wins and root615 LEFT-state reload/three-move win. Full876/focused144/typecheck/build/audit passed; final local cached98623b5082d/137files. Deployment remains Task33.
- Task 19 (solar collectors, lessons 661-665): complete and independently reviewed through9571a60. Distinct adjacent requested-tier merges fill a quota and permanently open a real rescue entrance. Five genuine searched proofs/fresh replays, all five phone wins and root665 ready-state reload/five-move win. Full884/focused133 passed before the visual fix; requested-tile art/names and segmented charge ring then passed9 covering checks/typecheck/build and scoped review. Final cache1fb8fd6f1414/141files. Original semantic RED/search raw-log gaps remain explicitly attributed; physical/PWA acceptance and deployment remain later gates.
- Task 20 (friendly jelly, lessons 711-715): complete and independently reviewed through ebf8b89 after two fix rounds. Revised lessons teach pre-win spread, clearing, route choice, due-turn cancellation and real reactor overlap. Practice-only route protection/explicit waiting and deterministic peeling repair both retained historical traps with real reload-and-rescue continuations; exposed matches settle without an extra tick. Prior warning-save normalization is narrowly tested. Five genuine searched proofs/final replays, all five phone wins, 320x568/reduced motion, practice WAIT reload and root715 overlap reload recorded. Final shared912 tests and post-parser91 covering tests/typecheck/build are separately attributed. Current cache135bcc433550/145files. Teaching copy minors remain Task28/final review; deployment remains Task33.

- Task 21 (visiting shuttle docks, lessons 756-760): complete and independently reviewed through d7001c8. Separate moving destination/entrance and waiting passengers, exact safe boarding and stable saved ownership. Five genuine searched candidate proofs/fresh replays, five phone wins plus 320x568/reduced motion and root760 final-art reload/win. Full940 tests passed; minor coach corrections then passed24 focused/typecheck and scoped review. Final local cachef2af0c8b4f30/149files predates copy-only fix; deployment remainsTask33.

## User scope addition: proper iOS app
After game completion, deliver an installable iOS application reusing the existing game through Capacitor; see docs/IOS-DELIVERY-ADDENDUM.md. Native packaging, device validation and Apple distribution are additional acceptance steps. Current development pause remains in force; no subagents/builds/deployment resumed by recording this request.
