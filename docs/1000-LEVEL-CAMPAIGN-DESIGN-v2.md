# Sliding Stars: research-informed 1,000-level campaign

Revision 2 — September 26, 2026. Complete design proposal; gameplay implementation has not started. Supersedes the first campaign proposal. Supporting evidence: [broader research report](SLIDING-SEAS-BROADER-RESEARCH.md). Exact rollout data: [mechanic schedule](campaign-mechanics.csv).

## Intended experience

A warm space-rescue game that stays interesting through 1,000 levels. Zena and Pepper meet a growing cast, help stranded travelers and creatures, and build places where they can live. Puzzles remain relaxed but thoughtful: no real-time deadlines, paid lives or waiting to retry. Cute, nonviolent pirate drones and mischievous creatures are welcome.

Deliver at least 25 distinct additional board mechanics: retain the existing five and add twenty. Terrain tiers, normal merges, stations, pods, boosters, cosmetics, board sizes and higher durability do not inflate the count. Introductions continue through level 961, with time to learn and revisit them. A mechanic is complete only when its rules, tutorial, artwork, animation, save support and validated levels work together.

Preserve the original parent project and production site. Implement inside sliding-stars-next. Retain installed-player progress and publish completed releases to https://next--sliding-stars.netlify.app.

## What the research changes

- Rescue variety is central: fixed and arriving crew, transfers from creatures, distinct destinations and evacuation routes. This takes priority over an assortment of unrelated locks and blockers.
- Board footprints alternate throughout progression. Smaller unusual puzzles remain meaningful after level 500; reaching a large rectangle is not the end of layout progression.
- New rules get playable demonstrations, followed by practice, a familiar combination and later reminders.
- New characters and home rewards continue through the full campaign, addressing reported late-game reward droughts.
- Keep the cute style, but strengthen terrain readability and visible cause-and-effect during moves.

Reference evidence labels used below:

**A — reference-informed adaptation:** a category is supported by independent reviews, player reports or inspected footage. Our precise rules remain original; this is not an exact reproduction.

**O — original space mechanic:** an explicit design choice, not a claim that Sliding Seas contains it.

Existing reactors loosely adapt a documented volcano category; existing comets are original blockers, not whale substitutes. The new moon-whale system addresses creature-to-crew transfer directly. Research does not establish a reference unlock schedule or prove three animal species have three distinct mechanics.

## Core rules and shared behavior

Keep the current terrain merge progression, pod/station creation rules and free sliding of pods/stations. Stable terrain remains safe except in clearly labeled shelter-request missions. Each valid move advances one turn; rejected swaps and the existing boosters do not advance oxygen or scripted actors. A new mechanic must not quietly change that contract.

Define each level's geometry, initial tiles, refill seed, actors, objectives, active mechanics and turn budget explicitly. Default goals are positive tasks. Every finite crew source and necessary objective item must be included in the level's validation; no goal depends on lucky unbounded spawns.

New actors use stable IDs. Cell terrain, fixed fixtures, carried passengers and moving pieces are separate concepts. Transfers never duplicate or delete a person. Carrying a person to safety credits their rescue exactly once.

## Mechanic catalog and introduction schedule

The levels below are our proposed campaign schedule. Each introduction at N reserves N through N+4 for teaching and practice. Later introduction levels depend on familiar rules, not equal spacing for its own sake.

