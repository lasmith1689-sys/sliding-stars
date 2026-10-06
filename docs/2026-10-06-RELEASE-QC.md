# Fixed station and shuttle boarding release checkpoint - October 6, 2026

Stations now stay fixed. Crew reach the glowing side entrance; dragging the station or swapping terrain into it leaves the board and move count unchanged. This supersedes the movable-station behavior in build 17.1. Read the [fixed station audit](2026-10-06-FIXED-STATIONS-AUDIT.md) for implementation, save compatibility and empty-shuttle boarding.

## Verification

- **1,181 tests / 126 files passed** locally, in the [public CI run](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/37528481389), and in the macOS native release. TypeScript, production build and Capacitor synchronization passed. Five added regressions cover the boarding repair.
- All **1,000 immutable mission routes replay** with no failures or pending revisions. Advice: **3,984 positions**, proof depth 1-12, mean 3.984.
- Independent review verified every existing station remained identical across every route and checked all packaged hints; no remaining findings.
- Production boundary: **873 modules / 61 chunks / zero development campaign modules**. Offline pack: **208 files**.
- Content SHA-256 remains `9896b20b34aa2a3104a698427c709a53a57002cc06ae9b9f083c37b2f7a2a3c4`. Definitions, goals, rewards and active station positions are preserved.
- At 390-by-844, local browser Mission 3 rescued both crew in seven accepted moves while the station stayed fixed. The astronaut fell through the permanent gap; attempted station moves spent no move.

Empty shuttles now load the unowned crew on the tile displaced by a valid matching swap. The same ship then carries that person to a fixed station entrance. Nonmatching pickup still rejects; occupied ships retain their riders; rendezvous reservations remain protected. Independent review checked stacked passengers, oxygen/shelter clocks, saved continuation, grouped animation, all 1,000 proofs and 3,984 hints. Five additional proof records changed, with no changed opening hashes.

## Delivery

The [improved web preview](https://next--sliding-stars.netlify.app/) is deployed on the `next` alias, deployment `6ac55d4bd252f30402cee71f`. The original production site and parent game remain preserved. Real 390-by-844 browser replay rescued both Mission 3 crew in seven accepted moves and automatically advanced to Mission 4. Both station-swap directions were rejected at move 2 without changing the board, goal or wallet; reload restored the identical station position and move count. The published guide teaches the fixed entrance. No browser warnings or errors were captured. The final boarding release also completed real Mission 927 in five accepted moves: after two matches an empty ship collected the astronaut in a matching swap, reload preserved that exact occupied ship and move count, and two flights delivered the same person to the fixed entrance. The game advanced automatically.

- [Fixed station rejection evidence](../validation/fixed-station-live-2026-10-06.jpg)
- [Permanent gap gravity evidence](../validation/gap-fixed-stations-live-2026-10-06.jpg)
- [Automatic next mission evidence](../validation/fixed-station-next-mission-2026-10-06.jpg)
- [Empty ship before matching pickup](../validation/shuttle-before-pickup-live-2026-10-06.jpg)
- [Exact astronaut aboard after matching pickup](../validation/shuttle-aboard-live-2026-10-06.jpg)
- [Automatic advance after shuttle rescue](../validation/shuttle-next-mission-live-2026-10-06.jpg)

On this same final release, Mission 3 again showed the original astronaut below the permanent hole at move 1. A station formed at move 2; both attempted swap directions kept its position, the remaining crew, wallet and move count unchanged. The fixed-station and gap images above were refreshed from this deployment. Captured browser warnings and errors: zero.

**1.0 (19.1)** is VALID, APP_STORE_ELIGIBLE and IN_BETA_TESTING internally, confirmed by Apple for build ID `844ac5b0-6c01-4934-911c-40dc8a1b82ea`. It contains both fixed stations and matching empty-shuttle pickup. Public app commit [`dd1b1e325a4891ff78b99b966c7f4f46d16c98ce`](https://github.com/lasmith1689-sys/sliding-stars/commit/dd1b1e325a4891ff78b99b966c7f4f46d16c98ce), [native run 19](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/37528481483), [raw Apple status](app-store/release-status-2026-10-06.json). It is selected for App Store version 1.0. Public beta state is READY_FOR_BETA_SUBMISSION; store state is PREPARE_FOR_SUBMISSION.

The [actual native screenshot](../validation/iphone-gameplay-19.1.png) comes from an iPhone 17 Pro Max simulator running the Release app built from that same source commit. Readiness and manual pixel inspection passed: terrain, astronaut, mission/crew objective, instructions and controls rendered correctly. Apple image `73c00019-65f0-8a11-8009-014409d033c4` is **COMPLETE**. The 1320-by-2868 image is preserved with [artifact and checksum evidence](app-store/native-screenshot-19.1.json). The screenshot job's final failure is the separate missing review contact, not image capture or processing. Simulator verification does not replace physical iPhone touch, background/reopen or offline testing.

Existing public TestFlight/App Store review remains blocked by blank review contact and owner-entered App Privacy. An invitation is not evidence of installation; upload is not approval. See [release instructions](app-store/RELEASE.md).

Next: update the iPhone to internal TestFlight 19.1 and retry Mission 3 with existing progress, including save/reopen and offline play. Continue in the current thread; no new thread is required.
