# Sliding Stars — first iOS beta

Status: game and iOS source prepared; **not yet compiled, signed, uploaded or available on TestFlight**. The account owner uses Windows and an iPhone, with GitHub Actions macos-26/Xcode 26 for builds. CI follows the existing Ai-sky ad-hoc-archive/cloud-signing method. Repository setup, the four repository secrets and the new Apple app record must precede upload.

## Included

108 fixed authored missions, 21 implemented mechanics, board shapes and sizes that vary by mission, animated terrain/creatures, mission selection and replay, hints, boosters, sound and reduced-motion preferences, generous practice missions and immediate retries. All 108 exact mission definitions have passing committed solution replays. Canonical numbers have gaps; those gaps are explicitly described in the beta mission picker.

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
- Native compilation, signing, real-iPhone performance/lifecycle/save testing and Apple processing remain unverified until Mac/device access exists.

## Build and upload

Follow [TESTFLIGHT.md](../TESTFLIGHT.md) for the account owner's Windows-only workflow. The bundle ID is **com.lasmith1689.SlidingStars**. GitHub runs on macos-26 with Node 24, archives with ad-hoc signing, then exports through Apple's cloud-managed certificate using the four repository secrets. Build numbers use run_number.run_attempt. No Mac purchase or certificate/profile management is needed.

After Apple processing, attach the build to an internal TestFlight group containing the account owner. Verify TestFlight shows the build and that it can actually be installed. External testers may require Apple's beta review. Do not claim delivery before that verification.

Suggested “What to Test”: “Play the first rescues, try the later mechanics through Missions, and check that progress and settings survive closing and reopening the app. Please note any unclear rules, cramped controls, animation problems or unexpectedly hard missions. This beta includes 108 authored missions; numbered gaps are planned content.”

Next step: finish the new repository and Apple app record, add the same four signing secrets to that repository, then run and verify TestFlight delivery in this task. No new task is required.