| # / first level | Mechanic and source | Rule and distinctive decision | Teaching prerequisite | Visual and animation |
|---|---|---|---|---|
| 1 / 4 | Supply crates — existing, A | Adjacent matches open stationary multi-hit cargo; choose where to merge rather than where to transport an item. Retain current damage rules. | Base merging | Rounded crate, visible damage stages, supplies spring out. |
| 2 / 16 | Ice crystals — existing, O | Fixed terrain cannot move until an adjacent match frees it. Retain current thaw rules. | Crates | Translucent shell, cracking rim, soft melt. |
| 3 / 31 | Rescue rovers — existing, O | A rover automatically carries its passenger one legal route step toward a station entrance after each valid move. Build the route and position the destination. | Safe terrain and station entrances | Wheel roll, passenger lean, visible final boarding step. |
| 4 / 56 | Reactors — existing, A | Adjacent matches cool a reactor before its visible turn fuse triggers a terrain downgrade. Retain current rules and teach the warning separately. | Crates and oxygen counters | Warm pulse, cooling puff, restrained overload ring. |
| 5 / 81 | Frozen comets — existing, O | A multi-cell fixed formation shares one damage pool. Attack whichever reachable side opens the useful route. | Ice | Shared cracks, fragments dissolve; no trapped animal implication. |
| 6 / 111 | Evacuation exits — A | Marked bottom-edge cells remove arriving evacuation capsules or cargo from play and count them toward the objective. Capsules carry crew safely; use matches and gravity to route them. | Gravity and pods | Clear docking arrow, descending capsule, dock lights and wave. |
| 7 / 146 | Incoming rescue waves — A | A finite, visible queue introduces specified crew onto ordinary terrain at authored entry cells after scheduled valid turns. An existing rider, actor or fixture makes an entry unavailable; its wave waits visibly. Terrain itself does not block arrival. Plan future safety as well as current rescues. | Rescue and exits | Approaching shuttle preview, arrival arc, friendly greeting. |
| 8 / 186 | Moon-whale transfers — A | A friendly carrier follows a marked loop one step per turn. An adjacent match requests transfer; it releases its passenger only to the marked adjacent safe cell or pod. Otherwise the passenger stays aboard safely. Plan the transfer moment and landing place. | Rovers, safe terrain | Breathing/blinking whale, flipper cue, continuous passenger hop. |
| 9 / 231 | Moon-pup herding — A | A pup walks one step toward its fixed nursery along connected safe terrain after each valid turn. It does not ride a pod or board a normal station. Build a safe path rather than transporting a conventional survivor. | Rover route planning | Ears perk, tiny paws, tail wag at the nursery. |
| 10 / 276 | Orbital currents — A | A marked cyclic lane shifts its movable contents one step per turn, carrying riders. Frozen/fixture cells split or disable a lane at authoring time; the runtime never pushes through them. Anticipate where a match and its passengers will move. | Moving carriers | Unambiguous direction markers, smooth synchronized travel. |
| 11 / 326 | Pirate-drone interception — A | A drone advances along a shown route toward a supply dock. Adjacent matches reduce its two distraction points; at zero it returns its parcel and leaves. Reaching the dock ends that mission with a retry, without taking persistent credits. Intercept a moving threat. | Rover routes and reactor countdowns | Toy drone, mischievous eyes, confetti surrender, returned parcel. |
| 12 / 376 | Paired portals — O | During gravity, before ordinary refill, a piece reaching an entry transfers with its riders if the receiving cell is empty. Otherwise it waits. The receiver has no ordinary refill source and discharges into its marked gravity segment. Each piece transfers at most once per turn. | Exits and currents | Shared symbol pair, shrink-in/expand-out, visible destination glow. |
| 13 / 426 | Fold-out bridges — O | Two qualifying matches beside a bridge switch permanently activate designated missing cells. These cells refill normally and connect routes; surrounding terrain stays in place. Change the actual board connectivity. | Ice and route planning | Panels unfold in order and settle into the existing tile grid. |
| 14 / 471 | Shelter requests — A | A marked guest who first reaches safe terrain starts a generous 20-move shelter request. Rescue at a station completes it; re-entering danger also requires survival. Both needs remain independent, with the earlier deadline displayed prominently. Used only in explicitly labeled missions. | Conventional rescue and finite waves | Clear home-shaped request badge, anticipatory wave, happy arrival. |
| 15 / 516 | Moon gardens — O | A fixed plot advances once for each match containing its cell. Three growth stages produce a harvest token that must reach an evacuation exit. Requires growing in place and then moving the crop. | Crates and exits | Seed, sprout, flower, buoyant fruit; recognizable stages. |
| 16 / 561 | Star keys and gates — O | Deliver an authored key to its lock cell to open a linked permanent gate. The key moves as cargo; gate opening exposes a previously unreachable route. Unlike bridges, this requires delivery of a specific item. | Exits and bridges | Key spins into lock; linked door folds open with a visible signal. |
| 17 / 611 | Gravity switches — O | A match containing a switch toggles its chamber between down and left gravity. Refill uses the opposite marked edge. Crews and ordinary pieces follow the new fall; fixed fixtures do not. Reorient the entire chamber's routes. | Portals and irregular regions | Direction preview, short switch turn, coherent chamber-wide slide. |
| 18 / 661 | Solar collectors — O | A fixed collector accepts adjacent merges of its displayed terrain tier, charging one unit per qualifying merge. Meeting its authored quota activates a rescue destination. Choose which terrain to build and where. | Reactor cooling and terrain tiers | Petal array, unmistakable tier icon, charge ring, beacon opening. |
| 19 / 711 | Friendly space jelly — O | Each third valid turn, jelly coats one eligible adjacent empty-of-crew ordinary tile, visibly previewed. An adjacent match clears a coating and cancels that turn's spread. No coating may spawn on crew, special pieces, fixtures or required cargo. Control expansion without real-time pressure. | Ice and reactor timing | Wobble, preview droplet, clean pop; no opaque cover over crew. |
| 20 / 756 | Visiting shuttle docks — O | A rescue destination moves one authored track step per turn; crew stay on their own tiles. Rescue happens when its visible entrance meets safe waiting crew. Unlike a rover, the destination travels and waiting passengers do not. | Rover entrances and currents | Shuttle drift, entrance light, short boarding bridge. |
| 21 / 801 | Phase doors — O | A fixed doorway alternates passable/blocked at the end of each turn. When occupied, closing waits until clear; it never crushes, displaces or traps a piece in an invalid state. Time a route through a temporary opening. | Gates and turn phases | Next-state countdown, translucent open frame, soft closure. |
| 22 / 841 | Signal relays — O | Only the next numbered node accepts an adjacent match. Activate the ordered chain to open its final rescue endpoint; activated nodes remain active. Choose the sequence of match locations rather than collecting a resource. | Solar endpoints | Numbered stars, traveling light, persistent completed trail. |
| 23 / 881 | Tethered rescue pairs — O | Two passengers share a rigid two-cell carrier. Dragging it translates one orthogonal cell over ordinary terrain only when both destination cells fit. This is a valid turn without a match. An adjacent match releases the tether only when both landing cells are safe. Shape and clearance matter. | Comet footprint and moon-whale transfer | Soft glowing tether, synchronized movement, two distinct landing hops. |
| 24 / 921 | Repair bots — O | Deliver a repair kit to a bot, which then follows its displayed route to restore the next broken cell. Each job consumes one kit; a fixed list of jobs completes the objective. Requires supplying and routing a worker, unlike a stationary bridge switch. | Key delivery and rover paths | Tool wiggle, traveling bot, panel assembly with a small sparkle. |
| 25 / 961 | Shuttle rendezvous — O | Two marked staging docks must be occupied by their required passengers at the same end-of-turn check. Single arrivals wait safely; they are not consumed until both are ready. Coordinate timing instead of independently accumulating rescues. | Visiting docks, phase timing and safe transfers | Two readiness lamps, shared boarding, affectionate farewell and launch. |

