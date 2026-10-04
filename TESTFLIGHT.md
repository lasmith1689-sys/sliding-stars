# Install Sliding Stars on iPhone — Windows and GitHub Actions

This app uses the account owner's existing Ai-sky distribution method: macos-26/Xcode 26, an ad-hoc archive followed by automatic cloud signing during upload. No Mac, local certificate or manually managed provisioning profile is needed.

## 1. Register the app

The app is registered and all four GitHub secrets are configured. Apple API inspection October 4 confirmed **1.0 (10.1)** is VALID and IN_BETA_TESTING internally. Earlier uploads are internal-only. The new campaign export permits both public TestFlight and App Store distribution. Do not repeat registration or create duplicate keys. See [release instructions](docs/app-store/RELEASE.md) for current sharing status and remaining Apple fields.

1. Open [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list).
2. Click **+ → App IDs → Continue → App → Continue**.
3. Enter description **Sliding Stars**, choose **Explicit**, and enter **com.lasmith1689.SlidingStars**.
4. Leave optional capabilities unchecked. This game has no widget, App Group or WeatherKit dependency.
5. Click **Continue → Register**.

## 2. Create its App Store Connect record

1. Open [App Store Connect → Apps](https://appstoreconnect.apple.com/apps), then **+ → New App**.
2. Choose **iOS**, name **Sliding Stars**, language **English (U.S.)**, bundle ID **com.lasmith1689.SlidingStars**, SKU **slidingstars**, and **Full Access**.
3. Click **Create**. If Apple says the store name is taken, choose an available name such as **Sliding Stars Rescue**; keep the bundle ID unchanged.
4. Open **TestFlight**. Click **+** beside **Internal Testing**.
5. Name the group **Me**, enable **automatic distribution**, then add yourself as a tester.

## 3. Add the existing key's four secrets to this repository

Open the new repository's **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Name | Value |
| --- | --- |
| APPLE_TEAM_ID | The existing Apple Developer Team ID |
| ASC_KEY_ID | The existing Admin Team Key's Key ID |
| ASC_ISSUER_ID | That key's Issuer ID |
| ASC_KEY_P8 | The private `.p8` text, pasted directly into GitHub |

Use the same existing key as Ai-sky. GitHub cannot reveal the values already saved in Ai-sky; use your securely retained original values. Never paste the key into chat, an issue or a source file. There are no certificate/profile secrets to create.

## 4. Run the build

Open **Actions → TestFlight → Run workflow → main → Run workflow**. A pushed commit containing **[ship]** also triggers delivery. Ordinary pushes run CI without uploading. Build numbers are **run_number.run_attempt**, so a rerun gets a new version.

If secrets are missing, the workflow still checks that the iOS archive builds and clearly reports **Nothing was uploaded**. A successful archive alone does not mean TestFlight delivery.

After an upload succeeds, open the app's **TestFlight** tab and wait for Apple processing. Confirm the build is in **Me**. On your iPhone, open **TestFlight** using the same Apple Account and tap **Install** next to Sliding Stars.

## Beta scope

1,000 verified missions (127 authored plus 873 generated variations), 25 implemented nonportal mechanics, 68 masks and 16 board bounding sizes. Magnets replace retired portals; relays, tethers, repair bots and rendezvous now have rules, original graphics and five lessons each. See [the current QC](docs/2026-10-04-RELEASE-QC.md) for validation and playtesting limits.

The app bundles game/art and uses native storage. Safari progress is separate. Public TestFlight and App Store release are authorized. The upload exports an App Store eligible build; a separate distribution job verifies Apple processing and submits external review when contact information exists. The screenshot job captures the actual release app in an iPhone simulator. Upload success and Apple approval are separate.

Next: verify the new build, complete any missing Apple fields and submit review. Continue in the current thread; no new thread is required.

Reference: the owner's [Ai-sky workflow and cloud-signing script](https://github.com/lasmith1689-sys/Ai-sky/tree/4bcc9a424a10b09adfd9410c6ec107554e85c5e0/.github), read September 29, 2026.
