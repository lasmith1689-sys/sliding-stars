# Sliding Stars: 1,000-level campaign design

Status: superseded first proposal, September 26, 2026. Not implemented or deployed. Use [the research-informed revision 2](1000-LEVEL-CAMPAIGN-DESIGN-v2.md) and its [mechanic schedule](campaign-mechanics.csv).

Research update: the user requested broader independent research before proceeding. See [the September 26 research report](SLIDING-SEAS-BROADER-RESEARCH.md). Its corrections supersede any implication that the mechanic list, exact unlock levels or shape count below are established Sliding Seas rules. Keep this proposal provisional until the rescue systems and pacing are revised against that evidence.

## Agreed intent

Build a space adaptation with the long-term discovery and board variety the user enjoys in Sliding Seas. Plan for play through level 1,000, with at least five times the current five additional board mechanics: 25 distinct mechanics total, including 20 new ones. Base terrain merging, escape pods, stations, boosters, cosmetics, and numerical durability variants do not inflate this count.

The user selected relaxed but thoughtful difficulty, gradual challenge, generous retries, and cute, nonviolent aliens/pirate drones. Preserve the existing cute artwork and improve motion quality. Retain the original parent app. Work inside sliding-stars-next and publish completed, verified releases to its existing separate next alias. Preserve installed-player progress.

## Reference research and limits

Sources checked September 26, 2026:

- https://www.mugshotgames.com/games/sliding-seas/ — developer description confirms terrain merging, rescue/penguin/turtle/pirate/treasure modes, home decoration, VIPs, events and over 1,000 levels.
- https://www.slidingseas.com/ — official site also identifies volcanoes and whirlpools.
- https://apps.apple.com/us/app/sliding-seas/id1436245163 — current listing identifies version 2.4.7, September 9, and repeated additions of levels, buildings and VIPs. Player reviews describe continued discovery and readable, characterful animation; these are player reports, not formal rules documentation.

The sources do not establish an exhaustive list of mechanics, exact first-appearance levels, board dimensions per level, or internal balancing rules. Do not invent those as reference facts. The schedule and rules below are original space-game proposals. Official screenshots inspected in the earlier review showed irregular board silhouettes; the exact reference shape catalog is not established.

Current implementation evidence: generator.ts caps boards at 9 rows by 7 columns from level 26, varies corner cuts and up to three holes, and has only rescue/collect goal types. Three authored introductions override generation. New systems will require engine, solver, saved-state and animation support, not only different artwork.

## Recommended campaign approach

Use a designed campaign schedule plus authored board templates, generate candidate tile arrangements during development, solve and curate them, and ship 1,000 fixed level definitions. Author every mechanic introduction and milestone explicitly. Store a verified solution with internal validation data. Players load fixed content instantly and replay the same puzzle.

Alternatives considered: extending runtime generation is quicker but provides weak control over pacing and repeated patterns; individually hand-placing all 1,000 boards gives control but is slow to iterate and does not replace automated validation. The recommended hybrid provides deliberate progression with reproducible, testable content.

## Mechanics and first appearances

These are proposed first introductions, not assertions about Sliding Seas. Five existing mechanics are spaced out; twenty additions continue through level 941. Delayed introduction must not remove knowledge or rewards from existing players.

