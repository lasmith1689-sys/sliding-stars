# Sliding Stars current handoff - October 6, 2026

Continue in this thread; no new thread is required. This supersedes the October 5 checkpoint, particularly its movable-station assumption. Historical reports remain in docs/.

## Current behavior and verification

The improved app has 1,000 missions, 127 authored teaching boards, 873 deterministic variants and 25 planned nonportal mechanics. Definitions remain immutable: SHA-256 `9896b20b34aa2a3104a698427c709a53a57002cc06ae9b9f083c37b2f7a2a3c4`.

**Stations are fixed.** Campaign and compatible legacy play reject both dragging a station and swapping terrain into one without charging a move. All transport paths enforce the same rule. Bring crew to the glowing side entrance. An old saved station is anchored at its saved position; do not reset or reposition it. Help, coaching and proofs follow this rule.

The permanent-hole repair remains: compatible same-chamber fall lanes connect across gaps, the hole stays empty, existing terrain and passengers fall first, and refill enters upstream. Reserved rendezvous guests/pods cannot be stolen by generic transport. Campaign rescues/VIPs bank once independently of completion claims. Home construction persists, and the stable 24-resident schedule makes both existing home stations reachable without rewriting definitions or active saves.

A narrow boot recovery peels minimum practice jelly coatings only for playing no-failure campaign boards with no non-consumable legal move. It refuses exposed pending matches; preserves crew, station, points, turn, RNG, objectives, supplies, wallet and progress; and leaves already playable saves unchanged. Do not broaden into reset or arbitrary board mutation.

October 6 checks: **1,176 tests / 126 files**, typecheck, build and Capacitor sync passed. All **1,000 corrected proof routes** replay, with **3,983 verified advice positions**, depth 1-12, mean 3.983. Independent final review checked every station at every move, all advice, recovery edges and fixed-station coaching; no findings remained. Production: **873 modules / 61 chunks / zero development campaign modules**, **208 offline files**.

Real local 390-by-844 browser play completed Mission 3 in seven moves, verified original astronaut gravity through the hole, and rejected both station drag directions without spending a move. Physical iPhone touch, save/reopen and offline checks still need device playtesting.

Read [fixed station audit](docs/2026-10-06-FIXED-STATIONS-AUDIT.md), [current QC](docs/2026-10-06-RELEASE-QC.md), [earlier mechanics audit](docs/2026-10-05-MECHANICS-AUDIT.md) and [Apple delivery](docs/app-store/RELEASE.md). Automated proofs establish solvability, not all-path safety, subjective balance or exact commercial parity.

## User constraints and unresolved feedback

Preserve original parent game and original Netlify production. Work only in sliding-stars-next. Cute space rescue adaptation, thoughtful relaxed progression, live dragging, offline rounded fonts, automatic celebration-to-next, unsafe opening crew and generous retries remain.

Stations never move. Empty shuttles require a terrain match; occupied shuttles have one-cell flight. Cargo cannot be dragged freely. Do not restore portals, rafts, arrows, mandatory Continue or false safety labels.

The user also reported empty MATCH ships feeling dead. An optional question about adjacent-crew pickup versus only creating crew-carrying ships is pending. Neither option has been authorized by an answer. Preserve existing empty-shuttle rules meanwhile. Reconstructed screenshot routes cannot be guaranteed for the actual save because RNG/passenger IDs are unknown.

Public source, next-preview publishing, public TestFlight and App Store release are authorized. Continue routine work without stopping at phase boundaries. Do not expand into new teams, broad redesign or research without applicable authorization.

## Generation and advice

Keep strict validation, immutable release definitions and save compatibility. Future generator version is **terrain-replay-6**. Generation has a finite 360-attempt cap, deterministic mutation, replay acceptance and duplicate rejection. Never fabricate a win or substitute exhausted candidates.

The 3,983 advice positions were rebuilt against anchored stations. detourHint remains bounded at 128 transitions / 180 ms, depth four, beam five with cancellation/yielding. It consumes no supply and never mutates live state. The offline solver can complete verified teaching prefixes; it remains outside production. Shelter, jelly and reactor routes retain causal teaching coverage. Retired portal 379's only teaching route required moving a station; historical parsing survives, but that obsolete teaching claim was removed. Live campaign portals remain disabled.

Completed introductions: magnets 376-380, relays 841-845, tethers 881-885, repair 921-925 and rendezvous 961-965. Each has strict state, objectives, art, animation and five teaching missions. Practice uses introduced mechanics only.

## Paths and release

- Workspace: `H:\Projects\iPhone Apps\sliding-stars\sliding-stars-next`.
- Parent branch `codex/thousand-level-campaign`, no remote. Unrelated root `docs/reviews/` stays untouched.
- Release checkout `release/github`, main, origin `https://github.com/lasmith1689-sys/sliding-stars.git`. Sync improved app files only, excluding ignored data, secrets, original game and nested checkout.
- Web `https://next--sliding-stars.netlify.app/`, site `bc41ec96-bbad-4e56-b0d1-c612c54db038`. Use **--alias next**, never --prod.
- `[ship]` uploads iOS and captures native gameplay. `[asc] [prepare]` retries metadata without rebuilding. Documentation-only pushes use `[skip ci]`.

The fixed-station web/native delivery is in progress. Previous **1.0 (17.1)** is VALID, APP_STORE_ELIGIBLE and IN_BETA_TESTING internally, but does not contain this correction. Its app commit is `fef92d8`, native run `37313575860`, web deploy `6ac39eca91789b6cb5fdcf1b`. Use the current QC for the new exact commit, deployment and processed build when verified.

## Apple constraints

Windows/iPhone, no Mac. Existing GitHub macos-26/Xcode 26 setup archives ad hoc then cloud-signs during export. Bundle `com.lasmith1689.SlidingStars`, app `6817778193`, version 1.0, internal group **Me** auto-distributes. Build number is run_number.run_attempt. All four secrets already exist; never read/print their values into chat, source or artifacts.

External **Friends and Explorers** invitation `https://testflight.apple.com/join/7w5XTsgG` is not yet publicly installable. Review contact is blank; external state was READY_FOR_BETA_SUBMISSION, store PREPARE_FOR_SUBMISSION. Owner must publish App Privacy. Upload, processing, testing, submission and approval are separate states.

Automatic approval review rejected copying Ai Sky's private contact without specific authorization; that permission question remains pending. Do not reuse it without an answer. Review contact belongs only in Apple, never in public source or artifacts. Legal agreements remain the owner's action if required.

Native startup was corrected after 13.1: textures disable native worker bitmap probing and use image elements. 17.1's native capture passed readiness/manual inspection and is COMPLETE in Apple; its remaining screenshot metadata failure was missing contact, not rendering. Verify the new build's own screenshot; do not reuse prior image as current proof.

## Commands and next step

Use npm.cmd/npx.cmd on Windows:

    npm.cmd run typecheck
    npm.cmd test -- --configLoader runner
    npm.cmd run ios:sync
    node scripts/campaign/audit-bundle.mts
    npx.cmd netlify deploy --dir dist --alias next --no-build --site bc41ec96-bbad-4e56-b0d1-c612c54db038 --json

Next: finish exact release verification, update the iPhone to the new processed internal build and retry Mission 3 with existing progress, including save/reopen and offline play. Public delivery separately requires owner-entered contact or specific reuse permission and published App Privacy before metadata-only review retries. Continue here; no new thread is required.
