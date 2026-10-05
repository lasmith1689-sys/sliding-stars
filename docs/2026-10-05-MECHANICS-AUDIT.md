# Mechanics audit and corrections — October 5, 2026

## Scope and result

The reported Mission 3 gap was a real physics defect. A permanent hole divided one fall lane into two independently supplied segments. Removing terrain below the hole therefore refilled the lower segment locally instead of moving the original upper tile and its passenger down. The corrected runtime joins compatible fall lanes across permanent gaps. The gap itself remains empty and cannot be selected, matched or refilled.

This audit covered the complete implemented game: matching, cascades, gravity, refill, passengers, dragging, clocks, goals, supplies, every one of the 25 live mechanic modules, their combinations, advice, persistence, home rewards and rendering. It found and corrected additional departure and home progression defects. All 1,000 published missions were replayed under the corrected engine; their definitions and in-progress saved boards were preserved.

## Reference research

Fresh online checks were made on October 5 and compared with the earlier [broader research](SLIDING-SEAS-BROADER-RESEARCH.md), [supplement](SLIDING-SEAS-RESEARCH-SUPPLEMENT.md), and [rule compatibility review](campaign-rule-compatibility.md).

| Source | Evidence and limits |
|---|---|
| [Mugshot's official site](https://www.slidingseas.com/) | Official description of land merging, rescue, special encounters and a growing home. Search retrieval succeeded; direct page retrieval was unavailable. |
| [Official iPhone listing](https://apps.apple.com/us/app/sliding-seas/id1436245163) and [Google Play listing](https://play.google.com/store/apps/details?hl=en&id=com.mugshotgames.slidingseas) | Current developer descriptions identify rescue, creature/pirate/treasure modes, home decoration, VIPs, combos and offline play. The iPhone page lists 2.4.7 dated September 9. Marketing is not an exhaustive rule specification. |
| [Mugshot's launch announcement](https://www.prlog.org/12883049-sliding-seas-new-match-3-puzzle-game-from-the-developers-of-digfender-released-today.html) | Primary developer explanation of terrain height, merging, different mission objectives and settlement growth; links the official trailer. Historical 2021 material. Trailer retrieval was throttled, so no fresh frame inspection is claimed. |
| [Firsthand rule guide](https://newsaround.tistory.com/38) | Explains three-tile promotion at the changed cell, larger combinations, shelters, individual move requests and booster effects. It reports four-low-terrain rafts, four-land shelters, five-tile bonus crates, and a highest-terrain rescue path. Historical secondary evidence, not confirmation of every current iPhone edge case. The text was retrieved during the initial research pass; later retrieval failed and original image links had expired. |
| [Common Sense Media review](https://www.commonsensemedia.org/app-reviews/sliding-seas), [Player.One review](https://www.player.one/sliding-seas-review-match-three-142252), [Gamezebo review](https://www.gamezebo.com/reviews/sliding-seas-review-a-gorgeous-entertaining-match-stuff-puzzler/) | Prior research describes teaching, separate rescue/shelter needs, cascades, obstacles and three booster roles. These older reviews support the broad model; they cannot establish current native timing or all late-game rules. |
| [Exophase achievements](https://www.exophase.com/game/sliding-seas-android/achievements/) | Recognizes transfers from several sea creatures and pirate-related actions. Achievement wording does not establish exact movement or targeting rules. |

A July 2024 firsthand review on the iPhone listing describes reaching more than 1,400 levels with crate, bottom-drop, pirate, village and mountain objectives. This supports variety across the campaign, not an exact commercial-mechanic inventory. Earlier sampled player footage documents irregular boards and terrain/crew relationships; no new complete video playthrough was performed in this audit.

The user's screenshot and explicit description settle the desired gap rule for Sliding Stars. Online material alone does not establish every current Sliding Seas function. This work audits every implemented Sliding Stars function against the evidenced core relationships and its previously approved space rules; it does not claim exhaustive parity with the commercial game's present release.

## Core rules and fixes

| Function | Audited behavior / result |
|---|---|
| Permanent empty slots | Remain outside the playable footprint. Falling terrain crosses them along a compatible same-chamber lane; the original piece ID and every passenger are preserved. No fresh tile is inserted into the hole. |
| Closed cells, blockers, stations | Retain their distinct authored behavior. Closed cells cannot be treated as permanent empty space; chamber boundaries and blocking fixtures remain effective. Stations retain their existing local supply boundaries. |
| Ordinary and switched refill | Existing terrain falls first. New terrain enters the live upstream edge with explicit refill and movement events. A vacancy behind a stranded rider cannot authorize a local random spawn. Both down and left gravity are tested. |
| Neighbor swaps and dragging | Directed orthogonal swaps share the same validation as hints and touch input. Invalid slides cost neither a move nor a supply charge. Cargo has no free drag; occupied shuttles have one-cell flight, while empty shuttles require a terrain-making swap. |
| Matching and cascades | Three equal adjacent terrains promote at the intended anchor; junction and large-match output follows the approved station/shuttle rules. Matches do not reach across missing cells. Cascades resolve before the next action. |
| Passenger transport | Crew ride the actual moved terrain, pod, cargo or actor. Movement and transfer events reconstruct the same final positions as the saved engine state. |
| Needs and objectives | Individual rescue and featured shelter clocks count accepted moves; supplies do not advance those clocks. Newly admitted crew do not lose a turn on arrival. Required finite objective IDs are credited once. Invalid or terminal actions do not mutate the saved state. |
| Paired departure | **Fixed:** a station entrance or moving dock could steal a rendezvous passenger, invalidating the paired ledger and crashing an advertised legal move. Reserved guests now remain in their exact pods until both assigned staging pads are ready. Tractor supplies cannot board unrelated guests onto those pods. A production Mission 961 detour was reduced to a one-move public regression. |
| Supplied actions | Demolition protects occupied terrain; tractor needs a safe target and an actual eligible guest; shuffle preserves special entities. Accepted supplies are debited once; rejected targets change nothing. |
| Home rewards | **Fixed:** campaign victories previously wrote completion claims without banking rescued people or VIPs. Actual housed/evacuated crew now bank with the committed win. Separate `home:` payment claims prevent repeat payments across reload, save retries and replay. |
| Existing reward repair | **Fixed:** old completion claims are not mistaken for paid home rewards. A retained won snapshot supplies the actual outcome; older completed missions supply only guaranteed rescue entitlements. Optional quota VIP identities are never guessed. Active board, wallet, buildings, attempts and progression remain intact. Incompatible historical replacement claims are preserved. |
| Home access and construction | **Fixed:** the campaign omitted the existing home screen. Guide now offers “Visit home station.” Construction is a persisted meta transaction, the board stays locked throughout presentation and native saving, and lifecycle recovery cannot unlock it early. The screen fits a resized viewport and respects reduced motion. The first-room hint now uses the real three-rescue threshold. |
| VIP and room progression | **Fixed:** all 27 published VIP slots repeated the starter botanist, permanently locking 11 existing rooms. A stable reward/portrait schedule resolves those historical markers to all 24 existing residents. Board identity and definition data are untouched. All 27 actual winning routes award the expected roster; both existing stations can finish with campaign rescue thresholds. |
| Hints and campaign generation | **Updated:** 110 proof records changed in their hashes or routes after the physics correction. All 1,000 routes and 3,343 shipped next-move positions were rebuilt and replayed. Future generation records version `terrain-replay-5`; the already published 1,000 definitions remain unchanged. Bounded detour advice remains bounded, not a promise to solve every detour. |
| Save and presentation | Committed engine state precedes animation. Reload, interrupted gestures, blur, resize, background/resume, storage retry, restart and automatic next-mission behavior retain their existing checks. Broad probe scene comparisons matched pieces, passengers, actors, fixtures, geometry, queue and completion flags. |

## All 25 live mechanics

The table reports audited implementation contracts, not a claim that Sliding Seas contains these exact named modules. Creature, rescue, obstacle and collection families have reference support; the numbered signal, tether, repair, key, solar and rendezvous systems are original space adaptations.

| Mechanic | Contract checked |
|---|---|
| Crates | Nearby actual merges reduce durability; each opened supply objective is credited once. |
| Ice | Eligible adjacent merges thaw resistance and expose its terrain consistently. |
| Rovers | Follow authored tracks, retain passengers, wait at obstructions and deliver at their destination. |
| Reactors | Charge and overload from eligible merges; shared environmental timing is not repeated per cascade. |
| Comets | Shared footprint and durability remain coherent; occupied/blocking cells obey transport checks. |
| Exits | Exact cargo or capsule reaches its active boundary destination before departure and evacuation credit. |
| Waves | Pending crew arrive through authored entries, respect active capacity and start needs at the correct boundary. |
| Moonwhales | Carried crew follow the creature; transfer requires an eligible safe arrival. |
| Pups | Movement and nursery arrival preserve the authored route/destination and finite completion IDs. |
| Currents | Route transport preserves riders and excludes repeated transport during one turn. |
| Pirates | Distraction and parcel-return rules preserve authored target identity and nonviolent interception goals. |
| Magnets | A nearby merge pulses a winch; its exact cargo follows its cleared lane, remains held against ordinary gravity and credits the correct dock. |
| Bridges | Distinct merge hits charge activation; permanent cells/connections remain active after save/reload. |
| Shelter | Featured shelter needs start at first safe arrival and advance once per accepted move. |
| Gardens | Growth, finite harvest identity, cargo creation and delivery remain consistent through cascades. |
| Keys | The exact key reaches its lock along a fall, opens the authored gate and preserves the activation ledger. |
| Gravity | Chamber direction switches rebuild geometry without stale fall lanes, riders or refill edges. |
| Solar | Requested terrain charges its quota, activates only its authored destination and presents the requested material. |
| Jelly | Spread and resistance follow accepted-turn timing; practice recovery keeps a legal rescue route available. |
| Docks | Moving entrances stay aligned with their owned endpoint; passengers board once. Reserved rendezvous guests are excluded. |
| Phase | Door state changes wait on legitimate occupancy; gravity and matching respect a closed phase cell. |
| Relays | Actual adjacent merges activate numbered nodes in order and restore only the authored endpoint. |
| Tethers | Either end translates a rigid pair; both footprint cells must be legal and both guests require suitable terrain before release. |
| Repair | A bot collects its exact kit, follows the authored track and opens adjacent broken cells in job order. |
| Rendezvous | Both exact occupied shuttles must stage at their assigned pads; departure and goals commit atomically. Generic station/dock/tractor interactions cannot corrupt the pair. |

Retired portals were separately checked for immutable-save compatibility. They keep historical unsourced receiving segments and refill behavior and do not appear in the release's new missions.

## Deliberate reference differences

The previously approved game keeps generous retries, space terrains, rescue shuttles and stations, no new portals, no raft mechanic, no directional arrows, and automatic celebration-to-next progression. The reference guide's exact twelve-move windows, raft output, five-tile bonus crate and booster inventory are not substituted for those approved rules. Sliding Stars awards its own large-combination credits and has three existing rescue supplies. Adding an extra commercial rule solely for similarity would change the established puzzle contracts.

The existing home consists of two stations, twelve rooms and twenty-four residents. This repair makes that content reachable; it does not create the earlier design document's aspirational seven homes, thirty-two rooms or sixty-four VIPs. Daily events, advertising, purchases and a replica of the commercial decoration catalog are outside this mechanics repair.

## Verification

- Original baseline: 1,149 tests / 119 files passed, showing that the old tests missed the gap and reward defects.
- Final full suite: **1,164 tests / 124 files passed** with `npm.cmd test -- --configLoader runner`.
- TypeScript, production build and Capacitor iOS synchronization passed.
- Production boundary audit passed: **872 modules, 61 chunks, zero development campaign modules**. Offline pack contains **208 files**.
- Full post-fix proof replay: **1,000 / 1,000 verified**, zero failures and zero pending route revisions. Immutable content checksum remains `9896b20b34aa2a3104a698427c709a53a57002cc06ae9b9f083c37b2f7a2a3c4`.
- Independent code review covered all modules and loaded all 1,000 production boards. Deeper probes exercised **5,685 accepted off-route actions** across 165 boards, plus **4,918 initial-action/supply transitions**. Additional targeted probes evaluated 17,464 phase actions and 3,110 rendezvous actions. These are bounded automated explorations, not exhaustive enumeration of all reachable states.
- Targeted regressions cover the screenshot's terrain/passenger identity, permanent versus closed gaps, down/left upstream refill, stranded riders, the Mission 961 crash, reserved pod supplies/docks, actual victory rewards, repair idempotence, construction persistence and every published VIP route.
- Independent historical-reward replay repaired all 27 VIP completion claims to the complete existing roster, preserved active state/wallet and performed no second payment.
- A 390×844 browser board visually showed the astronaut below the original permanent gap after the first move. Real dragging, Guide → Home → return, retained move count and subsequent rescue were exercised.

Online research does not verify exact current commercial parity, iPhone animation timing or physical-device touch/offline behavior. The native upload and delivery status is recorded separately in the release checkpoint; a successful web build does not establish TestFlight availability.

Next: deploy the verified improved `next` preview and update the internal TestFlight build, then retry Mission 3 on the iPhone with its existing saved progress. Continue in the current thread; no new thread is required.
