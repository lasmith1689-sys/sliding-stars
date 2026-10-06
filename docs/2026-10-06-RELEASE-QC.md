# Fixed station and shuttle boarding release checkpoint - October 6, 2026

Stations now stay fixed. Crew reach the glowing side entrance; dragging the station or swapping terrain into it leaves the board and move count unchanged. This supersedes the movable-station behavior in build 17.1. Read the [fixed station audit](2026-10-06-FIXED-STATIONS-AUDIT.md) for implementation, save compatibility and empty-shuttle boarding.

## Verification

- **1,181 tests / 126 files passed** locally, including five new boarding regressions. TypeScript, production build and Capacitor synchronization passed. The preceding fixed-station [public CI run](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/37525523498) and native build 18.1 passed all 1,176 tests then present.
- All **1,000 immutable mission routes replay** with no failures or pending revisions. Advice: **3,984 positions**, proof depth 1-12, mean 3.984.
- Independent review verified every existing station remained identical across every route and checked all packaged hints; no remaining findings.
- Production boundary: **873 modules / 61 chunks / zero development campaign modules**. Offline pack: **208 files**.
- Content SHA-256 remains `9896b20b34aa2a3104a698427c709a53a57002cc06ae9b9f083c37b2f7a2a3c4`. Definitions, goals, rewards and active station positions are preserved.
- At 390-by-844, local browser Mission 3 rescued both crew in seven accepted moves while the station stayed fixed. The astronaut fell through the permanent gap; attempted station moves spent no move.

Empty shuttles now load the unowned crew on the tile displaced by a valid matching swap. The same ship then carries that person to a fixed station entrance. Nonmatching pickup still rejects; occupied ships retain their riders; rendezvous reservations remain protected. Independent review checked stacked passengers, oxygen/shelter clocks, saved continuation, grouped animation, all 1,000 proofs and 3,984 hints. Five additional proof records changed, with no changed opening hashes.

## Delivery

The [improved web preview](https://next--sliding-stars.netlify.app/) is deployed on the `next` alias, deployment `6ac557a762dff6d515f511e0`. The original production site and parent game remain preserved. Real 390-by-844 browser replay rescued both Mission 3 crew in seven accepted moves and automatically advanced to Mission 4. Both station-swap directions were rejected at move 2 without changing the board, goal or wallet; reload restored the identical station position and move count. The published guide teaches the fixed entrance. No browser warnings or errors were captured.

- [Fixed station rejection evidence](../validation/fixed-station-live-2026-10-06.jpg)
- [Permanent gap gravity evidence](../validation/gap-fixed-stations-live-2026-10-06.jpg)
- [Automatic next mission evidence](../validation/fixed-station-next-mission-2026-10-06.jpg)

**1.0 (18.1)** is VALID, APP_STORE_ELIGIBLE and IN_BETA_TESTING internally, confirmed by Apple for build ID `deddf35b-c6c6-40a2-a9eb-dcc7ebfe3f6f`. It contains fixed stations and came from app commit [`0579d12`](https://github.com/lasmith1689-sys/sliding-stars/commit/0579d1256914c8a8e62bfe0cd0f6432fbca003f0), [native run 18](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/37525523526). The empty-shuttle boarding repair is the subsequent release, currently pending delivery verification. Do not claim 18.1 contains that later repair.

Existing public TestFlight/App Store review remains blocked by blank review contact and owner-entered App Privacy. An invitation is not evidence of installation; upload is not approval. See [release instructions](app-store/RELEASE.md).

Next: verify the published web behavior and new native build, then update the iPhone and retry Mission 3, including save/reopen and offline play. Continue in the current thread; no new thread is required.
