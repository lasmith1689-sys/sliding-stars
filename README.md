# Sliding Stars

A cozy space rescue puzzle game for iPhone, starring Zena and Pepper.

The current web beta contains **1,000 proof-verified missions and 20 implemented mechanics**: 102 authored teaching boards plus 898 deterministic terrain variations. It includes changing board shapes, animated creatures, rescue-aware hints and chapter selection. Four planned mechanics, a replacement for removed portals, deeper procedural variety and expanded station rewards remain unfinished. See [the research crosscheck](docs/2026-09-30-CAMPAIGN-CROSSCHECK.md) and [Claude Code handoff](CLAUDE-HANDOFF.md).

## Install on iPhone

**Version 1.0 (6.1) uploaded successfully to Apple** on September 30, 2026; all 994 tests passed. Apple processing and internal availability still require confirmation because the browser login expired. Version 5.1 is the last independently confirmed available build. Open TestFlight on iPhone and check for the 6.1 update. GitHub Actions macos-26/Xcode 26 builds, cloud-signs and uploads releases. See [delivery instructions](TESTFLIGHT.md) and [beta scope and status](docs/TESTFLIGHT-BETA.md).

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
