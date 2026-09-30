# Campaign playtests

## Task18 gravity switches — September29 2026

Controller-attributed independent615 acceptance after source freeze/cache d98623b5082d: root played all three actual drags at390x844, no source edits. First drag320credits/1move showed pod and SAFE guest transfer from(2,0) to(0,5) under LEFT; explicit reload retained320/1,home0/1,pod/LEFT and usable controls. Second moved pod to(1,5); third moved station to(1,4), rescued and reached520/3 win with Guide/Continue enabled. Whole board/footer fit at approximately52px pitch; console warn/error query empty. Root closed own tab3/reset viewport. This is root's observation, recorded in scratch controller-gravity-manual.md, not another implementer playthrough. Correct final switch location is(0,5).

Sole implementer, base a08a5fc, improved DEV127.0.0.1:5175. Actual CUA pointer drags in owned IAB2 and isolated lesson preview slots; no booster, hint execution, or browser state injection. Source frozen after these checks. Coordinates below are zero-based searched actions.

|Lesson|Viewport|Actual observed result|
|---|---|---|
|611|375x667|One drag (1,0)→(1,1), containing merge changed DOWN to LEFT, guest rode toward the station and won. Final diagnostics turn1/unlocked/synchronized; Guide/Continue usable.|
|612|375x667|Two drags, containing merge then station slide. Explicit reload after turn1 retained LEFT and moved guest; second drag won with controls usable.|
|613|375x667|Three drags, two guests rescued. First moved lower guest, containing merge changed to LEFT and brought higher guest across, final station move reached2/2. Tall board and controls fit.|
|614|390x844|Enabled Reduced motion through Guide; three actual drags won. First containing merge changed initial LEFT to DOWN with top-edge supply. Explicit reload preserved turn1/DOWN; remaining station moves completed rescue.|
|615|375x667|Three actual drags won. Initial occupied OUT showed amber WAIT. First containing merge turned LEFT, cleared receiver, and pod with passenger crossed from left room then fell left (0,6)→(0,5). Next moves positioned pod/station for rescue. Guide/Continue restored. Saved phone-615-win.png.|
|615 repeat|320x568|Full three-drag win on narrow board. After first drag, AX still said Resolving; immediately reloaded. Reload retained turn1/LEFT and pod(0,5), then two remaining drags won without another toggle. Board, arrows, WAIT, goal and controls fit. Saved initial/reload/win screenshots.|

615 final actions: (0,5)→(1,5), (0,5)→(1,5), (1,4)→(2,4). Final initial/final hashes676e0b3c53c68694/650cd7b405065b71. Read-only layout measurement:615 tile40.88397658 at320,48.48066144 at375; other boards approximately85–88px. The narrow current/next coach wraps; station/pod and direction symbols remain distinguishable.

Whole console/source-arrow views were sampled before and after actions; this is not an every-frame capture. Unit presentation checks independently cover typed events, cancellation, final scene synchronization and reduced-motion paths. All four actual optimized WebPs were separately inspected by root: unambiguous arrows, stable base/circular housing and unclipped expanded pulse (static inspection only). Native source inspected by implementer; exact original prompt/provenance preserved under public/art/campaign/gravity. Screenshots are under validation/campaign/task-18;611–614 observations are in tool history without separate saved image files.

Owned gameplay tab2 closed and viewport reset before sole serial full suite. An initial failed localhost5175 start left only an error-page tab1 that browser URL policy would not bind; no bypass, running game or viewport override. Root confirmed browser/solver idle. Full gate passed93 files/876 tests; typecheck/build passed;137-file cache sliding-stars-next-d98623b5082d. Static audit excludes source art, validation proofs and development solution markers; all four gravity alpha frames are cached. No physical iPhone performance, installed offline/PWA, complete1000-level or release-readiness claim. Next step: root independent615 play and scoped review/commit in this thread; no new thread needed.

## Task 7 — evacuation exits, 2026-09-26

Tester: implementing agent using CUA Chrome, local Vite `http://127.0.0.1:5175/`, isolated `?campaign-preview=<id>&slot=task7-manual` namespace. The `task7-ready` slot was used for the ready-preview/interrupted-presentation check. No original app tab or live save was used. Each action below was performed as a real pointer drag on the rendered canvas, not by injecting a transition or restoring a solved state. Coordinates are **zero-based row,column**.

| Lesson | Viewport CSS px | Cell px | Played actions | Result |
|---|---|---:|---|---|
| 111 | 375×667 | 88 | (0,2)→(1,2) | won, 1 move, 1/1 evacuated, 320 credits |
| 112 | 390×844 | 88 | (1,2)→(2,2) | won, 1 move, 1/1, 350 credits; cascade descent, not a forced two-move puzzle |
| 113 | 320×568 | 71.8447 | (0,1)→(0,2); (1,2)→(2,2); (2,3)→(2,2); (2,1)→(3,1) | won, 4 moves, 1/1, 560 credits |
| 114 | 375×667 | 85.1942 | (0,1)→(0,2); (1,2)→(2,2); (2,2)→(2,3); (0,1)→(1,1); (2,2)→(2,3); (1,2)→(2,2) | won, 6 moves, 2/2, 560 credits; 1/2 at move 3; reduced motion enabled through Guide before play |
| 115 | 375×667 | 85.1942 | (2,1)→(2,2); (3,0)→(3,1); (2,2)→(3,2) | won, 3 moves, 1/1, 450 credits; ice clears before cargo descends |

Observed throughout: SAFE labels remain on carried crew, passengers ride their capsules, numbered capsule and exit correspondence is visible, exits stay at fixed authored cells, and final scene removes the capsule and passenger. Lesson 114 exits sit on the lower permanent-mask boundary at row 2 despite a central row 3 extending below them. At the smallest tested viewport the board, instructions, Hint/Guide/Restart controls, goal, and move count remained visible; all measured cell targets exceed 40 CSS px.

State-specific checks:

- 111: dragging the capsule sideways was rejected; visible turn stayed 0 and input remained unlocked. The real terrain move then won.
- 111 ready preview: Hint shows a DOWN arrow on the actual winning drag, cyan dock chevron, and “Evacuate safely”; turn remains 0. It is a prediction from the shipped transition.
- 115 warning: initial ice shows “1 hit” and exit shows amber waiting. After the first real match the ice is gone, exit is idle, and the attached passenger remains SAFE. Amber is a view of the existing obstacle, not an additional exit lock.
- 114 reduced motion: toggled on through the real Guide checkbox; all six moves played successfully, including intermediate 1/2 and final 2/2. After completion, reload retained 6 moves and 560 credits.
- 111 interrupted presentation: after the winning drag the visible controls were still disabled for presentation; immediately reloaded. Restored UI showed 1 move, 1/1, 320 credits, Guide/Continue enabled, `data-campaign-locked=false` and `data-campaign-synchronized=true`. No second move or payment occurred.
- Final diagnostic checks for all five plays showed the intended turn count, unlocked input, and rendered stable-ID positions matching the saved final scene. These are read-only development diagnostics; they did not advance play.

Genuine capture files: `task-7-115-waiting.png` is the initial blocked descent with SAFE capsule and amber exit. `task-7-115-thawed.png` is **mid-animation** after the ice clears (terrain holes still visible), not a settled final state. Additional initial/ready/completion screenshots were inspected inline. The exact fleeting departure sprite was covered by delivery-frame inspection and automated event/animation tests; no frame-by-frame video was recorded. Controller independently inspected initial 114 and 115 at actual 375×667 in a separate isolated IAB slot and found labels, correspondence and controls clear.

Chrome test tab closed and viewport override reset after checks. Local Vite server session 27069 remains available for controller review. No physical iPhone, offline installation, FPS, or hardware-performance claim.

Final production build: `campaignBoot-DG85lK8g.js`, service-worker cache `sliding-stars-next-4c7dcd460915`, 90 offline files including all four exit WebPs and optimization receipt. Production graph audit: passed, 785 modules, 17 chunks, zero development campaign modules. The 1,000-level release remains incomplete by design; this is one reviewed mechanic slice.

## Task 8 — incoming rescue waves, 2026-09-26

Tester: implementing agent using CUA Chrome, local Vite `http://localhost:5175/`, isolated `?campaign-preview=<id>&slot=task8-manual-v1`. Every move below was a real canvas tap or pointer drag, observed through the browser UI. No action injection, solved-state restoration, original game save, or user tab was used. Coordinates are **zero-based row,column**. Each preview started with 300 credits.

| Lesson | Actual CSS viewport | Cell target | Actual played moves | Observed result |
|---|---|---:|---|---|
| 146 demo | 375×667 | 88 px | taps (2,1)→(2,2) | won, 1 move, home 1/1, 500 credits, Guide/Continue enabled after presentation |
| 147 guided group | 375×667 | 85.1942 px | drags (2,3)→(2,2); (2,2)→(2,1) | move 1: two guests share the landing, compact `2 crew · SAFE`, home 0/2, 400 credits; move 2: won 2/2, 800 credits |
| 148 independent preparation | 390×844 | 88 px | drags (3,2)→(2,2); (2,2)→(1,2); (0,1)→(1,1); (1,2)→(2,2) | next-wave countdown 2→1; move 2 arrival O₂20; move 3 guest rides the match into safe terrain; move 4 won 1/1, 640 credits |
| 149 independent occupied entry | 375×667, resized while waiting to 320×568 | 85.1942→71.8447 px | drags (3,3)→(3,2); (3,2)→(3,1) | move 1: wave-a admitted, wave-b visibly Waiting, 0/2, 350 credits; move 2: won 2/2, 750 credits. Reload retained two moves/750 credits, enabled Guide/Continue |
| 150 exits combination | 375×667 | 85.1942 px | drags (0,2)→(1,2); (1,3)→(1,2); (1,2)→(1,1) | move 1: capsule/passenger depart, evacuation 1/1, incoming guest O₂20, home 0/1, 320 credits; move 2 O₂19; move 3 both goals complete, 520 credits |