The creature, current and threat behaviors above are explicit space-game rules. They must not be described in product text as exact whale/turtle/whirlpool/pirate behavior from Sliding Seas.

## Eight objective families

1. **Bring crew home:** reach conventional stations; later variants add waves, transfers or shelter requests.
2. **Recover supplies:** open crates or deliver specified cargo.
3. **Evacuate:** route crew capsules to marked exits.
4. **Guide a creature:** build safe paths to nurseries or complete a safe carrier transfer.
5. **Intercept mischief:** distract pirate drones before they reach a dock.
6. **Restore a route or destination:** bridges, gates, solar collectors, relays and repairs.
7. **Grow and deliver:** develop gardens, then transport the harvest.
8. **Coordinate departures:** fulfill simultaneous rendezvous conditions.

Not all families appear in early chapters. Every family, once introduced, recurs in later chapters. By level 700, chapter selection must draw from at least six available families. Show a primary objective and, only when necessary, one secondary objective. Do not expose eight counters on one board.

## Twenty chapters with a changing rhythm

Each chapter contains exactly 50 numbered levels. Names and themes are original space settings. The mechanic schedule is authoritative; a chapter cannot include an unintroduced rule.

| Chapter / levels | Setting and puzzle focus | New mechanics | New chapter room |
|---|---|---|---|
| 1 / 1–50 | Home Orbit: safe merging, routes, small irregular boards | Crates, ice, rovers | Arrival Lounge |
| 2 / 51–100 | Ember Belt: readable hazards and alternate approaches | Reactors, comets | Cloud Kitchen |
| 3 / 101–150 | Shuttle Harbor: exits and scheduled arrivals | Evacuation exits, waves | Parcel Post |
| 4 / 151–200 | Moonwhale Cove: build safe transfer points | Moon-whale transfers | Moonwhale Lookout |
| 5 / 201–250 | Pawprint Moon: familiar rescue, then creature paths | Moon-pup herding | Pup Nursery |
| 6 / 251–300 | Ribbon Nebula: predict moving terrain | Currents | Ribbon Garden |
| 7 / 301–350 | Mischief Patrol: interception among gentle rescues | Pirate drones | Toy Workshop |
| 8 / 351–400 | Twin-Star Crossing: connected regions | Portals | Stargate Pavilion |
| 9 / 401–450 | Patchwork Orbit: open new paths | Bridges | Bridge House |
| 10 / 451–500 | Cozy Comet Inn: destination planning | Shelter requests | Guest Lodge |
| 11 / 501–550 | Moonflower Fields: growth and delivery | Gardens | Moonflower Conservatory |
| 12 / 551–600 | Keylight Station: cargo changes access | Keys and gates | Keylight Gallery |
| 13 / 601–650 | Sideways Sky: controlled gravity changes | Gravity switches | Tumble Observatory |
| 14 / 651–700 | Sunpetal Reach: build requested terrain | Solar collectors | Sunpetal Atrium |
| 15 / 701–750 | Jellymoon Lagoon: contain a gentle spread | Space jelly | Jelly Tea Room |
| 16 / 751–800 | Wandering Harbor: meet moving destinations | Visiting docks | Shuttle Café |
| 17 / 801–850 | Lantern Passage: timing and ordered actions | Phase doors, relays | Lantern Walk |
| 18 / 851–900 | Together Constellation: plan for pairs | Tethered pairs | Friendship Dome |
| 19 / 901–950 | Little Fixers: supply workers and restore routes | Repair bots | Fixer Garage |
| 20 / 951–1000 | Home Among the Stars: coordinated departures and celebration | Rendezvous | Starfall Ballroom |

