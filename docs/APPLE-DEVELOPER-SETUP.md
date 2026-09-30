# Account owner's iOS delivery preferences

Provided by the user September 29, 2026. Use these for future work on this app.

- Paid Apple Developer Program, individual Account Holder.
- Windows PC and iPhone; no Mac. Build with GitHub Actions `macos-26`, Xcode 26.
- Bundle prefix `com.lasmith1689`; this app is `com.lasmith1689.SlidingStars`.
- Existing example is `lasmith1689-sys/Ai-sky`, working delivery files on branch `claude/iphone-weather-app-widgets-7w9fga` at the time of inspection (commit `4bcc9a424a10b09adfd9410c6ec107554e85c5e0`). Its main branch contained only README.md.
- Archive with `CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=- AD_HOC_CODE_SIGNING_ALLOWED=YES`. Export `app-store-connect`, `destination=upload`, automatic signing, provisioning updates and the App Store Connect API key. Apple's cloud-managed certificate signs the export.
- Existing Admin Team API key stays only in GitHub repository secrets: `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`. Never request private-key text in chat or copy it into source/logs.
- Build numbers use `github.run_number.github.run_attempt`. Upload only from a `[ship]` commit or manual workflow run; other pushes only check CI.
- `ITSAppUsesNonExemptEncryption=NO`; each target includes PrivacyInfo.xcprivacy.
- The user performs Apple website registration and setup. Provide exact click-by-click instructions; do not take those steps over in a browser.
- A new app needs its own App ID, App Store Connect app record, internal TestFlight group, repository and the four secrets. This app needs no App Group or extra capabilities.
