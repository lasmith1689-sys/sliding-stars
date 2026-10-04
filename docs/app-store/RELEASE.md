# Sliding Stars iOS distribution

Continue in the current Codex thread; a new thread is not required.

App: **Sliding Stars** · bundle ID `com.lasmith1689.SlidingStars` · Apple app ID `6817778193`.

The public TestFlight invitation is [testflight.apple.com/join/7w5XTsgG](https://testflight.apple.com/join/7w5XTsgG). It cannot offer the new game until a distribution build finishes processing and Apple approves external testing. Creation of the link is not approval.

## Build and sharing

The existing Windows/GitHub macOS signing setup is retained. A `[ship]` commit uploads a build eligible for **both external TestFlight and App Store release**, rather than restricting it to internal testers. The release job then waits for that exact build, prepares the public group, descriptions and review notes, and submits beta review when contact information is complete. It records Apple's actual state in the `apple-release-status` artifact.

The parallel screenshot job builds the same commit for an iPhone simulator and captures actual release gameplay. It uploads the native screenshot into the App Store listing and retains the pixels and simulator build log. It does not use a development preview, fabricated progress or promotional overlay.

Use **GitHub → Actions → App Store release → Run workflow** to inspect Apple status or retry metadata without rebuilding. Choose `testflight` and the exact uploaded build number to retry beta submission, or `store` to submit the prepared App Store version. A failed metadata step does not mean the signed build failed to upload; read the upload job and release status separately.

The four existing secrets stay in GitHub Actions only. Never paste a private key into chat or commit it. Review contact fields also belong in App Store Connect, not this public repository.

## Apple website settings

Open [the app in App Store Connect](https://appstoreconnect.apple.com/apps/6817778193). Sign in using your own Apple Account and two-factor authentication.

1. **TestFlight → Test Information**: fill the review contact's first name, last name, email and telephone number. No demo login is required. Enter your feedback email if Apple requires it. Save. The game description, privacy URL and notes are prepared by the release workflow.
2. **Distribution → App Privacy → Get Started/Edit**: the iOS game has no accounts, tracking, analytics, ads, network data uploads or personal-data collection. Select **No, we do not collect data from this app**, then save and publish the answers. Local mission progress and preferences are not transmitted. Apple handles TestFlight feedback separately.
3. **App Information → Age Ratings → Set Up/Edit**: complete the questionnaire accurately. No chat, user-generated content, unrestricted browsing, gambling, loot boxes, mature content, medical advice or realistic violence. The game includes mild playful space peril and cartoon pirate drones; answer any cartoon/fantasy violence question based on those actual graphics. Do not enable the Kids category without deliberately meeting its additional requirements.
4. **Pricing and Availability**: select **Free** and the territories in which you want to distribute it. There are no in-app purchases or subscriptions. Complete any required account agreement or trader-status declaration yourself; automation cannot make a legal declaration for you.
5. **iOS App → 1.0**: verify the uploaded distribution build, description, support link, screenshots, copyright and review contact. The app is iPhone-only, so an iPad screenshot is not required. The simulator screenshot must have finished Apple processing. Supply Content Rights answers for the app's original artwork and bundled open-source font licenses.
6. **Add for Review → Submit to App Review**. The release option is **Automatically release after approval**. TestFlight beta review and App Store review are separate; the public beta can become available before the store release.

The next concrete step after uploading is to confirm the exact build's Apple processing state, finish any missing website settings above, then submit review. Apple controls review timing and approval; do not describe a submission as already live.

## Public pages

- [Support](https://next--sliding-stars.netlify.app/support.html)
- [Privacy](https://next--sliding-stars.netlify.app/privacy.html)
- Store copy: `docs/app-store/metadata.json`
- Apple automation: `.github/scripts/app-store-connect.mjs`

The original production website remains preserved. Public support reports use the authorized GitHub repository; do not include sensitive data in public issues.