### Learning and recurrence

At introduction N: N is a tiny no-failure demonstration; N+1 offers guided practice; N+2 and N+3 are independent, forgiving applications; N+4 combines it with one familiar prerequisite. These are five different levels, not five reskins of one solved layout.

Levels 1–3 retain the existing foundation lessons. Levels 4–8 must support both the crate introduction and the continuing basic rescue teaching without adding other unfamiliar mechanics. First player control always arrives promptly.

In each subsequent 50-level chapter, every recently introduced mechanic gets at least four meaningful appearances. Older mechanics return through a rotating selection; not every chapter has to contain all 25. Each introduced objective family appears at least once in each later 100-level window.

Most boards feature one or two additional mechanics. Cap at three, excluding the base merge/rescue rules. Default count caps: six simultaneously active crew, two moving carriers, one spreading system. Departures are checked before new arrivals consume that capacity. Authored overrides require explicit playtest justification, not just a solver success.

Every ten-level block contains at least two quick, forgiving puzzles; at most one is labeled a thoughtful challenge. A challenge cannot be adjacent to an introduction and is followed by a gentler level. Chapter finales use mastered rules; level 1,000 celebrates breadth without combining all mechanics.

The introductory schedule reserves late discoveries while avoiding an identical 40-level interval. Tuning may move a first appearance within its chapter, but the CSV, tutorials and validation assertions must change together. Never move a release boundary silently underneath an existing player.

