# Sliding Stars — first iOS beta

Status: **version 1.0 (4.1) is available for internal TestFlight testing**, verified September 30, 2026. Xcode 26.6 archived, cloud-signed and uploaded successfully; Apple processing is Complete and the build is Testing in the Me group with one internal tester. [Successful upload run](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36722641138). Physical iPhone installation/play testing remains for the account owner.

## Included

102 fixed authored missions, 20 implemented mechanics, board shapes and sizes that vary by mission, animated terrain/creatures, mission selection and replay, hints, boosters, sound and reduced-motion preferences, generous practice missions and immediate retries. All 102 exact mission definitions have passing committed solution replays. Canonical numbers have gaps; those gaps are explicitly described in the beta mission picker.

The iOS project bundles game code and art locally. Native saves use Preferences with ordered backup/primary writes and retry support. The existing app icon, portrait layout, dark launch screen, privacy manifest and shared Xcode scheme are configured. Safari and native-app saves are separate.

## Still outside this beta

The full 1000-mission catalog, four later mechanics (relays, tethers, repairs and rendezvous), and the expanded station/VIP reward systems are unfinished. This is a playable beta, not a claim that 85% of all planned content is complete. Original saves and the original production website are preserved.

## Validation

- One full release regression run: 962 tests passed across 105 files.
- Subsequent native persistence checks: 5/5 passed, including interruption during migration and protection of unknown future saves.
- Compact layout checks: 5/5 passed, retaining board targets of at least 40 pixels on the tested 7×9 configurations.
- Typecheck, production build and Capacitor iOS synchronization passed.
- Production-browser touch check at 390×844: mission 1 completion, advancement to mission 2, mission picker and phase mission 801; its accepted move survived reload with controls unlocked.
- Small-phone inspection found long guidance overlapping controls; footer reservations were corrected and the layout checks passed.
- GitHub CI and the macOS job both passed all 964 tests. Xcode 26.6 produced the iOS archive and verified bundle identity, build number, privacy manifest and bundled game assets: https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36712456092 . Distribution signing/upload were skipped because repository secrets were missing. Real-iPhone testing and Apple processing remain pending.

## Build and upload

Follow [TESTFLIGHT.md](../TESTFLIGHT.md) for the account owner's Windows-only workflow. The bundle ID is **com.lasmith1689.SlidingStars**. GitHub runs on macos-26 with Node 24, archives with ad-hoc signing, then exports through Apple's cloud-managed certificate using the four repository secrets. Build numbers use run_number.run_attempt. No Mac purchase or certificate/profile management is needed.

After Apple processing, attach the build to an internal TestFlight group containing the account owner. Verify TestFlight shows the build and that it can actually be installed. External testers may require Apple's beta review. Do not claim delivery before that verification.

Suggested “What to Test”: “Play the first rescues, try the later mechanics through Missions, and check that progress and settings survive closing and reopening the app. Please note any unclear rules, cramped controls, animation problems or unexpectedly hard missions. This beta includes 102 authored missions; numbered gaps are planned content.”

Setup update, September 30, 2026: registered the bundle ID and created App Store Connect app **6817778193**. Internal group **Me** has automatic distribution enabled and the account owner added (1 tester, 0 builds). Saved the existing team, key and issuer identifiers as GitHub repository secrets. Only the existing private key (`ASC_KEY_P8`) is still missing; GitHub cannot reveal it from another repository. No new key was created or existing access changed.

Delivery update: the owner added the private key directly to GitHub. Build 4.1 passed all 964 tests across 105 files, compiled and uploaded successfully. Apple processing completed; TestFlight shows Testing and Me with one internal tester. Testing notes are saved. No private-key contents were read or committed.

Next step: open TestFlight on iPhone, install Sliding Stars 1.0 (4.1), and check first rescues and progress after relaunch. Continue in this task for device-specific issues; no new task is required.

## Direct-touch update (September 30, 2026)

Tiles and their riders now track finger movement continuously. Invalid or cancelled drags return smoothly; accepted swaps continue from the release position. Hints highlight two tiles instead of drawing an arrow. A clear completion celebration automatically opens the next mission after 1.3 seconds, with save failures stopping safely for retry.

Bundled Fredoka and Nunito replace the generic UI lettering, including canvas labels. The first three missions start with stranded crew; untouched older starts are refreshed. Active crew on breathable ground still ask for help until actually rescued. Six portal missions were removed; saved portal missions move to an available mission while preserving account progress and inventory. The release now has 102 fixed missions and 20 mechanics.

Verified in the browser at 390x844: drag to win mission 1 automatically opened mission 2 without clicking. At 320x568, board and controls remained separated and readable. Automated checks cover partial-drag positions, riding crew, smooth release, return, masked cells, auto-advance, background pauses and save-failure handling. All remaining authored mission proofs pass.

Reference: https://www.slidingseas.com/ and https://www.gamezebo.com/reviews/sliding-seas-review-a-gorgeous-entertaining-match-stuff-puzzler/ . Core reference loop: sliding/matching terrain into land and shelter to rescue stranded guests; changes above implement the user's direct-touch and clear-completion requirements.
