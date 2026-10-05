# Mechanics repair and delivery checkpoint - October 5, 2026

This is the current release checkpoint. The [full mechanics audit](2026-10-05-MECHANICS-AUDIT.md) records fresh Sliding Seas research, all 25 implementation contracts, findings and reference differences. Older checkpoints retain historical evidence.

## Corrected behavior

Mission 3's permanent gap now stays empty while the original upper terrain and astronaut fall through its lane after a lower merge. Existing pieces fall before upstream refill. The fix preserves real piece/passenger identity, distinct closed cells and chambers, immutable definitions and in-progress saves.

The audit also corrected a Mission 961 legal-move crash caused by a station taking a reserved rendezvous guest. Generic station, dock and tractor interactions now preserve the paired assignment. Campaign victories bank actual rescued crew/VIPs once; boot repair recovers conservative historical entitlements. Guide restores home access and persisted construction. A stable compatibility schedule makes all 24 existing residents and both existing stations reachable instead of repeating the starter VIP in every slot.

The campaign remains 1,000 missions, 127 authored teaching boards, 873 deterministic variants and 25 live nonportal mechanics. No level definitions were changed. Content SHA-256 remains `9896b20b34aa2a3104a698427c709a53a57002cc06ae9b9f083c37b2f7a2a3c4`.

## Verification

- Full suite: **1,164 tests / 124 files passed** locally; macOS release CI repeated the complete suite successfully.
- TypeScript, production build and Capacitor synchronization passed locally and in native release CI.
- All **1,000 corrected proof routes replay**, with zero failures or pending revisions. 110 proof records were updated; shipped hints contain **3,343 verified positions**. Proof depth is 1-9, mean 3.343.
- Production audit: **872 modules / 61 chunks / zero development campaign modules**. Offline pack: **208 files**.
- Independent review covered all mechanics, 1,000 initial boards, 5,685 accepted off-route actions across 165 boards, 4,918 initial-action/supply transitions, 17,464 phase evaluations and 3,110 rendezvous evaluations. Scene reconstruction and historical reward repair also passed.
- The public [CI run](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/37313575746) completed successfully for the shipped app commit.

These are bounded automated checks and winning-route proofs. Physical iPhone touch, background/resume and offline behavior still need device playtesting. They do not establish exact commercial-game parity or subjective balance.

## Live web check

The improved preview is [next--sliding-stars.netlify.app](https://next--sliding-stars.netlify.app/), Netlify deploy `6ac39eca91789b6cb5fdcf1b`. Only the `next` alias was updated; the original production site and original parent game were preserved.

At 390×844, real browser dragging on Mission 3 visibly moved the astronaut below the permanent gap. Dragging the hole was rejected without spending a move. The rescue-aware hint remained legal, both guests were rescued in four moves, and the game automatically advanced to Mission 4. The banked rescue/VIP unlocked the Greenhouse. Construction survived a reload, and the same Mission 4 board, zero move count and wallet were restored. Returning from home cost no move.

- [Gravity evidence](../validation/gravity-live-2026-10-05.jpg)
- [Persisted Greenhouse evidence](../validation/home-live-2026-10-05.jpg)

## iPhone delivery

Public source app commit: [`fef92d8f12994ee04d235dc76e02365c072bbb76`](https://github.com/lasmith1689-sys/sliding-stars/commit/fef92d8f12994ee04d235dc76e02365c072bbb76).

[Native release run 17](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/37313575860) archived, cloud-signed and uploaded **1.0 (17.1)** successfully. Apple's API confirmed this exact build as **VALID**, **APP_STORE_ELIGIBLE** and **IN_BETA_TESTING** internally. It is selected for App Store version 1.0. The raw [Apple status snapshot](app-store/release-status-2026-10-05.json) records build ID `05831229-73f2-41b0-a6da-469e0a36c6c2` and the actual states.

The same commit's actual iPhone simulator capture passed the Vision readiness gate. Manual inspection confirmed the full terrain board, astronaut, mission goal, hint and controls. Its 1320×2868 screenshot is **COMPLETE** in Apple, ID `a6800019-65f0-8a11-8017-3eace2c7823a`; artifact `11347362287` preserves the pixels and simulator build log. [Native screenshot evidence](../validation/iphone-gameplay-17.1.png).

The workflow's public-review and screenshot-metadata jobs report failure because Apple's required contact fields are blank. The signed upload succeeded, internal testing is available, and screenshot capture/upload succeeded. External state remains **READY_FOR_BETA_SUBMISSION**; store state remains **PREPARE_FOR_SUBMISSION**. Neither public beta nor App Store review has been submitted or approved. The public invitation is not evidence of public installation. Owner-entered review contact and App Privacy remain separate delivery prerequisites; private contact reuse still requires specific authorization.

Next: update Sliding Stars to **1.0 (17.1)** in TestFlight and retry Mission 3 with existing saved progress, then check background/reopen and offline play. Continue in the current thread; no new thread is required.