## Board geometry is a design input

Twelve shape families: compact rectangle, tall corridor, wide shelf, diamond, stepped terraces, L, T, cross, U, ring, linked lobes, offset chambers. Reflections and rotations are variants of the same family. Destination placement, choke points and refill routes must give each shape a reason to exist.

Use 4–7 columns and 4–9 rows for ordinary puzzles, with smaller teaching boards allowed. These are our initial phone-friendly limits, not claimed Sliding Seas dimensions. A large board must not become the permanent default after early levels.

For each chapter after the first: at least six shape families, at least three dimension pairs, and at least ten boards with 30 or fewer playable cells. Chapter 1 needs four families, allowing its tutorials room. Do not repeat an identical mask on consecutive levels, or use the same shape family more than three times consecutively.

From chapter 4 onward, each chapter includes at least one compact routing puzzle, one tall evacuation/rescue layout, one broad matching layout, one narrow connection, and one unusual destination arrangement. Separate chambers become available with portals/bridges; earlier holes use connected boards or independently solvable regions. A family requiring a locked mechanic is unavailable until it is taught.

Gameplay geometry is explicit: cells, connected regions, gravity segments, actor tracks and exits. Empty mask cells are real gaps, not invisible tiles. Falling pieces stop at region boundaries unless a specified connection allows transit. The level validator checks spawn access and every objective's reachability.

Touch target acceptance: at least 40 CSS pixels per playable cell on supported portrait layouts at 375×667 and 390×844, including gaps only when the input mapping makes them part of the hit target. Reflow the HUD/tray or choose a smaller template when this fails. Do not compress crucial counters to make a larger board fit. Also inspect 320×568 as a constrained layout; it may use a compact UI, with no clipped objectives or off-screen controls.

## Turn resolution and compatibility

All movement is deterministic. An accepted player action follows this sequence:

Occupancy is layer-specific. Rover/creature/drone tracks and rigid carriers travel over their permitted ordinary terrain; the presence of that terrain is not a collision. Other actors, unrelated riders, fixed blocking fixtures, pods and stations block them unless a defined rescue transfer consumes the rider. Actor moves do not silently swap the underlying terrain. Piece transport by currents, gravity or portals instead moves the actual piece and all attached riders. A carrier's own footprint is excluded from its destination collision test.

1. Apply the player action and emit its visible movement.
2. Resolve matching, gravity, arrivals at exits, and immediate rescue until stable. Charge match-triggered fixtures only from actual merge events; do not double-count a cascade.
3. Process requested transfers and one transport/actor step in stable actor-ID order. Occupied destinations block movement; actors never overwrite occupants. Resolve resulting gravity/matches/rescues. Newly created transports do not step again in the same turn.
4. Process scheduled environmental changes, with each feature advancing at most once per valid turn. New effects can settle the board but cannot recursively advance the same turn clock.
5. Credit completed objectives and rescue successes. If all goals are now complete, win before decrementing remaining need counters or admitting another wave. Otherwise tick unresolved individual needs and evaluate failure. Scheduled future crew must be included in the objective quota so a wave mission cannot accidentally win before its required arrivals.
6. If play continues, admit scheduled crew up to the level's active cap at valid entries and resolve immediate arrival safety. New crew do not lose one countdown unit on the turn they enter.
7. Save the resulting state and ordered event list before presentation. Unlock controls after animation has reached that exact state.