Five different authored masks and decisions are present: safe one-move preparation, one atomic two-person group, a dangerous second-turn landing, a necessary same-entry queue wait, and a capsule departure freeing the next guest's entry. The final 149 proof itself requires the wait: its first move admits a but leaves b pending/playing; the second frees the entry and wins. This is covered by an authored-content regression.

State/presentation checks:

- 147: opened Guide and expanded **Inspect crew · 2 active** after the first move. Both stable guest IDs, row/column, independent rescue and shelter values, and ordinary-terrain passenger ownership were readable in the accessibility tree. Enabled reduced motion through the actual checkbox, then completed the second move.
- 148: visually inspected the full O₂20 label after admission and the same guest riding the following merge into a SAFE cell. The station moves around that rescue rather than resolving a pre-housed goal.
- 149: waiting HUD remains visible at 320×568, with its final column number wrapping inside the top band. The occupied cell gives the need badge sole ownership of its top edge; amber entry border/corner dot remains clear. Guide was opened while waiting, Reduced motion checkbox explicitly observed changing 0→1, and the second move played with it enabled. Reload requested after completion was reported while controls remained disabled; restored final state showed exactly two moves, 750 credits, 2/2 and usable Guide/Continue. No second payment occurred.
- 150: Hint displayed `Slide DOWN ↓ · Evacuate safely` while turn remained 0. The actual first drag then departed the capsule before wave admission, leaving the evacuation complete but the home goal incomplete. O₂20 and the later O₂19 were inspected in settled screenshots; the exit marker stays visible below the guest. Final read-only DOM diagnostics showed `campaignTurn=3`, `campaignLocked=false`, `campaignSynchronized=true` at an actual 375×667 viewport.
- Screenshots inspected inline include initial shuttle previews, 147 stacked crew, 148 full oxygen/safe terrain, 149 occupied-entry waiting at 320×568, 150 O₂20/O₂19 and final completion. Some immediate post-drag captures show intermediate animation frames while the accessibility state already reports the saved final state; these are not described as settled frames. No frame-by-frame video or persistent screenshot files were recorded for Task 8.

Controller independently played 149 at 375×667 in isolated IAB slots: the same two station drags produced 350 then 750 credits, a mandatory intermediate wait, and a victory reload without duplicate rewards. Controller reported an overlapping queue/SAFE badge in the first presentation draft. The implementer suppressed the redundant occupied-entry shuttle/text in favor of an amber border/dot and authoritative HUD; controller then independently verified SAFE alone, clear astronaut and waiting HUD at 375×667. This was also inspected by the implementer at 320×568.

Chrome test tab closed and temporary viewport override reset. The existing preview server remains for controller review. No physical iPhone, touch-hardware, offline installation, FPS, or full-release claim. Final production build identity and validation are recorded in the Task 8 report beside its brief; this remains an internal mechanic slice, with full chapter assembly deferred to Task 27.

Final booster-free proof identities:

| Level | Moves | Initial hash | Final hash |
|---|---:|---|---|
| 146 | 1 | `505e0612076b3106` | `48ccc61b3994c68c` |
| 147 | 2 | `974fd261ba629563` | `a107b2b26e9d2214` |
| 148 | 4 | `6cb7475b575abb7b` | `34409ada731aa2d8` |
| 149 | 2 | `6f9a07a448cb0a51` | `0f81ee228d55fa87` |
| 150 | 3 | `c8b7402c62072d7b` | `b2aa89d00cc344d2` |

Each final authored definition and trace is preserved in `validation/campaign/traces/level-0146.json` through `level-0150.json`, solved and separately replayed by the approved CLI in fresh processes. Manual station drags sometimes select the reverse endpoint of the equivalent swap; the table above records the actual gestures rather than pretending they were scripted trace playback.

Initial Task 8 production identity: `campaignBoot-aON2xW4f.js`, shared campaign chunk `campaign-DrijmSFQ.js`, service-worker cache `sliding-stars-next-92b6278dd0b9`, 94 offline files including all four wave WebPs and the optimization receipt. Typecheck/build passed; graph audit passed with 786 modules, 17 chunks and zero development campaign modules. Full suite passed 57 files / 462 tests at `--maxWorkers=1`. Manual play used the DEV preview at port 5175 from base `55cfc72` plus the Task 8 edits; the final remote-fixture footprint correction does not change these authored boards. Final proofs/full suite and this production build were checked after that correction. No production deployment or offline installation is claimed. Independent review subsequently found the wave delivery was cropped by the square cover resize; prior screenshots and receipt dimensions did not prove complete framing. The following fix supersedes that art/build identity.

### Task 8 review fix round 1 — 2026-09-26, base `893bc71`

The approved native source and exact source frames remain unchanged. All four waves now have a padded 832×832 square normalization canvas, uniform display aspect and manifest pivot; regenerated 256×256 deliveries preserve nose, fin/engine and full arrival trail. Implementer and controller each inspected all four actual WebPs. Transparent-border framing regressions and campaign presentation/event tests passed: 3 files / 20 tests. All four exit delivery SHA-256 hashes remained unchanged. Typecheck/build and production graph audit passed. The rule suite/proofs were not rerun for this mechanical art correction.

Controller actual phone-size check used IAB, fresh `campaign-preview=147&slot=controller-wave-art-fix1`, at **375×667**. Initial scheduled shuttle was complete and proportionate. Real drag **(2,3)→(2,2)** triggered the grouped arrival; controller captured a mid-animation arc/blended crew and then two clear SAFE guests, **1 move / 400 credits**. Real second drag **(2,2)→(2,1)** won **2 moves / 2 of 2 / 800 credits**, confirming usable presentation after arrival. No state injection or user save was used. This is controller evidence, not a second implementer play; no clean frame-by-frame peak shuttle video is claimed. Controller's IAB tab closed and temporary viewport reset.

Implementer's created Chrome preview initially timed out, reached the restored local server later, but did not yield a completed visual check. CUA timeout/reset changed per-isolate numeric browser IDs; subsequent exact-tab bindings timed out or failed request-header policy loading. Cleanup of only that created tab (`1814127342`, `http://127.0.0.1:5175/?campaign-preview=146&slot=task8-art-fix1`) and its temporary 375×667 viewport is **unconfirmed**. Controller could not close it because the browser session ownership guard correctly rejected cross-agent control. No user tabs were operated or browser restarted. Preview server session **26700**, port **5175**, remains available for review/Task 9.

Final corrected production identity: `campaignBoot-CZ7dA9Qg.js`, shared campaign chunk `campaign-BCoH3q5l.js`, service-worker cache `sliding-stars-next-8067f833576d`, **94 offline files**. Eight campaign sprites total **104,630 bytes**, four waves **42,676 bytes**. Production graph audit passed with **786 modules / 17 chunks / zero development campaign modules**. No hardware performance, offline install, deployment or full 1,000-level release claim.

## Task 9 - moonwhales, 2026-09-26

Base `d215142`. Implementer used the CUA in-app browser at local port 5175, isolated `?campaign-preview=<id>&slot=moonwhale-review`; controller used its own isolated slots. All listed moves are actual canvas pointer drags, not trace injection or state restoration. Coordinates below are zero-based row,column. Preview wallets began at 300 credits. Controller evidence is explicitly identified.

| Lesson | CSS viewport / cell target | Actual moves | Observed result |
|---|---|---|---|
| 186 demonstration | 375x667 / 88px | (0,1) to (1,1) | Real nearby merge caused the safe hop. Won in 1 move, 320 credits; separate SAFE guest at (2,0), happy empty whale at its next loop cell (1,1), Guide/Continue usable. Controller independently repeated this in `controller-whale-visual`. |
| 187 guided queue | 375x667 / 85.1942px | (0,1) to (1,1); (2,0) to (3,0); (0,2) to (1,2); (0,2) to (0,3) | Move 1 queued the request, RIDING guest remained on the whale and amber HOP QUEUED mark remained at (3,0). Reload retained 1 move / 350 credits / request. Move 3 visibly ready beside the mark. Move 4 won, 510 credits, SAFE guest ashore, empty whale continued one loop step. |
| 188 independent safety | 375x667 / 88px | Rejected whale drag (1,0) to (1,1); then (0,1) to (1,1); (1,2) to (2,2); (3,0) to (3,1) | Rejection kept 0 moves/300 credits. Real merge queued the request; unsafe LAND retained the rider. Reload at 1 move/320 credits preserved RIDING and HOP QUEUED. Through the Guide, Reduced motion changed 0 to 1. Second and third moves played with it enabled, created marked safe terrain and won in 3 moves/390 credits. Guide later showed Reduced motion=1; final guest SAFE at (3,1), empty happy whale at (2,0). |
| 189 independent pod | 320x568 / 71.8447px | (0,2) to (1,2); (0,3) to (1,3); (0,1) to (1,1); (0,1) to (1,1) | Initial complete whale and separate saddle rider, full loop/next arrow and marked pod fit. Request waited for the loop position, then won in 4 moves/450 credits. Final SAFE rider visibly in the original marked pod at (3,1); Guide > Inspect crew showed `whale-guest`, row 4 column 2, safe, `Passenger of tile-3-1`. All footer controls remained visible and usable. |
| 190 familiar rover combination (controller) | 390x844 / 88px | (3,2) to (3,3); (2,2) to (3,2); (0,1) to (1,1); (1,2) to (1,3) | Fresh `controller-whale-pair`: move 1 actually rescues the rover guest (home 1/1,500 credits). Whale guest remains RIDING through the station-door vicinity. Move 3 queues transfer at (3,0), whale at (2,0),550 credits. Immediate reload preserves 3 moves/550/request/rider. Move 4 wins both goals,580 credits; SAFE guest at (3,0), empty whale at (1,0), controls enabled. |

