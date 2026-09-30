# iOS delivery addendum

The user resumed work September 29 and made a playable TestFlight beta the first priority. An incomplete beta is authorized; do not represent 108 missions as the full 1000-level game.

Reuse the TypeScript/Pixi game in Capacitor 8 with bundled game/art, native Preferences saves, app lifecycle handling, portrait iPhone layout, existing icons and a privacy manifest. Preserve the original project and original production site.

The user has a paid individual Apple Developer account and no Mac. All native builds use GitHub Actions macos-26/Xcode 26, following the existing Ai-sky ad-hoc archive and automatic cloud-signing export. See [account setup](APPLE-DEVELOPER-SETUP.md) and [TestFlight instructions](../TESTFLIGHT.md). The user completes Apple website registration and adds the existing four secrets directly to the new repository. Never ask for key text in chat.

The iOS project is prepared; actual compilation, upload, Apple processing and iPhone installation must be verified before claiming TestFlight delivery. Safari and native-app progress are separate.

Next: finish repository/Apple setup and run the cloud build in this same task. No new task is required.