The engine must specify tie-breaks for multi-destination transfers and route choices in data-independent stable order. Hints, solver, replay and game use the same transition function.

Initial restrictions keep combinations understandable and testable:

- No portals on current lanes or carrier tracks; no portal-to-portal chains in one turn.
- Gravity-switch chambers cannot contain currents, multi-cell carriers, visiting docks or phase doors in the first campaign release.
- Tethered carriers cannot enter portals or currents. Their authored tracks fit both occupied cells.
- Jelly cannot spread onto portals, doorways, bridge cells, exits or movement tracks.
- A phase door may not be the only evacuation option for a shelter-request guest unless the guaranteed opening fits the remaining allowance with generous slack.
- Bridges, keys and repair jobs never make a mandatory exit permanently unreachable.

These are campaign-authoring constraints, validated automatically. They avoid pretending that every pair of mechanics is supported just because each works alone.

## Cute art and readable motion

Preserve existing Zena/Pepper designs, rounded forms, soft highlights and friendly space palette. New creatures get expressive eyes, clear silhouettes and small idle gestures. Fixtures resemble places or useful objects, not generic colored blocks. Add obvious terrain material/height differences; color alone must not distinguish tiers.

Every new mechanic needs an art sheet with idle, actionable, warning/blocked and completed states. Prototype placeholders are permitted during engine work but fail the release checklist. Reuse stylistic components without counting recolors as new content.

Animation targets are design targets, not measured reference timings: swaps about 140–180 ms; a single merge about 250–400 ms; one carrier step about 180–300 ms; short rescue celebration about 400–650 ms. Overlap independent effects where readable. Long cascades should accelerate modestly, not hold the player for several seconds of repeated applause. All spatially related passengers visibly ride or transfer with their carrier.

Reduced motion removes bobbing, shaking and excess particles while retaining short positional transitions, state changes and clear feedback. Sound stays optional. No event relies exclusively on sound. Backgrounding pauses idle animation/audio and prevents a queued action from being applied twice on return.

Inspect every mechanic on a phone-sized board and in its most crowded legal combination. Measure real-device frame times and touch responsiveness before claiming iPhone performance. Target 60 fps; reduce decorative particles before reducing rule visibility. The live website must retain installability and offline access to the full campaign.

## Home and reward progression

Keep the two existing stations, twelve rooms and twenty-four existing VIPs. Add five themed station annexes, each holding four chapter rooms from the chapter table: chapters 1–4, 5–8, 9–12, 13–16 and 17–20. Completed homes remain visitable.

Each chapter introduces two new named VIPs at offsets 25 and 45, for forty additional VIPs. Their exact names and artwork are content-production work, but their roles must support that chapter's room. The existing botanist introduction at level 3 remains intact. New VIP appearances are scheduled, not left to rare random chance.

At chapter completion, award that chapter's room construction kit; construction does not require buying credits. The kit is usable immediately in its annex regardless of unfinished older rooms. Existing room costs and owned rooms remain valid. Chapter rooms offer two visual arrangements using the same underlying room, not two different mechanical unlocks. Smaller milestones award decorations and credits, with adequate placement space.

New totals are seven home locations, thirty-two rooms and sixty-four VIPs. These are content targets and may be claimed only after the full catalog exists. A chapter reward may not point to a placeholder room.

## Campaign delivery and saving

Ship exactly 1,000 fixed numbered levels. Author teaching and milestone puzzles; use constrained generation offline to produce candidates for the rest. Curate candidates, solve them, and commit the resulting definitions. On-device play does not search for a solvable board or quietly substitute a simpler mission.

Every level contains a stable ID, campaign version, mechanic IDs, objectives, geometry, deterministic refill seed and presentation references. Store solution traces in development validation artifacts, not as an unrestricted in-game autoplay feature. Replaying a trace against the actual rules must win without paid/consumable boosters.