| # | Level | Mechanic | Distinct player decision | Visual/animation brief |
|---|---:|---|---|---|
| 1 | 4 | Supply crates (existing) | Place adjacent matches to open crates and collect supplies. | Friendly cargo box, staged cracks and a contents pop. |
| 2 | 21 | Ice crystals (existing) | Thaw frozen cells to reopen useful swaps. | Translucent ice, melting rim, little shard burst. |
| 3 | 41 | Rescue rovers (existing) | Arrange a traversable route and station entrance for an escort. | Rounded rover, wheel motion and boarding bounce. |
| 4 | 71 | Reactors (existing) | Cool a visible move-count fuse with nearby matches. | Blinking warm core, cooling steam; gentle terrain pulse on overload. |
| 5 | 101 | Frozen comets (existing) | Clear a shared multi-cell obstacle from whichever side is reachable. | Sleepy ice comet, cracks spanning its body, soft breakup. |
| 6 | 141 | Supply drop-offs | Bring cargo to marked bottom exits using gravity. | Parachute parcel, bobbing descent and dock receipt. |
| 7 | 181 | Rescue beacons | Activate a fixed rescue destination before delivering crew there. | Sleeping beacon opens petals and sends a soft light ring. |
| 8 | 221 | Star keys and gates | Collect a key to open a linked passage. | Floating key spins into a visible lock; door folds away. |
| 9 | 261 | Conveyor lanes | Predict a marked lane shifting movable contents one cell per valid turn. | Clear arrows and a short synchronized belt slide. |
| 10 | 301 | Paired portals | Route cargo or crew through a linked pair of cells. | Matching shapes/colors, shrink-in and emerge-out; destination preview. |
| 11 | 341 | Rescue bridges | Activate a bridge to join separated playable areas. | Fold-out panels with a small landing bounce. |
| 12 | 381 | Space gardens | Grow a patch by making a match on its cell, then harvest it. | Sprout-to-flower states and a celebratory bloom. |
| 13 | 421 | Solar collectors | Feed a collector matches of its displayed terrain tier. | Petal panels turn toward a little star and fill clearly. |
| 14 | 461 | Bubble-wrapped crew | Free a crew member before normal rescue can begin. | Round protective bubble wobbles, then pops softly. |
| 15 | 501 | Gravity switches | Activate a switch to change the marked gravity direction in a bounded chamber. | Large direction cue before a coherent chamber-wide fall. |
| 16 | 541 | Sleeping moon pups | Wake a creature with a nearby match, then guide it to its matching home. | Breathing idle, ear perk, happy hop into a bed. |
| 17 | 581 | Magnetic anchors | A fixed magnet holds nearby movable pieces until released by matching. | Visible tether field retracts before tiles resume movement. |
| 18 | 621 | Friendly goo | Contain a slowly spreading obstacle; a clearing match pauses its next spread. | Jelly wiggle, clearly previewed next cell, clean dissolve. |
| 19 | 661 | Orbital currents | Predict a cyclic shift around a marked ring, distinct from a conveyor's straight lane. | Directional ring particles and smooth arcs carrying riders. |
| 20 | 701 | Signal relays | Activate a connected chain in order to light the rescue endpoint. | Readable numbered nodes and a traveling signal pulse. |
| 21 | 741 | Mischievous pirate drones | Build and deliver a decoy parcel so a drone returns stolen cargo and leaves. | Expressive toy drone, sheepish cargo return, cheerful fly-away. |
| 22 | 781 | Repair bots | Feed a mobile bot the requested match to repair designated broken cells. | Tool wiggle, repair sparkles, new panel unfolds. |
| 23 | 821 | Phase doors | Time movement around doors that alternate open/closed after valid turns. | Transparent next-state preview and soft opening/closing. |
| 24 | 881 | Constellation routes | Visit visible waypoints with an escort in a specified order. | Star trail lights progressively and traces the completed constellation. |
| 25 | 941 | Shuttle rendezvous | Coordinate two escorted passengers at separate docks before departure. | Two readiness lights, shared boarding sequence and launch celebration. |

Each mechanic needs explicit rules for blockers, crew, special pieces, gravity, boosters and win/loss checks. Those interaction rules are part of implementation planning before engine changes. Mechanic definitions must specify triggers and emitted events; arbitrary behavior in renderer code is prohibited.

## Pacing and relaxed challenge

Use twenty 50-level chapters. Each introduction has a safe demonstration, guided practice, solo practice, then a gentle combination with a familiar mechanic. Do not introduce another unfamiliar rule during that teaching sequence.

Most levels use one or two featured mechanics; later milestone puzzles may use three compatible mechanics. Unlocked mechanics rotate back in; new content does not mean every board accumulates all prior obstacles. Each chapter mixes quick wins, thoughtful routing, collection, and a celebratory ending. A hard puzzle is followed by a gentler one.

No real-time pressure, paid lives, or forced waits. Retries are unlimited. Hints explain the immediate objective and a legal move. After repeated failure, offer clearly labeled optional help, without silently changing a fixed puzzle. Every campaign level must be beatable without buying boosters. Hazard signals must show their next effect before the move commits.

After level 1,000, show campaign completion and allow replay; optional generated expedition play must be labeled separately from the curated campaign. Do not claim an endless authored campaign.

## Board size and shape

Dimensions should vary throughout the campaign rather than grow once and remain large. Mix small, medium and larger boards according to the puzzle. Target approximately 4–7 columns and 4–9 rows, with tiny authored introductions allowed. Final limits depend on actual phone readability; dimensions are not a difficulty substitute.