Art/presentation: controller independently inspected all four actual 256px WebPs (`idle`, `ready`, `waiting`, `complete`) and found full tails/flippers/body/accents with transparent margins, coherent saddle position and recognizable expressions. The implementation uses complete 627px source cells on uniform 800px square canvases, a shared pivot and uniform scale; the original source/provenance/prompt are tracked under `public/art/campaign/moonwhales`. Waiting uses amber landing and explicit contextual text, not expression alone. Screenshots inspected inline show the actual separate rider, clear route closure and direction, queued/ready/completed states. Idle breathing carries the rider with the saddle and is disabled by reduced motion. Transfer presentation follows the one typed transfer event; engine tests verify no duplicate move for that hop and event-projected pod reciprocity.

Boundary: immediate post-drag UI text can already show the saved final state while the canvas animates. Both those intermediate captures and later settled screenshots were inspected; no frame-by-frame video, measured frame rate or physical-iPhone performance is claimed. The controller's 190 rule/content evidence preceded the final harmless idle/copy additions; implementer subsequently inspected those additions while playing 187-189. The Guide's moonwhale rule paragraph and restored UTF-8 symbols were inspected after correcting an intermediate PowerShell encoding regression.

Both agent-created IAB tabs were closed and temporary viewports reset. No user save or tab was operated. No deployment/offline-install/full-campaign-completion claim. Fixed chapter assembly remains Task 27; these five reviewed lesson seeds are development fixtures.

| Proof | Moves | Initial hash | Final hash | Separate replay process |
|---|---:|---|---|---:|
| 186 | 1 | `441ffb0775805357` | `29ac5995c04b7216` | 15944 |
| 187 | 4 | `959be478124c6574` | `75fe315657d86a2e` | 5208 |
| 188 | 3 | `060680baa0867675` | `09f01e716ce710c5` | 34696 |
| 189 | 4 | `a1a1105a0453a1f0` | `c55c09ff7adf1b9d` | 43168 |
| 190 | 4 | `6aeca4cfd91ecbb5` | `0950bf4ee910ee3c` | 42996 |

Every final proof was produced by a genuine `solve.mts --lesson ID` search (no supplied trace), including its own fresh child replay, then replayed again by a separate `replay.mts --input` invocation. The first draft of 190 started its rover at a station door and rescued on load; self-review moved that rider/rover to (3,1), then re-searched, separately replayed and manually played the final version above. Proofs and separate replay receipts are under `validation/campaign`.

Final Task9 build: `campaignBoot-yk31PsMA.js`, shared `campaign-84A3OxEK.js`, cache `sliding-stars-next-8119121196c2`,98 offline files.12 campaign sprites/155078bytes total; four moonwhales/50448bytes. Typecheck/build and production graph audit passed (787 modules,17 chunks,zero development campaign modules). `moonwhales-build-audit.json` verifies each whale delivery hash in dist and offline inclusion. Final focused31/31 passed. One full suite produced497 passing tests and one unchanged aggregate legacy generator30s timeout; an isolated retry also timed out. Controller authorized splitting that same correctness loop into70 named cases with identical assertions/default5s each; all70 passed (29.58s total test time). No timeout increase, level reduction, legacy source change or second full-suite run. The exact chronology is in the Task9 report. This is one internal mechanic slice, not a deployment or full1000-level release.

## Task 10 — moon-pup herding, 2026-09-26

Base `28defc8`. Four implementer IAB sequences and one independent controller sequence were actual canvas pointer drags, using isolated DEV preview slots at port 5175. Coordinates below are zero-based row,column. No trace injection, hidden-state restoration or user save modification. Browser-scoped phone viewports were coordinated, then reset.

| Lesson | CSS viewport / cell size | Actual pointer moves | Observed result |
|---|---|---|---|
| 231 demonstration, implementer `task10-231` | 375×667 / 88px | (0,1)→(1,1), (0,1)→(1,1) | One safe paw step per turn, next-direction arrow and contextual copy restored. Won 2 moves / nursery 1/1 / 350 credits. Happy seated pup remains beside nursery with COZY label. Reload preserved completion/moves/credits and enabled Guide/Continue. |
| 232 guided, implementer `task10-232` | 375×667 / 85.1942px | (0,1)→(1,1), (1,3)→(1,2), (0,0)→(1,0) | Longer safe row required three actual turns. Won 3 moves / nursery 1/1 / 370 credits; full nursery/paw art and controls fit. |
| 233 independent detour, implementer `task10-233` | 375×667 / 88px | (0,1)→(1,1), (1,1)→(1,2), (1,1)→(1,2), (2,0)→(2,1), (3,0)→(2,0), (1,2)→(0,2), (0,1)→(1,1) | After move 1, WAIT face/text and temporarily unsafe nursery visible; no unsafe shortcut. Guide Reduced motion 0→1, then waiting reload retained 1 move/320 credits. Remaining six moves with reduced motion; safe route available after move 4, waiting again after move 5, rebuilt after move 6. Won 7 moves/560 credits/1 nursery. |
| 234 independent irregular, final implementer `task10-234-v2` | 390×844 / 88px | (0,2)→(1,2), (1,0)→(1,1), (2,0)→(1,0), (0,2)→(1,2), (2,0)→(2,1), (2,3)→(1,3), (3,2)→(3,3) | Fresh corrected authored start inspected, one paw step after move 1, waiting after move 2 and still WAIT after move 6; rebuilt path arrived on move 7. Won 1/1 / 660 credits. The prior draft triggered initial recovery shuffle; its row and trace were corrected before this accepted play. |
| 235 familiar rover pair, controller `controller-pup-pair` | 390×844 / 88px | (0,1)→(1,1), (1,2)→(1,3), (3,2)→(3,3), (3,1)→(3,2) | Move 1 rescued rover crew (home 1/1,520 credits), pup at (2,0), nursery 0/1. Move 2 pup at (2,1),2 moves/550; reload preserved pup/count/550/home1/nursery0. Move 3 pup at (2,2), move 4 won both goals / 4 moves / 550 credits. Full nursery/happy seated pup/COZY and enabled Guide/Continue clear. |

Additional smallest-phone inspection at **320×568**: saved completed233 retains happy nursery and full footer/goal; Guide visibly shows Reduced motion=1 after later reload and contains the explicit pup rule paragraph. Fresh active234 `task10-small-234` has approximately71.8447px cell targets, clear WAIT/PAWS direction cue, full nursery and all controls visible. An attempted invalid pup drag leaves0 moves/300 credits. No physical iPhone performance, frame time, installed PWA, frame-by-frame video or deployment claim. Immediate post-drag UI can show the already saved final turn while the ordered canvas animation runs; later settled screenshots/control checks confirm completion.

Original native pup sheet and newly generated original nursery, exact prompts and provenance retained under `public/art/campaign/pups`; five explicit source-backed frames compressed by existing Sharp pipeline. Full cells normalized to padded uniform squares with consistent pivots. Controller independently inspected all five actual delivery WebPs: complete ears/tails/paws/full nursery silhouette and readable doorway, coherent body/paw baseline, distinct lifted walking paw/tilted waiting/seated arrival, clear margins and no neighboring frame bleed. Walking and happy art are used by ordered movement/arrival interpolation; happy pup persists beside completed nursery, not an unused manifest state. Reduced motion disables idle/paw/arrival scale accents. WAIT text, route arrow and contextual copies are independent of expression.

| Final proof | Moves | Initial hash | Final hash | Separate replay PID |
|---|---:|---|---|---:|
| `level-0231.json` | 2 | `c103b448512a821f` | `d9ecfd456b01a001` |23568|
| `level-0232.json` | 3 | `7d01e9ec9b506d3f` | `4e127fbc361dde75` |35532|
| `level-0233.json` | 7 | `1ffb500524f34a40` | `75551bb2b362df9d` |35780|
| `level-0234.json` | 7 | `51b5b9f6cc172ba7` | `dfb1b54be2d27121` |13388|
| `level-0235.json` | 4 | `36879528857a09ee` | `d9cc4e63892069a0` |18504|

Five genuine searches used Task6 CLI, each including child replay, followed by separate fresh-process serialized proof replay; no booster or timeout passed as success. Proofs were originally written/replayed as `task10-ID.json`, then bounded-renamed with byte contents preserved to the established release-loader names above. 234 final proof supersedes its draft6-move search. Fixed chapter assembly remains Task27. Final focused29/29 and typecheck passed; final full-suite/build identity is recorded in the Task10 implementer report.

Cleanup: implementer's working IABtab2 closed and temporary viewport reset; controller's own235 IABtab19 closed/reset. Initial failed localhost-navigation tab1 became an idle error `data:` page; binding to close it was blocked by Browser Use URL policy. It is unmarked and expected to close automatically at turn end; no user tab was operated. Historical Task8 cleanup resolution received from controller: originalworker later closed only old Chrome previewtab1814127342, reset its Chromeviewport and verified absence; the earlier Task8 unconfirmed note is no longer outstanding.

