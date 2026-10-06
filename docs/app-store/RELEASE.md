# Sliding Stars iOS distribution

Continue in the current Codex thread; a new thread is not required.

App: **Sliding Stars** · bundle ID `com.lasmith1689.SlidingStars` · Apple app ID `6817778193`.

The October 6 fixed-station native release is being delivered. **1.0 (17.1)** remains the previous internally available build and still permits station movement. Read the [current checkpoint](../2026-10-06-RELEASE-QC.md) for the exact newly processed build and its own native screenshot. Do not claim upload alone means processing or testing availability.

The public TestFlight invitation is [testflight.apple.com/join/7w5XTsgG](https://testflight.apple.com/join/7w5XTsgG). It does **not yet offer public installation**. Review contact is blank, external testing has not been submitted, and the owner must publish the App Privacy questionnaire before store submission. The exact current states are [recorded here](release-status-2026-10-05.json).

## Build and sharing

The existing Windows/GitHub macOS signing setup is retained. A `[ship]` commit uploads a build eligible for **both external TestFlight and App Store release**, rather than restricting it to internal testers. The release job then waits for that exact build, prepares the public group, descriptions and review notes, and submits beta review when contact information is complete. It records Apple's actual state in the `apple-release-status` artifact.

The parallel screenshot job builds the same commit for an iPhone simulator and captures actual release gameplay. It checks the visible mission, crew objective, Hint and Guide controls before uploading the native screenshot. It retains the pixels and simulator build log. It does not use a development preview, fabricated progress or promotional overlay. Build 17.1's capture is 1320x2868 and COMPLETE in Apple.

Use **GitHub → Actions → App Store release → Run workflow** to inspect Apple status or retry metadata without rebuilding. Choose `testflight` and the exact uploaded build number to retry beta submission, or `store` to submit the prepared App Store version. A failed metadata step does not mean the signed build failed to upload; read the upload job and release status separately.

The four existing secrets stay in GitHub Actions only. Never paste a private key into chat or commit it. Review contact fields also belong in App Store Connect, not this public repository.

## Remaining Apple website steps

Open [the app in App Store Connect](https://appstoreconnect.apple.com/apps/6817778193). Sign in using your own Apple Account and two-factor authentication.

1. **TestFlight → Test Information**: fill the review contact's first name, last name, email and telephone number. No demo login is required. Enter your feedback email if Apple requires it. Save. The game description, privacy URL and notes are prepared by the release workflow.
2. **Distribution → App Privacy → Get Started/Edit**: the iOS game has no accounts, tracking, analytics, ads, network data uploads or personal-data collection. Select **No, we do not collect data from this app**, then save and publish the answers. Local mission progress and preferences are not transmitted. Apple handles TestFlight feedback separately.
3. **TestFlight → Friends and Explorers → Add Build**: select **1.0 (17.1)**, enter the prepared testing notes if prompted, and choose **Submit for Review**. Alternatively, rerun the GitHub **App Store release** workflow in `testflight` mode with build number `17.1`. Once Apple approves it, verify that the public invitation offers installation.
4. **Distribution → iOS App → 1.0**: verify build **17.1**, the native screenshot, description, support link, copyright and review contact. The game needs no login or demo account. Its free price, NINE_PLUS age answers, content rights for licensed fonts, 175 territories and automatic release after approval are already configured. It is iPhone-only; no iPad screenshot is required. Complete any legal account agreement or trader-status declaration yourself only if Apple requires it.
5. **Add for Review → Submit to App Review**, or run the GitHub workflow in `store` mode after the privacy/contact fields are saved. TestFlight beta review and App Store review are separate. Submission is not approval or a live App Store release.

The next concrete step is to finish sign-in, review contact and App Privacy, then submit both reviews. These are metadata steps; no new native build or new thread is required. Apple controls review timing and approval.

Automatic approval review rejected copying Ai Sky's private contact without specific authorization. The user's permission question is pending. If permission is granted, transfer only the approved name/email/phone inside App Store Connect; never publish them in source, logs or chat. Otherwise the owner can fill those fields directly.

## Public pages

- [Support](https://next--sliding-stars.netlify.app/support.html)
- [Privacy](https://next--sliding-stars.netlify.app/privacy.html)
- Store copy: `docs/app-store/metadata.json`
- Apple automation: `.github/scripts/app-store-connect.mjs`

The original production website remains preserved. Public support reports use the authorized GitHub repository; do not include sensitive data in public issues.