At least twelve meaningful shape families: compact rectangle, tall corridor, wide short board, diamond, stepped terraces, L, T, cross, U, ring, two lobes with a bridge, and offset chambers. Rotations/reflections are variations, not extra families. Shapes must alter routes, matching opportunities or gravity, not merely remove decorative corners.

Each 50-level chapter should use at least six families and three footprint sizes. Avoid more than three consecutive boards with the same silhouette. Introduce simple irregular boards early; introduce disconnected areas only with a visible, mechanically valid connection or independent reachable goals.

Validate connected regions, legal swaps, reachable objectives, gravity across holes, portal/bridge routing, and blocker placement. Do not allow crew to appear in unreachable pockets. Preserve readable tile art and touch targets on small iPhones; reflow surrounding UI before shrinking tiles excessively.

## Art and motion quality

Use the existing palette, rounded silhouettes, soft highlights and friendly character proportions as the style guide. New mechanics get recognizable original art and differentiated silhouettes, not recolored copies counted as new content. State must remain readable without relying only on color.

Every mechanic has idle, anticipation, action and completion states where appropriate. Idle motion is restrained. Animate crew riding tiles, conveyors, portals and rovers continuously; never teleport them to hide missing transitions. Resolution order must match visible order: player move, merge/cascade, mechanic effects, rescue, then end-of-turn outcome. The engine defines the order and emits a complete event sequence for the renderer.

Preserve reduced motion and optional audio. Test concurrent effects and cascades on the phone viewport; particle bursts must not obscure objectives or oxygen. Target smooth 60 fps on supported hardware, with measured fallback quality if necessary; no physical-device performance claim until actually measured.

## Progression, content and saves

Add a chapter/level selection map with replay, mechanic discovery pages and previewed upcoming rewards. Space station rewards across the campaign so home-building does not run out after two early stations. Define a real reward catalog before presenting locks or promises; aim for one substantial station milestone per chapter, supported by smaller crew/decorations between them. Reuse existing homes and VIP ownership.

Version campaign content and saves. Keep existing in-progress boards playable under their recorded rules until completion, then enter the new campaign at an appropriate level. Newly introduced mechanics that were skipped due to prior progress need catch-up teaching before their first use. Preserve credits, VIPs, built rooms and claimed rewards. Replay rewards must not duplicate one-time unlocks.

## Engineering boundaries

- Campaign catalog: fixed levels, unlock schedule, chapter objectives and first-use lessons.
- Board geometry: masks, regions, lanes, exits and route validation.
- Mechanics: typed state, pure transitions and ordered events, with explicit compatibility constraints.
- Goal evaluator: multiple objective types and composed goals; consistent victory/failure ordering.
- Solver/validator: models the same mechanics and tracks complete states, verifies a solution under the actual rules.
- Presentation: assets, event animations, hints, teaching overlays and accessible controls.
- Persistence: save migration, campaign versioning and reward ownership.

Extend the current pure engine and event-animation pattern. Split growing rule handling into focused modules; keep simulations independent of Pixi. Ship compact level data and compressed local art. Revisit precaching strategy with measured package size so 25 mechanics do not make first installation unreliable.

## Completion evidence

1. Exactly 1,000 shipped, addressable campaign levels with reproducible content, not an uncapped runtime index.
2. At least 25 distinct mechanic families, each encountered through a tested introductory level at the scheduled point.
3. Every shipped level has a verified booster-free solution replayed against the current engine. Full 1,000-level validation must pass before claiming complete coverage.
4. Automated pacing and geometry audits check introductions, valid combinations, shape distribution, repeated patterns and unreachable goals.
5. Regression coverage for each mechanic's state changes, interaction boundaries, save/reload, rewards, and animation event completeness.
6. Manual browser playthrough of each introduction and representative mixed-mechanic levels; phone viewport checks for every shape family.
7. Visual inspection of each mechanic's states and animation, plus actual iPhone checks for touch, safe areas, installed updates, offline loading and sustained performance when the device is available.
8. Original parent sources and production site remain preserved; completed releases use the separate next deployment.

## Delivery sequence

First establish versioned campaign data, geometry and validation infrastructure. Then implement mechanics in campaign order with their art, teaching levels and animation together. Expand and validate complete chapters, followed by the full campaign and final deployment. A rule without art/animation/teaching/validated levels is not considered delivered.

The next review is this design's gameplay scope, unlock cadence and board/visual standards. After that, write a concrete implementation plan with interaction rules, file boundaries and test steps.