Task10 final production validation: build PASS; graph audit PASS (788 modules,17 chunks,zero DEV campaign modules); cache `sliding-stars-next-de8f91e32f2e`,103 offline files, `campaignBoot-DZ3U4A5A.js` and `campaign-Bf_DKvKI.js`. All5 dist pup SHA-256 match shared receipts/offline entries,66686bytes; `pups-build-audit.json`. Final fullsuite602pass/1legacy-level53 default5000ms timeout (179.39s); exact unchanged isolatedcase also timeout5614ms (6.92s total). No second fullsuite, no timeout/source edits. DONE_WITH_CONCERNS for controller timing-budget decision; report contains exact commands.

Controller later ruled named legacy correctness cases retain original30s allowance; only70named-case test budget/comment amended, all inputs/solve100/assertions/source unchanged. Exact seed53 once now PASS1/81skip,8.11s total/tests6.91s (15:51:23). No second broad run or fresh all-green-suite claim; test-only edit leaves audited build identity valid. Task10 DONE; frozen for controller independent review/scoped commit in current thread.

## Task10 fix1 waiting-pup interpolation

Base12c47e5: narrow own-move/arrival accent guard preserves stationary waiting pose/offsets during unrelated terrain groups. Real Pixi regression RED2/2 then affected render/art GREEN14/14, typecheckPASS. Rebuilt cache `sliding-stars-next-81ebc10b6d71`/103files, `campaignBoot-_NLZYQoB.js`/`campaign-BnfOBPt2.js`; audit788modules17chunks0DEV. All5dist pup hashes/offline entries match unchanged receipts66686bytes. Implementer IAB unavailable,no tab/viewport changed; controller targetedcheck follows. No rule/fullsuite/proof/all5phone reruns. Full fix1 report beside brief.

Controller targeted actual play: fresh `controller-pup-fix1`, IAB21 at375?667. Real move1(0,1)?(1,1) produced waiting pup at(3,1),1move/320credits. Real move2(1,1)?(1,2),2moves/350credits; immediate Resolving screenshot shows unchanged tilted waiting pup/WAIT at(3,1), changed terrain and waiting context. After settling, Guide Reduced motion changed0?1; real move3 repeated(1,1)?(1,2),3moves/390credits; immediate Resolving screenshot again shows waiting pose/WAIT. Later AX controls usable/context waiting. Own tab21closed,viewport reset. This is a targeted screenshot/live pointer observation, not a whole win/replay or every-frame video claim; real Pixi regression supplies the frame-level guard.

Fix1 DONE/source and build frozen for bounded rereview in current thread; no new thread required.

## Task 11 orbital currents — September 26, 2026

Five authored current puzzles, five real pointer wins, all at 375×667. Implementer used a separate improved-app DEV server at 127.0.0.1:5181 and isolated preview slots `task11-276` through `task11-279`; controller independently played 280 on the existing improved server at 127.0.0.1:5175, slot `controller-current-pair`. These are browser phone viewports, not physical iPhone measurements. All actions below are zero-based (row,column), actual taps/drags on the rendered board, with visible goal/turn evidence; no engine dispatch or storage injection produced these wins.

| Lesson | Actual pointer actions | Observed result |
|---|---|---|
| 276 | (0,1)→(1,1) | One move, home1/1,520credits. Two-cell opposing arrows separately visible; rider follows its safe tile to the station; mint completion. An earlier invalid drag left0moves/300credits. |
| 277 | (2,3)→(3,3) | One move, home1/1,500credits. Station slides upward beside the next current stop; rider reaches its door after the shift. Four-cell closing edge clear. |
| 278 | (3,1)→(4,1) | One move, home1/1,600credits. Terrain merge first moves the rider, then the synchronized current carries it to the bottom station entrance. Tall silhouette and footer visible. |
| 279 | (2,3)→(3,3), (2,2)→(2,3), (2,1)→(2,2) | Three moves, home2/2,700credits. First move rotates both riders including last-to-first edge; second puts a station on the lane, visibly amber/waiting with home1/2. Reload retained2moves/500credits/waiting. Enabled Reduced motion in Guide, then completed final pointer action; controls recovered. |
| 280 (controller) | (0,1)→(1,1), (2,1)→(2,2), (1,1)→(2,1), (3,0)→(3,1), (1,1)→(2,1) | Five moves, transferred1/1 and home1/1,550credits. Move1 queued hop and shifted safe terrain onto LAND after whale movement; move2 station entered lane, amber whole-loop wait. Reload preserved2moves/320credits/whale rider/queued hop/station. Move3 cleared station and cyan current resumed; move4 whale returned beside safe landing; move5 completed both goals. Settled empty happy whale, mint current and usable Guide/Continue. |

All lesson solutions are causally current-dependent: replaying each exact committed trace with only the current environment hook disabled ends playing, never won. This audit caught draft bypasses in277/279; those drafts were replaced before final proofs and manual play. The five final puzzles teach a two-cell ride, station interception of a four-cell loop, merge then ride, two-rider six-cell waiting, and a current preparing a whale landing. Five different masks; demo276 uses the existing no-failure policy. Pairwise kernel tests also cover a newly transferred tile rider and pod passenger moving in that same turn after the whale steps, while a still-carried whale rider remains on the actor above moving terrain.

320×568 inspection: fresh279 `task11-small` shows all six directional edges, two crew, goals and controls. Enabled Reduced motion via Guide and played the actual first shift; both riders settled in the correct cells, turn1, controls enabled. 280 `task11-layout` inspected at375×667,320×568 and390×844. Controller found the original280 coach's third line overlapped buttons at375; shortened it and rechecked fresh screenshots at375/320 (two lines, no overlap). Generic279 copy also fits at320. Existing responsive layout regression covers at least40px targets across required dimensions; these teaching boards visibly exceed that minimum. No frame-by-frame video, native frame-time, physical iPhone, installation or deployment claim.

Four original native ImageGen frames retained under `public/art/campaign/currents` with exact prompt/provenance; source1254×1254 RGBA, explicit627-square frames, padded720-square canvas and stable pivot,128-square alpha WebP delivery. Controller separately inspected all four actual deliveries: complete rightward arrow silhouettes, margins, distinct cyan motion/amber wait/mint completion and no adjacent frame bleed. Board displays all closing edges; a two-cell cycle offsets its opposing directions. Moving frame and synchronized piece/rider group use authoritative events; reduced motion disables the cosmetic phase pulse. Build receipt: `currents-build-audit.json`, four sprites16352bytes,21total campaign sprites238116bytes, all delivered hashes match production files and offline membership.

| Final proof | Moves | Initial hash | Final hash | Final independent replay PID |
|---|---:|---|---|---:|
| `level-0276.json` |1|`94c56df1456c150b`|`a6ef25926df331b2`|33240|
| `level-0277.json` |1|`7fe3de9ed13a5c1a`|`8e906feaf30d1a31`|34212|
| `level-0278.json` |1|`51795d48d32e38bb`|`bce41d46f456fa0b`|10816|
| `level-0279.json` |3|`1bfd6e16ab138d17`|`5931b0405fcf48cd`|32608|
| `level-0280.json` |5|`b046a9b139e30680`|`8ffd7391f2134d39`|22536|

Each proof was found through the real Task6 solve CLI and replayed in its child process, then replayed again from serialized JSON in the independent processes above. No timeout treated as success. Current/pod projection test exposed stale pod passenger membership after home rescue; scene crew events now maintain carrier reciprocity, with actual pairing regression green. Focused31/31, final typecheck PASS, one final fullsuite `npm.cmd test -- --maxWorkers=1`:71files/639tests passed in91.99s with no concurrent browser/solver. Production build PASS; graph789modules/17chunks/zeroDEV campaign modules; cache `sliding-stars-next-4ea1407e6b95`,107offline files, `campaignBoot-ByYV3m-z.js` and `campaign-DC2OmXqY.js`.

Cleanup: implementer closed its mistaken5173 navigation tab without gameplay interactions, then its correct5181 tab, and reset viewport; stopped only its own5181 DEV process. Controller280 tab closed/reset. Parent source/production server, save namespace, controller plan and deployment untouched. Strict50-definition chapter assembly remains Task27; no filler chapter was fabricated. Next step is controller review/scoped commit in the current task; no new task required.

## Task 12 pirate drones — September 26, 2026

Five real pointer wins on established improved DEV server http://127.0.0.1:5175/, own isolated slots task12-326 through task12-330. Zero-based gestures below were actual CUA drags on the rendered board. No browser storage injection or engine dispatch produced a manual win. Browser viewport evidence is separate from physical iPhone measurements.

| Lesson | Viewport | Real gestures | Visible outcome |
|---|---|---|---|
|326|375×667|(0,1)→(1,1), reload, (1,2)→(2,2)|One-point distracted state,350credits and1move preserved after reload; second gesture wins Intercepted1/1,390credits,2moves and returned parcel mark.|
|327|375×667|(1,0)→(1,1), (1,0)→(1,1)|Two separate adjacent combinations:2→1→return,50points/350credits,2moves, clear dock route and goal.|
|328|390×844|(4,1)→(4,2), (3,1)→(4,1), (3,2)→(4,2)|After move2, station blocks next route stop:1/2 WAIT, warning pose and full contextual text. Actor/parcel remain at(4,0), no overwrite. Move3 wins,590credits,3moves.|
|329|320×568|(1,1)→(1,2), (1,0)→(2,0)|Whole irregular board, arrows, supply dock, counters and all three controls fit. Cascade on second move makes two genuine adjacent distractions, wins Intercepted1/1,440credits,2moves.|
|330|375×667|Guide→Reduced motion checkbox on→Close; (0,1)→(1,1), (1,3)→(2,3)|Reduced motion actual preference1 shown, second gesture cools reactor and returns parcel,390credits,2moves, goal1/1, controls recover. No console errors/warnings.|

