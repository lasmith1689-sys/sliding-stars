# Sliding Stars

A cozy space rescue puzzle game for iPhone, starring Zena and Pepper.

The improved app contains **1,000 proof-verified missions and 25 planned mechanics**, with 127 authored boards, 873 deterministic terrain variants and two home stations with 24 residents. Stations now stay fixed; the original astronaut falls through permanent gaps before upstream refill. All **1,181 tests** and all **1,000 corrected routes** pass. See the [fixed station audit](docs/2026-10-06-FIXED-STATIONS-AUDIT.md), [current release checkpoint](docs/2026-10-06-RELEASE-QC.md) and [handoff](CLAUDE-HANDOFF.md). An empty shuttle now loads the crew on its displaced terrain when that swap makes a match.

## Install on iPhone

**1.0 (18.1)** is available to internal TestFlight testers with fixed stations. The subsequent empty-shuttle boarding repair is being delivered; check the [current checkpoint](docs/2026-10-06-RELEASE-QC.md) for its exact newly processed build. Public beta and App Store review still require Apple contact/privacy steps. See [delivery instructions](TESTFLIGHT.md).

Bundle ID: `com.lasmith1689.SlidingStars`. The iOS app bundles game/art locally and stores saves through native Preferences. Safari progress and native-app progress are separate.

## Play the web preview

[Play Sliding Stars Next](https://next--sliding-stars.netlify.app). In iPhone Safari, use Share → Add to Home Screen for the web version. Close all open copies and reopen after an update. The original site at https://sliding-stars.netlify.app is preserved.

## Develop

Use Node 22.18+ (CI uses Node 24):

```sh
npm ci
npm run dev
```

Development runs at http://localhost:5174. Verification and packaging:

```sh
npm run typecheck
npm run build
npm test -- --configLoader runner
npm run ios:sync
```

Build before testing a fresh checkout so the art tests have their generated delivery assets. Original PNG artwork is preserved; the build produces optimized WebP copies. The native app uses those same bundled assets.

## Publish the separate web preview

```sh
npm run build
npx --yes --package netlify-cli netlify deploy --site bc41ec96-bbad-4e56-b0d1-c612c54db038 --dir dist --alias next --no-build
```

Keep `--alias next`; `--prod` would replace the original production game.
