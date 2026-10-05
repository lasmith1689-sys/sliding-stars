# Sliding Stars

A cozy space rescue puzzle game for iPhone, starring Zena and Pepper.

The current beta contains **1,000 proof-verified missions and all 25 planned mechanics**: 127 authored teaching boards plus 873 deterministic terrain variations. It includes changing board shapes, animated creatures, rescue-aware hints, chapter selection and two home stations with 24 residents. The October 5 audit corrected falling through permanent gaps, paired departures and home rewards, then replayed every mission. See the [mechanics audit](docs/2026-10-05-MECHANICS-AUDIT.md), [release checkpoint](docs/2026-10-05-RELEASE-QC.md) and [current handoff](CLAUDE-HANDOFF.md). Further human playtesting and deeper procedural variety remain useful follow-ups.

## Install on iPhone

**Version 1.0 (17.1) is processed and available to internal TestFlight testers**, confirmed by Apple's API on October 5, 2026. All 1,164 tests passed locally and in the macOS release build. Open TestFlight on iPhone and update to 17.1, then retry Mission 3. Public beta and App Store review remain pending required Apple contact/privacy steps. GitHub Actions macos-26/Xcode 26 builds, cloud-signs and uploads releases. See [delivery instructions](TESTFLIGHT.md) and the [current release checkpoint](docs/2026-10-05-RELEASE-QC.md).

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