Each final winning trace is causally dependent on pirate onMerge: replaying the same actions with only that effect disabled never wins and leaves intercept progress0. Separate focused pair case exercises one real match simultaneously cooling cool-reactor and distracting pirate-0, before either scheduled clock; existing reactor damage/environment semantics are preserved. Five different masks/purposes teach practice adjacency, following a moving drone, its bottom route turn, missing corners/cascades and the familiar reactor match boundary. The demonstration has no move limit and uses the approved explicit practice pause before its final dock stop. Both50 direct delayed steps and50 accepted nonqualifying station slides preserve a schema-valid parcel, playing status,2points and pre-dock stop; adjacent matches remain available.

Controller independently played frozen final330 at390×844 using the two final proof drags. Move1 showed320credits/1move, drone(3,2)2points, reactor3turns/1hit; reload preserved those values and contextual next-stop copy. Move2 won Intercepted1/1,390credits/2moves; reactor gone, mint dock with parcel/RETURNED, Guide/Continue enabled, whole board/footer fit. This is attributed controller evidence, not the implementer's sixth win.

Targeted normal loss/retry: separate slot task12-loss327,375×667. Actual legal drags: (0,1)→(1,1), (0,2)→(0,3), (0,0)→(0,1), (1,2)→(1,3), (0,0)→(0,1), (2,0)→(3,0). Initial300credits/0points. Move5 visibly showed the warning face,2points and "Dock next!" with430credits/130earned points. Move6 reached dock and lost,0/1intercepted,460credits/160earned points. The30credit difference is the ordinary match earning, with zero dock penalty. Guide immediately after loss: Demolition1owned, Wormhole1owned, Tractor0. Actual Try again dialog→Try again restored0moves,2points and original board immediately, preserving460credits and the same owned supplies in Guide. Focused session regression separately uses a genuine no-points station slide to assert exact unchanged wallet789credits/inventory2,3,4 and station possessions across dock loss/retry.

Visual refinement found the earlier "2/2 · DOCK NEXT" cell label extended past the right edge on327. Final label is compact "2/2 · !"; contextual "Dock next!" remains explicit in the footer. Both WAIT and near-dock share the actual warning frame; waiting poses never bob or change during unrelated groups. Full source627-square cells remain padded; explicit canvas placements align the chassis, common pivot(.5,.53) and uniform square display. Four compressed frames directly inspected plus48/72pixel contact sheet pirates-game-scale.png. Returned texture and independent parcel travel use only the typed return event; interpolation tests cover that motion and reduced motion, with persistent return dock derived from unique interception IDs. No frame-by-frame video or claim that every transient frame was captured.

Actual browser checks include interrupted/reloaded state, blocked/action/completion states, reduced motion,320×568 fit,390×844 fit and immediate retry. No physical iPhone, hardware frame-time, install or deployment claim. Own tab1 closed and viewport reset; controller's own27 also closed/reset. No new server started; established5175 and user services preserved. Strict chapter assembly remains Task27. Next step is controller review/scoped commit in the current task; no new task required.
# Task12 final verification chronology

After independent controller final330 actual phone acceptance and browser release, the sole final full suite `npm.cmd test -- --maxWorkers=1` passed75 files/698 tests in72.91s. Final self-review then exposed a valid homeCrew-only simultaneous rescue/dock loss edge. Its genuine RED regression failed28/29 because later goalsComplete overwrote the dock loss and runtime parsing threw. Controller approved a narrow outcome guard preserving terminal loss and skipping unresolved need ticks; ordinary rescue-before-needs victory remains covered.

Post-guard focused transition/terminal/pirate/reactor-pirate/session/render command passed6 files/72 tests, followed by typecheck, build and independently recomputed asset/cache audit. No second full suite or unaffected proofs/manual replay ran. Final cache is sliding-stars-next-2e637a669c84 (111 files); all four pirate delivered hashes match receipts and service-worker membership, with sources/proofs excluded. Full exact commands, paths, proof hashes/actions and limits are in `H:/Projects/iPhone Apps/sliding-stars/.superpowers/sdd/2026-09-26-thousand-level-campaign/task-12-report.md`. Next step is controller review/commit in this current task; no new thread required.

# Task 13 — paired portals (2026-09-26)

Implemented against reviewed base7a50bf3. Real IAB pointer play used existing DEV5175 and isolated slot portal13-a. Owned tab closed and viewport reset before the sole full suite. No parent source, user4174, installation or deployment changes.

| Lesson | Viewport | Actual zero-based drags and visible result |
|---|---|---|
|376|375×667|Pod(2,1)→(2,0), then(2,3)→(2,4). Entry waits with its guest, then crossing/fall wins Crew home1/1,520credits,2moves.|
|377|375×667|Pod(2,2)→(2,1)→(2,0), then(2,4)→(2,5). Shelf routing wins Crew home1/1,520credits,3moves.|
|378|390×844|Pod(4,1)→(4,0), then(0,3)→(0,4). Tall receiving lane wins Crew home1/1,550credits,2moves. Reload retains exact win/credits/moves, arrival art and enabled Guide/Continue.|
|379|375×667|Guide→Reduced motion checkbox value1→close. Station(2,1)→(2,0), then(1,4)→(2,4). Station travels to the waiting guest; Crew home1/1,520credits,2moves.|
|380|375×667|(0,2)→(1,2) puts capsule+rider at waiting IN; (0,5)→(1,5) clears OUT and departs. Evacuated1/1,370credits,2moves. Shared OUT/EXIT label collision was found, fixed with top/bottom labels, and re-inspected before this win.|

All five final traces are causally dependent on portal beforeRefill; disabling only that hook never wins. Receiver occupancy covers tiles, pods, stations, unrelated crew, actors, blocking fixture footprints and inactive cells. Riders preserve ownership and actor passengers stay aboard their actor. Transfer once per piece survives every settling phase; historical IDs are distinct from the sole per-transition guard. Real capsule/exit pair verifies waiting, transport before departure, save/reload equality and victory on final move expiry. Fifty actual accepted delayed demo slides retain a safe boarded guest and can still complete.

At320×568, inspected both final380 seven-column layout and378 tall layout: whole boards, numbered markers, direction arrows, counters, coach and footer controls fit. Smallest seven-column tile48.48CSSpx at375,50.55 at390,40.88 at320. No console warning/error messages in owned tab. Four actual compressed states and48/72px contact sheet inspected; full transparent silhouettes/pivots retained. Portal arrival art persists after victory/reload, with prior dock/nursery/exit projections preserved. No physical-iPhone or frame-time claim, and no frame-by-frame video capture.

Controller independently played frozen380 at390×844: first drag showed320credits and waiting capsule+rider at IN with occupied OUT; reload retained those values. Second drag won evacuated1/1,370credits,2moves, distinct OUT/EXIT and enabled Guide/Continue. Controller closed its owned31/reset viewport. This is attributed controller evidence, not an implementer sixth win; see controller-portal-pair.md beside the task brief.

TDD: exact command initially hit dependency-config EPERM, then exact escalated semantic RED failed10/10 for missing transfer/wait and save topology/history behavior. Initial GREEN10/10. Expanded focused34/34 plus typecheck passed. Sole full suite maxWorkers1:77files passed,1failed;737/743tests passed in86.29s. Six failures were stale shared teaching assumptions (eleven spans, no initial pod boarding, every fixture removed). Bounded update retains all initial piece data except legitimate reciprocal pod boarding and requires permanent portals unchanged. Final focused4files/133tests passed; explicit reciprocal ownership lessons-only97/97 then passed. No second broad suite.

All five real CLI searches solved and auto-replayed in fresh processes. Earlier bounded377 search timed out, then smaller genuinely wide shelf solved; bounded378 metadata refresh at1000nodes timed out, established15000 budget solved. Timeouts were never counted as proofs. Final independent serialized replay PIDs8676/12164/22432/44884/9484 all won with no issues. Standard proofs level-0376..0380.json and exact hashes/asset receipts are retained in portals-build-audit.json.

Final build115files, cache sliding-stars-next-42ebae2334cd; four portal sprites45,014bytes, actual dist/source hashes and alpha checked, all four service-worker entries confirmed, source/proofs excluded. Preserve v3 native source/prompt/provenance only; rejected v1/v2 checkerboards never integrated. Shared no-partial-chapter staging remains Task27 responsibility. Full report: H:/Projects/iPhone Apps/sliding-stars/.superpowers/sdd/2026-09-26-thousand-level-campaign/task-13-report.md. Next step is controller review/scoped commit in this current task; no new thread required.
# Task 14 — fold-out bridges (2026-09-26)

Final gate: sole `npm.cmd test -- --maxWorkers=1` passed81 files/774 tests in74.98s with browser/solver idle. Final typecheck and production build passed. Independent audit recomputed cache `sliding-stars-next-9b27f6575c3f` from all119 dist files; all cached, four bridge hashes equal Sharp receipts, sources/proofs excluded. Source frozen for controller review.

