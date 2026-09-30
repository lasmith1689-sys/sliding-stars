# Sliding Stars

A cozy space rescue puzzle game for iPhone, starring Zena and Pepper.

The current beta contains **108 fixed authored missions and 21 implemented mechanics**, with changing board shapes, animated creatures, hints, boosters, mission selection/replay, sound and reduced-motion preferences. The full 1000-mission campaign, four later mechanics and expanded station rewards remain unfinished.

## Install on iPhone

**Version 1.0 (4.1) is available to the account owner through internal TestFlight**, verified September 30, 2026. Open TestFlight on iPhone and install Sliding Stars. GitHub Actions macos-26/Xcode 26 builds, cloud-signs and uploads releases; all 964 tests passed. See [delivery instructions](TESTFLIGHT.md) and [beta scope and status](docs/TESTFLIGHT-BETA.md).

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
