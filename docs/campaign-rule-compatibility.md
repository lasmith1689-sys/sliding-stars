# Campaign rule compatibility

These rules belong to `campaign-1` / campaign `2026.1`. Legacy `core/game.ts`, level definitions, save namespaces and executor remain unchanged. Active legacy games continue under `legacy-1`.

## Existing mechanics

| Mechanic | Preserved behavior | Explicit campaign differences |
| --- | --- | --- |
| Supply crates | Standalone blocked cells with no underlying terrain; each distinct on/orthogonally adjacent merge deals one HP; clearing recovers one supply identity and awards 40 points. Freed space falls/refills immediately. Intro crates have three HP. | Damage fires immediately for each actual merge instead of after the collected legacy cascade batch. Goal credit uses unique authored IDs, so repeated settlement cannot pay twice. |
| Ice crystals | Frozen terrain cannot swap, fall, match, or be demolished; an adjacent merge thaws it by one HP and releasing the final HP makes its terrain movable. | Every distinct merge causes wear. Legacy aggregated all merges in one settle call into one ice hit. Campaign cascades can therefore thaw faster. |
| Rescue rovers | Rider stays attached to the rover; terrain moves independently below it; one step per real move; safe aboard; station door arrival houses crew and retires the rover. A null route uses the legacy BFS neighbor order (up, right, down, left). | Destination must have an ordinary tile and no other actor/free passenger/blocking fixture. This forbids legacy entry onto empty terrain or pods. Optional authored routes advance one orthogonal cell and wait at blocked destinations. Empty rovers can board colocated free crew during their transfer hook. |
| Reactors | Adjacent combinations remove HP; clearing stops the reactor. Each real turn decrements fuse once; expiry resets to period and lowers adjacent ordinary tiles by one tier, minimum one. Crew safety is re-evaluated after erosion. | Each actual merge cools one HP rather than one hit per whole legacy cascade batch. Reactor effects precede final success/need decisions under the campaign seven-stage order. The `terrain` event preserves piece identity and records tier before/after plus the causing reactor. |
| Connected comets | One connected footprint owns one shared HP pool. An adjacent merge damages the entire group once even when multiple comet cells touch it; all cells thaw together. | Each actual merge causes one shared hit instead of one hit per legacy cascade batch. Disconnected footprints and separately authored touching comet pools fail validation; author a connected comet as one fixture. |

The kernel owns merge deduplication and the global turn-start actor schedule. Modules do not advance their own turns, call the legacy settle loop, or skip a callback because the kernel has marked its actor as stepped. Immediate settle hooks are idempotent. Rejected actions do nothing. Boosters may cause immediate merges/safety changes but never advance actors, reactor fuses, or rescue clocks; fixed fixtures are not bypassed by demolition or wormhole shuffle.

## No-failure demonstrations

`CampaignLevel.metadata.failurePolicy?: 'no-failure'` is an explicit authored option. Omission retains normal failure behavior. The parser permits the option only when `teachingAt(level.id).stage === 'demonstration'`, difficulty is `teaching`, and `moveLimit` is null. This uses the authoritative schedule for all 25 mechanics, not a list of the five initial modules.

The loader retains normal terrain/safety resolution. `tickNeeds` does not decrement rescue or shelter needs in a no-failure demonstration; ordinary lessons immediately after it still lose on expiry. Reactor/environment/actor turns continue, so demonstration behavior remains visible. Future threat modules and authoring must preserve this contract: no irreversible goal loss may make a no-failure demonstration unwinnable. Use reversible effects or constrain coached actions if needed; do not substitute enormous timers. Future coaching should consume the committed teaching actions.

Canonical replay hashing omits undefined object properties, matching JSON storage for optional metadata. Defined values and array order are preserved. Authored traces include the resulting stable hashes and are tested through the save stringify/parse boundary.

## Authored teaching content boundary

`src/campaign/content/lesson-seeds.ts` holds 28 fixed authored definitions: 1–3, 4–8, 16–20, 31–35, 56–60, 81–85. Compact row notation expands fixed authored cells and explicit gravity coverage; it neither generates missing levels nor acts as a runtime fallback. Foundation outcomes remain recognizable: the first station merge, growing a way home, and rescuing the level-3 botanist plus drifter. Level 3 keeps `vipId: 'botanist'` and `rewardId: 'botanist-greenhouse'`.

Each five-level sequence has five distinct masks, using compact, wide, tall, clipped-corner and taller combination layouts. Ice/reactor/comet boards add narrow crew alcoves: while the taught fixture survives, the crew cannot move or merge, and neither horizontal station-door neighbor exists in the mask. Clearing the fixture opens the actual rescue path. The comet/ice combination has a separately enclosed crew member for each rule. No consecutive authored entries share a mask. `campaignLessons` owns typed stage, player instruction and existing art identity; `getAuthoredLessonLevel(id)` returns a defensive copy or undefined. These exports are authoring seeds for later catalog assembly, not incomplete release chapters. `parseCampaignChapter` still requires all 50 ordered definitions.

`lesson-solutions.dev.ts` contains 28 fixed `SolutionTrace` records (initial hash, real actions, final hash) plus `lessonTeachingActions`. Development/test tooling may import them directly. Production catalog imports must exclude them. Every trace wins without boosters, houses all crew, and clears every authored lesson fixture; initial load does not silently pre-damage fixtures or merge terrain. Task 27 should preserve these seeds when assembling full chapters, and must revalidate any intentional changes. Rendering, coached UI, production chapter loading and the generalized solver remain later tasks.