Reviewed base b546a4b. Implemented in improved app only; existing DEV5175 used, user4174 untouched. Five real IAB pointer wins, without boosters:

|Lesson|Viewport|Zero-based pointer drags and observed result|
|---|---|---|
|426|375×667|(0,1)→(1,1), (0,0)→(1,0). One-charge reload retained 1 move/320 credits and absent cell. Final Restored1/1,2 moves,350 credits. Repeated in isolated bridge14-animation slot to capture final folded/charged/unfolding/open art.|
|427|375×667|(0,1)→(1,1), (1,2)→(1,3). Two-cell shelf opens; Restored1/1,2 moves,350 credits; synchronized true and Guide/Continue enabled.|
|428|390×844|(0,1)→(1,1), (1,2)→(2,2). Tall two-cell extension opens; Restored1/1,2 moves,390 credits;88px cells, full board and controls visible.|
|429|375×667|Guide→Reduced motion checkbox→close; (0,2)→(1,2), (1,3)→(1,4). Both separate hinges light once, then open; Restored2/2,2 moves,350 credits.|
|430|375×667|(3,0)→absent(3,1) rejected with0 moves/300 credits. Winning drags (0,1)→(1,1), (1,2)→(1,3), (3,3)→(3,4). Rover visibly waits before opening, then carries its guest through the newly active cell. Reload immediately during opening presentation retained Restored1/1,2 moves,380 credits, rider on rover(3,1), enabled controls and permanently open/refilled cells. Final Crew home1/1+Restored1/1,3 moves,580 credits.|

430 resized during final presentation to320×568: after normal resize recovery,57.364px cells, full board, Guide/Continue and both goals fit. A transient resize screenshot preceded settled layout; the settled and post-reload screenshots confirm fit and synchronized true. Reload retained3 moves/580 credits with no duplicate payment.375×667 five-column cells68.023px;427 four-column cells85.194px;426/428 cells88px. These exceed the40px required hit-target floor.

Original native art: supplied long-span concept used as style reference, then generated four independently framed single-cell assets. First RGB checkerboard output rejected; native correction produced actual RGBA with1,081,589 fully transparent pixels. Source, exact prompts, reference and provenance retained under public/art/campaign/bridges. Existing Sharp script delivers four256px WebPs; inspect bridges-game-scale.png for48/72px silhouettes. Hinge stays fixed at authored switch; open footprint has one floor panel per real cell, with terrain raised slightly to reveal rails. Typed geometry and bridge events share the actual activation group; no extra rule execution or board resizing. Folded footprint, one-light cue, unfolding frame, final panel and reduced motion inspected. No claim of frame-by-frame video inspection.

Evidence: validation/campaign/bridges-folded-375.png, bridges-charged-375.png, bridges-opening-375.png, bridges-open-375.png, bridges-430-320.png and bridges-game-scale.png. Browser screenshot evidence is real pointer play; tests additionally cover canonical scene projections, anchored panels and cancellation to saved final geometry. One-charge and opened saved states are parsed and replayed deterministically. Each of the five traces fails to win with the bridge effect disabled.430 common boundary exercises the permitted rover route through initially inactive cells; currents overlapping a bridge are rejected.

CLI solve genuinely searched every lesson using maxNodes10000/maxDepth12/maxMilliseconds20000, wrote level-0426..0430.json, and launched a fresh replay process for each (PIDs9228,19748,42072,8340,44508). Actions counts2/2/2/2/3; proof hashes recorded in task-14-report.md. Teaching content remains in reviewed lesson-seeds.ts plus serialized proofs; full chapters are Task27. No invalid partial chapter or filler created.

Own IAB tab1 closed and viewport reset before the sole final maxWorkers1 suite. No deployment, physical iPhone, hardware performance, installation or complete1,000-level-release claim. Next step is controller review in this current task; no new task required.


### Task 15 shelter requests (2026-09-26, DEV 5175)

Actual CUA pointer play in one owned IAB tab, isolated `task15-phone` preview slots. No engine calls or storage injection drove the play. This is desktop browser viewport evidence, not physical iPhone performance.

- 471, 375x667: four accepted pointer swaps won. Isolated upper crew alcove first builds safe ground; settled activation displayed house 20. Guide inspection reported oxygen safe / shelter 20. Reload at move 1 preserved that count, guest position and displayed 390; remaining three pointer moves completed the home and showed the green completed badge. The no-failure demonstration intentionally pauses its clocks.
- 472, 390x844: two station drags won. Initial safe guest showed house 20; first accepted ordinary drag showed 19, second housed the guest and cleared the request.
- 473, 320x568: checked Reduced motion through the real guide checkbox, closed the panel and dragged the pod right, then down to the door. Two-move win; request showed 19 while riding. Controls stayed visible and usable. No hop/rotation is applied under reduced motion.
- 474, 375x667: genuine searched four-move pointer win. Initial display had one house 20 and one oxygen 20. First rightward swap built safe ground and displayed separate house 19 / house 20; mid-flight reload preserved move 1 and both badges. Downward guest swap housed the new guest, a further safe merge retained the other guest's allowance, and the station slide housed the remaining guest. This is not a manual alternative to its committed search trace.
- 475, 390x844: three station drags won. Existing finished shuttle art previewed the finite arrival; move 1 admitted the first labeled guest with house 20. Move 2 showed house 19 and explicit Waiting / free entry in the HUD and coach while the second arrival remained pending. Move 3 completed the first home and admitted/completed the second guest; both home needs cleared. No overwrite or premature victory occurred.
- Separate `task15-urgency` 472 slot, 375x667: reduced motion checked; fifteen real reversible station drags, each confirmed by the rendered move count, reduced the request to 5. Screenshot showed the amber house badge and earlier-deadline warning copy. An invalid non-neighbor drag left 15 moves and displayed value 300 unchanged. Reload preserved move 15 and the urgent state. A sixteenth real drag completed the request. These stress moves are not filler in authored teaching traces.

Waiting/unstarted, calm, urgent and completed badges inspected at actual cell scale; activation uses the original crew plus happy house/heart badge and a short reduced-motion-aware greeting. Wave anticipation/arrival reuse reviewed existing shuttle assets. Console errors/warnings were empty in the final urgency document. Test tab closed and shared viewport reset before the coordinated sole full suite. Tall three-column board actually inspected at 320x568; five-column board at 375x667. Layout's smallest target across these definitions at 320x568 is 57.36 CSS pixels (five columns), above the 40px contract; no hardware FPS, touch latency, installed-PWA offline readiness or complete 1,000-level release claim.


Controller-attributed independent phone check after the final build/source freeze: root actual-played 474 at390x844 through the four searched actions, no hints/boosters/storage injection or reduced-motion toggle. Move1 showed existing19/new20 and390; explicit reload preserved both counters and1move. Move2 housed the second guest, leaving18 and610; move3 left17 and690; move4 showed home2/2,910, cleared request badges and enabled Guide/Continue after presentation. Full board/footer fitted. Root closed only owned IAB40 and reset the shared viewport. This evidence was reported by the controller, not directly observed by this implementer; no every-frame/hardware inference.

## Task16 gardens - September26 2026

Base ec124aa; improved app only, existing DEV5175. No hints, boosters, storage injection, deployment or commits. Genuine searched teaching traces were played with actual pointer taps on the rendered board in owned IAB1.

|Lesson|Viewport|Actual pointer win and observations|
|---|---|---|
|516|375x667|Five moves, Delivered1/1,530 displayed credits. Inspected initial sprout, bud1/3, bloom2/3, mature3/3 and separate crescent cargo. Reload at move2 retained bloom2/3,380 and enabled controls. Cargo(0,1) to neighbor(0,0) rejected; move count stayed3/420. Cleared below cargo twice and watched exit completion.|
|517|375x667|Five moves, Delivered1/1,470. Two distinct actual merges in the second turn matured the plot. CROP WAIT and coach visibly showed blocked left output; third accepted swap cleared it and produced separate cargo without replacing terrain. Remaining two swaps delivered.|
|518|390x844|Six moves, Delivered1/1,530. Full tall board, output, exit and footer visible; actual three growth stages then tall gravity routing.|
|519|320x568|Five moves, Delivered1/1,530. Real Guide checkbox enabled Reduced motion before play. Irregular mask and labels readable, controls fit, actual growth/cargo/departure worked without decorative hop. Approximately75px cell pitch, above40px target floor.|
|520|375x667|Three moves, Supplies1/1+Delivered1/1,610. Visible crate3hits, opening, standalone harvest cargo and exit departure. Reload after win retained both goals,3moves/610, Guide+Continue enabled; no duplicate payment.|

Cell pitch observed on screenshots: approximately88px at516,72px at517/520,92px at518,75px at519. Four source frames share410-412px planter footprint and bottom463 on512px canvases/pivot(.5,.9); no equal-growth-height normalization. Four stages and standalone crop remain distinct in gardens-game-scale.png (48px and72px). Soft source glow retains true alpha; dark-board edges visually inspected. Root independently inspected the five optimized assets statically; phone claims above are implementer's actual UI observations, not inferred from root static review.

Final520 document console warnings/errors empty. Owned tab closed and shared viewport reset before sole full suite. No physical iPhone performance, installed-PWA offline, every-animation-frame or complete1000-level claim. Build/cache audit confirms five256px alpha deliveries89648bytes cached, raw source and development proofs excluded.