The campaign map supports replay and a discovery guide. First-completion rewards are keyed by campaign level/reward ID; replay cannot duplicate VIPs or construction kits. Replays offer practice without farming chapter rewards. Hints remain available; after three failed attempts offer optional extra allowance with the original puzzle clearly labeled as assisted. No hidden difficulty changes.

Save migration preserves wallet, owned boosters, existing homes/VIPs and the exact active legacy board. Finish that board under its recorded rule version before entering the new campaign at the next uncompleted number. If progress skips an introduction, present a short practice overlay before the first encounter with the unfamiliar rule; do not force replay of hundreds of levels or award the same VIP twice. Levels already beyond 1,000 retain progress and unlock campaign replay without falsely marking new goals completed.

Version the engine rules and campaign separately. Retain a legacy transition path until migrated in-progress boards finish. Completed chapter rewards require explicit entitlement migration, not arithmetic inferred from a single legacy level number. Offer entitled legacy players a claimable catch-up reward list after migration; never overwrite their current layouts.

Precache the complete validated campaign and compressed required art for offline play. The installation-ready message appears only when required resources are present. Measure compressed size and installation behavior before choosing chunk boundaries; maintain a manifest of required assets and fail clearly rather than claiming offline readiness after partial caching. Preserve the separate original-app cache and save namespace.

## Implementation boundaries

- Campaign and content: fixed catalog, chapter schedule, rewards, lessons and validation metadata.
- Geometry: masks, regions, gravity segments, routes, fixtures and collision rules.
- Mechanics: small pure rule modules registered by ID, typed state and ordered event output.
- Goals: positive objective evaluation, combined conditions and consistent terminal-state precedence.
- Solver: complete-state hashing, bounded search, stored winning traces and trace replay.
- Rendering: art states, complete event animations, indicators, safe input locks and responsive layout.
- Persistence: schema/rule migrations, one-time entitlements and deterministic replay state.

The renderer must not invent gameplay transitions. A mechanic module must declare affected state, triggers, permitted combinations and visible events. Split overloaded engine functions along these boundaries while preserving the current regression tests.

## Validation and completion contract

1. Validate all 1,000 definitions, IDs, dependencies, introductions, objectives and required assets.
2. Replay a booster-free winning trace for every level using the shipped engine. A solver timeout is an unresolved level, not proof of impossibility and not a pass.
3. Audit shape diversity, mechanic recurrence, maximum simultaneous complexity and difficulty labels. Trace length and required precision are tuning aids; actual playtesting determines whether a level feels relaxed.
4. Test each mechanic's blocked paths, crew transfers, timing, cascades, terminal outcomes, save/reload and booster interactions. Add focused pairwise tests for every combination actually shipped.
5. Complete manual browser playthroughs of all 25 teaching sequences, all twenty finales and representative mixed boards. Verify every shape family in phone layouts.
6. Inspect animation-event completeness: every moved entity has a corresponding visible transition; no rider jumps or disappears; interrupted animations recover to the committed state.
7. Exercise migration from representative existing saves, mid-cascade reload, repeated victory, full/denied storage, offline installation and update activation.
8. Run actual iPhone checks for touch, Home Screen mode, safe areas, offline launch and performance when hardware is available. State that limitation explicitly until tested.
9. Publish only the completed verified release to the next alias, check live file hashes and installation, and verify the original production deployment is unchanged.

## Delivery order

Start with campaign data, geometry, transition/event boundaries and migration fixtures. Implement each mechanic with its lesson, finished visuals and validation in campaign order, then curate its chapter content. Expand the home/reward catalog alongside the same chapters. Finish with full-campaign validation and live deployment. An internal chapter build is progress, not grounds to declare the 1,000-level request complete.

The next step after review of this revised design is a file-level implementation plan with tests and execution order. This design does not itself add playable levels to the published game.

Design validation completed September 26: 25 unique mechanic IDs, five existing plus twenty new; all introduction levels match the CSV and chapter numbers; five-level teaching spans do not overlap; every prerequisite completes its teaching before its dependent introduction; the last introduction is 961. These are checks of the proposed schedule, not gameplay or solvability results.