## Controller independent520 actual phone play
Frozen final Task16 source on baseec124aa/cache d18df4b3706d, DEV5175 ownIAB42 isolated controller16-garden520. Initial creation briefly used desktop layout; before any action, viewport set and settled at390x844 (read-only DOM canvas/viewport confirmed390x844). Actual three searched pointer moves, no hints/boosters/injectedstate or reducedmotion toggle.
Initial300/0,garden0of3,crate3hits,goals0/1+0/1. Move1(0,1)->(1,1):350/1,garden1of3,crate2hits. Explicitreload retained stage1/crate2/350/1 and usable controls. Move2(1,2)->(1,3):460/2,supplies1of1,crateabsent,garden3of3 and actualcrescentcargo atmarkedoutput(0,2); coach explains matchbeneath/no directslide. Move3(3,2)->(3,3):610/3,bothgoals1of1,cargodeparted,DELIVERED marker/checkedEXIT1,GuideContinueenabled. Full4x5board/goals/footerfit; plot growth remains anchored and cargo visuallydistinct. Closedown42/resetviewport after settledwin. No every-frame, physicaliPhone or installedPWAclaim.

## Task17 keys and gates - September29 2026 completion

Base be4d44c, improved DEV5175. Original implementation worker reported lesson561 at375x667: actual three-drag win and explicit turn1/320/restored1 reload. This resumed worker did not repeat561 and attributes that observation to the original worker/controller handoff. Original worker also reported the initial misleading down-arrow cargo label and switch-anchored gate animation; both were fixed with regression RED/GREEN before these checks.

Resumed worker used CUA on an owned IAB2 and fresh isolated preview slots, with actual pointer drags, no hints, boosters or browser state injection:

|Lesson|Viewport|Observed result|
|---|---|---|
|562|390x844|All six searched moves; home1/1, restored1/1,550 credits. Numbered key/lock visible; correct key consumed, gate permanently open; station crossed its newly active route. Replayed fresh because prior worker's five-move tab was no longer available.|
|563|375x667|All three searched moves; home1/1, restored2/2,550. Two keys with separate numbered locks opened both gates; tall six-row board and footer fit.|
|564|320x568|All seven searched moves; home1/1, restored1/1,590. Enabled Reduced motion through Guide before play and verified checkbox Value1 after victory. Full board, gate aperture, Guide and Continue fit. Approximately60 CSS-pixel cell pitch.|
|565|390x844|All six searched moves; home1/1, restored2/2,620. After move1, bridge OPEN2/2 with real terrain on its footprint, gate CLOSED, key still present, restored1/2,350/1. Explicit reload preserved this partial geometry and controls. Move3 delivered key/opened gate, then station crossed the combined route to rescue.|

Separate existing DEV-only563 key-mismatch fixture at375x667: key2 visibly at LOCK1 with amber/red WRONG KEY signal, both gates CLOSED. Attempted direct key drag was rejected without turn/credit change. A real pod slide (4,1)->(4,0) was accepted; explicit reload retained WRONG KEY, both closed gates, restored0/2,300 credits and1move. This is a diagnostic fixture, not a claimed winning lesson or runtime state injection. Console warn/error query was empty before that accepted turn; no claim about every animation frame or physical hardware.

Whole key silhouettes and stable closed/open gate bases remained intact on the board. Screen-observed cell pitches were about74px at390,71px on tall375,60px at320 (all above40px). Original/root static inspection covered all four optimized alpha sprites; in-game observations above cover numbered idle keys, wrong-key warning and permanent closed/open gates. Owned gameplay2 closed and viewport reset before automated gates. An owned failed-start tab1 remained inaccessible to binding because browser URL policy rejected its generated data-URL error page; it had no running game and no viewport override. It was not bypassed.

Controller-attributed independent565 check on frozen source/cache5e6b086f7772: root played all six searched UI drags at390x844, no hints, boosters, injection or Reduced motion toggle. Move1 bridgeOPEN2/2/gateCLOSED/restored1/2/350/1 survived explicit reload with controls usable. Move2 showed370/2; move3 consumed key/opened gate/restored2/2/420/3. Station crossed bridge on moves4/5; move6 reachedhome1/1+restored2/2/620/6 with Guide/Continue enabled. Whole irregular17-cell board/footer fit; open gate posts stayed stable, terrain usable, and key number matched lock. Root reported no console warnings/errors, closed ownedIAB2 and reset viewport. This is root's independent observation, not direct observation by the resumed implementer.

## Task19 solar collectors - September29 2026

Base 93b8f17. Improved DEV at 127.0.0.1:5175. The implementer played the five genuine CLI-searched traces with actual pointer drags in isolated lesson-preview slots; no hints, boosters or browser-state injection. These are browser viewport observations, not physical iPhone measurements.

| Lesson | Phone viewport | Observed causal result |
| --- | --- | --- |
| 661 | 320x568 | One adjacent requested-tier merge charged the sleeping collector 1/1, opened the outlined entrance and housed the guest in one move. Reduced motion was enabled through the real Guide checkbox before play; the visible one-move win survived an explicit reload with Guide and Continue usable. Full board and controls fit. |
| 662 | 390x844 | The requested tier-2 merge charged 1/1 and opened the entrance; one actual drag won with home 1/1 and restored 1/1. Wrong-tier exclusion is covered by the semantic focused rule test. |
| 663 | 390x844 | Nine actual searched drags created two distinct nearby tier-1 merges. The collector reached 2/2, the marked entrance changed to HOME and the guest was housed: home 1/1, restored 1/1. |
| 664 | 390x844 | On the stepped mask, move 1 charged 1/2 and left the outlined entrance LOCKED. Move 2 charged 2/2, changed it to HOME and housed the guest: home 1/1, restored 1/1. Whole board and footer fit. |
| 665 | 390x844 | Five actual searched drags combined collector charging with a reactor. After move 3 the collector was 2/2 and its entrance stayed active through an explicit reload; remaining moves routed the guest to the entrance and completed home 1/1 and restored 1/1. |

Settled win images are in `task-19/phone-661-320-reduced-win.png`, `phone-662-390-win.png`, `phone-663-390-win.png`, `phone-664-390-win.png` and `phone-665-390-win.png`; 661 also has start and reloaded win images. Optimized idle/charging/ready/pulse sprites and crisp tier/quota/LOCKED/HOME overlays remained legible at those sizes. The controller independently checked static sprite alignment after the final crop adjustment. Owned tabs were closed and the shared browser viewport reset before the sole full suite. No every-frame, device performance or installed-PWA offline-readiness claim.

Controller-attributed independent665 phone check after the frozen full gate: root used five actual drags at390x844, no hints/boosters/injected state. The collector was0/2 initially,1/2 at350/1; it stayed1/2 at440/2. At540/3 it was ready2/2 with Restored1/1, and the reactor was already visibly gone. Explicit reload retained ready2/2, the HOME entrance and a safe pod at(3,1). Fourth drag gave560/4 and remained ready; fifth rescued the guest, reaching home1/1 and790/5. Guide/Continue enabled; console warn/error query empty. Root closed its own tab4 and reset the viewport. This is root's independent observation, not direct observation by the implementer.

Root's readability observation for independent review: board charge badge is text-only `T1 · 0/2` and so on. Coach says `tier 1`; Guide says the specific terrain tier and names the legend, but there is no requested-terrain thumbnail. The approved design requires an unmistakable tier icon. This observation is recorded as a review concern; source remains frozen pending the reviewer decision.
## Task19 solar visual review fix 1 — September29 2026

After independent review on fix base 88cc949, the implementer replaced the tiny tier-only indicator and horizontal charge dots with an actual requested-terrain tile icon, legible terrain name strip and filled/empty charge ring. These are real local DEV browser captures at phone-sized viewports; semantic rules, lessons and saved searches did not change. No hint, booster or browser state injection produced the observed charge.

| Final-source capture | Actual observation |
| --- | --- |
| 661 / 320x568 and 390x844 | Void tile icon, VOID name and empty 0/1 ring fit with board/footer (`fix1-final-661-320-idle.png`, `fix1-final-661-390-idle.png`). |
| 662 / 320x568 and 390x844 | Debris tile icon, DEBRIS name and empty 0/1 ring fit; saved 390 one-move win displays full 1/1 ring and HOME (`fix1-final-662-320-idle.png`, `fix1-final-662-390-idle.png`, `fix1-final-662-390-ready.png`). |
| 664 / 320x568 | One actual drag in a new isolated slot yielded 1/2 ring, 320 credits / 1 move and LOCKED entrance; existing saved two-drag win yielded 2/2 full ring, HOME, home1/1/restored1/1. Explicit reload retained full ring, HOME and 2 moves (`fix1-final-664-320-half.png`, `fix1-final-664-320-full.png`, `fix1-final-664-320-reload.png`). |
| 664 / 390x844 | One actual drag in a new isolated slot yielded a stable 1/2 ring, LOCKED entrance, 320 credits / 1 move; existing saved two-drag win displayed full 2/2 ring, HOME, home1/1/restored1/1 (`fix1-final-664-390-half.png`, `fix1-final-664-390-full.png`). |
| 661 / 320x568 reduced-motion reload | Existing saved one-move win reopened as full 1/1 ring, HOME, home1/1/restored1/1. Guide's real Reduced motion checkbox was Value1, and its requested Void image had accessible alt text and named tier/quota/count (`fix1-final-661-320-reduced-reload.png`, `fix1-final-661-320-guide-reduced.png`). |

Earlier `fix1-*.png` files without `final` preserve the pre-name-strip visual chronology; the final-source images above carry visual acceptance. Root independently inspected final 661/662 320 idle plus 664 390 half / 320 full screenshots from disk, reporting identifiable icons/names/rings, intact art and a fitting board/footer. This is attributed static inspection, not new root pointer play. The implementer closed its owned Chrome tab and reset the shared viewport. No physical-iPhone, every-frame or installed-PWA claim. Next step is controller scoped review/commit in this task; no new thread is needed.

## Task 20 friendly space jelly - September 29 2026

The implementer played all five CLI-searched teaching traces by pointer drag in isolated Chrome lesson-preview slots on local DEV at `127.0.0.1:5175`. No hints, boosters or browser-state injection produced these wins. These are viewport observations, not physical-iPhone measurements. The final narrow timing correction moved jelly spread from the environment hook to finalization; all five original traces subsequently passed fresh-process replay under that corrected engine. The root's independent final-source play is separate.

| Lesson | Viewport | Actual observed result |
| --- | --- | --- |
| 711 | 390x844 | Three drags won. The next-target warning changed from SPREAD 1 to an actual coated cell on move three; the crew reached home 1/1. |
| 712 | 390x844 | Three drags routed around the left-side jelly and won home 1/1. The independent preview marker remained legible beside the jelly illustration. |
| 713 | 390x844 | Three drags won home 1/1 on the taller board; the jelly body, preview and board edges remained visible. |
| 714 | 390x844 | The board began with one coating. The first drag made an adjacent combination and visibly cleared it. Reload after move one retained the cleared cell, saved preview and usable controls. The second drag won home 1/1. |
| 715 | 390x844 | Three drags won home 1/1 with the reactor and jelly together. The ordinary terrain remained recognizable under the coating. |
| 715 | 320x568 | The full board and bottom controls fit; measured cell pitch was about 53.6 CSS px. Reduced motion was enabled through the real Guide checkbox before three pointer drags won. The settled board showed CLEAR over the jelly source. Reload retained the three-move win with Guide and Continue usable, and the Guide's Reduced motion checkbox still read Value 1. |

The actual background-composited sprites showed no checkerboard matte. A raw isolated WebP view had suggested gray square patches, but decoded samples at those locations had alpha 0; visible cream sparkle pixels were intentional art. The ready state's detached droplet remained intact after main-body pivot alignment. The board uses a separate rule-driven target outline, so the droplet does not mislead the predicted cell. On a completed board where crew overlaps the jelly source, the source illustration yields to the crew and the CLEAR label remains readable. Browser preview tabs were closed and the shared viewport override reset before the sole full serial test gate. No installed-PWA offline-readiness or hardware-performance claim is made. The next step is controller independent play and scoped review in this task; no new thread is needed.

Controller-attributed independent 711 check on frozen final source: root used the three actual searched pointer swaps at 390x844. Move one showed 350 credits, one move and SPREAD 2. Move two showed 510 credits, SPREAD 1 and an amber forecast on `(1,2)`; explicit reload preserved 510/2, the same forecast, a safe guest at `(4,1)` and usable controls. Move three reached 740/3 and home 1/1; coating appeared at exactly the predicted `(1,2)` while terrain remained readable, and the guest departed. Guide and Continue were enabled, with no console warnings/errors. Root saw no matte or body-alignment defect, closed its own tab and reset the viewport. The controller's fuller direct record is `controller-jelly-manual.md` beside the Task 20 brief. The generic footer text and terminal CLEAR wording are observations for broader teaching/UI review, not evidence of a rule failure. Next step is controller scoped review and commit in this task; no new thread is needed.

### Task 20 fix 1: reauthored jelly teaching and recovery

The implementer used actual pointer drags matching the new saved CLI traces in separate local DEV preview slots. These are browser viewport observations; no hints, boosters, injected state, screenshot files, physical iPhone or installed offline run were used. Earlier Task 20 phone observations above describe the prior authored boards and do not verify these revised lessons.

| Lesson | Viewport | Observed corrected-board sequence |
| --- | --- | --- |
| 711 | 390x844 | Five drags won home 1/1. At move 2 SPREAD 1 marked the next tile amber; move 3 coated `(1,2)` while still playing. Explicit reload retained turn 3, that coating and enabled controls. Move 4 cleared it; move 5 housed the guest. |
| 712 | 390x844 | Four drags won. The initial `(2,2)` coating was visible, cleared on move 1 and its tile could be used on move 2. Move 3 placed a new coating before the rescue on move 4. |
| 713 | 390x844 | Four drags won on the tall mask. Move 3 placed a visible coating at `(2,1)` while the guest remained active; the final drag took an alternate route to home. |
| 714 | 390x844 | Four drags won on the stepped mask. The initial `(4,2)` coating survived the first two moves; move 2 showed SPREAD 1. Move 3 visibly cleared the coating without a replacement spread, and reload retained the cleared tile and SPREAD 3. Move 4 used the reopened cell to rescue. |
| 715 | 320x740, Reduced motion checked in Guide | Five drags won. The reactor stayed present through two moves. Move 3 erupted, leaving one cooling hit, and jelly coated `(2,2)` before victory. Move 4 cleared that coat and removed the reactor; move 5 rescued. The seven-row board, source art and footer fit. |
| 715 | 320x568 | The final seven-row board, forecast, reactor label, header and all three footer controls fit. Five actual drags repeated the turn-3 eruption/coating, turn-4 clear/cooling and turn-5 home 1/1 win. This is the binding narrow viewport check for the revised 715, separate from the 320x740 reduced-motion play. |

The optimized jelly body/droplet and independent target marker remained legible against ordinary terrain during these plays. The completed 715 board still uses the existing terminal `CLEAR` caption even with source artwork visible, the minor wording issue already noted in review. Browser logs showed no gameplay exception; a Chrome extension message-channel error appeared after reload/navigation and is not attributed to the game. The implementer closed its own tabs and restored the default shared viewport before the earlier serial full-suite run.

Controller-attributed independent 715 check on the pre-amendment frozen source: root played the same five pointer drags at 390x844. At move 3 the reactor expired to one cooling hit while jelly coated `(2,2)` and the guest remained active; explicit reload retained the reactor, coat, preview, guest and enabled controls. Move 4 cleared the coat and removed the reactor; move 5 reached home 1/1, 640 credits and a settled Continue button. Console warn/error collection was empty. Root closed its tab and reset the viewport. The full root record is `controller-jelly-fix1-manual.md` beside the Task 20 brief. The later practice-only safeguard and peel settling did not change normal 715's definition, event rules or renderer, and its final serialized replay still wins; this is attributed earlier phone evidence, not a new final-source root play.

Final amended 711 phone check: after the practice-route guard and before the later peel-settle correction, the implementer repeated the five actual searched drags at 390x844 in a fresh slot. Move 2 showed an amber SPREAD 1 forecast; move 3 coated `(1,2)` before victory. Explicit reload retained 3 moves, that coating and usable controls. Move 4 cleared it, and move 5 won home 1/1 with Guide and Continue enabled. The Guide described the labelled practice wait and saved-route loosening. In a second isolated slot, the first 15 actual pointer drags of the preserved reauthored adverse prefix were accepted. At turn 15 the jelly showed WAIT and the coach said, “Practice help: the jelly waited to keep a route home open.” Explicit reload retained the 15-move board, WAIT label, coach and usable controls. Neither phone path triggered peeling, the only behavior altered by the subsequent settle correction; fresh final-source replays retained the five-move win and the event tests retained the wait. This browser path does not demonstrate the historical saved-state peel event; the exact old turn-41 and turn-96 peel/continuation cases are covered by engine tests and serialized raw receipts. Owned tab closed and viewport reset before the final serial 98-file/912-test gate. No new thread is required; controller scoped review and commit are next.

## Task 21 visiting docks - September 29 2026

The implementer played all five CLI-searched lessons with real pointer drags in isolated DEV lesson-preview slots at 375x667, with no hints, boosters or injected state. These browser viewports are not physical iPhone measurements. The phone plays preceded the final farewell-frame pivot correction; corrected optimized alpha art was inspected afterward. Controller final-source play is separate.

| Lesson | Observed sequence and win |
| --- | --- |
| 756 | Three drags: first moved BOARD one stop without the waiting guest; reload retained that pre-win state. Second reached a stop with amber WAIT forecast on the blocked final track cell. Third aligned and boarded, home 1/1. |
| 757 | Initial station blocked the next stop, visibly WAIT. Sliding the station aside accepted one turn while the shuttle waited. The second drag cleared the route and boarded, home 1/1. |
| 758 | First drag moved BOARD to (2,1), while the safe guest remained separate at (2,3). Second drag aligned the guest and won home 1/1. |
| 759 | First drag boarded one of two guests, home 1/2. Second advanced the shuttle while the other guest remained distant. Third aligned and boarded the second, home 2/2. |
| 760 | First drag advanced the dock entrance to (2,1) while the current carried the active guest from (2,4) to (2,3), with no boarding. Second aligned and boarded, home 1/1. |

At 320x568, 760's board, shuttle, current arrows, BOARD marker, coach and footer fit. A pre-win reload retained the separate guest and entrance, then the second drag won. In another fresh 320x568 slot the real Guide Reduced motion checkbox was checked before the same two-drag win; settled pre-win and final scenes were visible. Original source-alpha and all four optimized shuttle states were inspected at full size: body/hatch scale and pivot stay aligned while ramp/glow/trail change; the separate rule-driven marker identifies the actual entrance. Owned tab closed and viewport reset before the serial full suite. Next step: controller independent final-art play and scoped review/commit in this task. No new thread needed.
