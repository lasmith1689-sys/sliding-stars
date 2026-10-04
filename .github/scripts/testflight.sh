#!/bin/bash
# Adapted from the owner's working Ai-sky cloud-signing setup.
# No certificates, profiles or private keys are committed to this repository.
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
  echo '::error::Run this on the configured macos-26 GitHub runner.'
  exit 1
fi
: "${BUILD_NUMBER:?Set BUILD_NUMBER to GitHub run_number.run_attempt}"
if [[ ! "$BUILD_NUMBER" =~ ^[1-9][0-9]*\.[1-9][0-9]*$ ]]; then
  echo '::error::BUILD_NUMBER must be run_number.run_attempt, such as 12.1.'
  exit 1
fi
xcode_version=$(xcodebuild -version)
printf '%s\n' "$xcode_version"
if [[ "$xcode_version" != 'Xcode 26'* ]]; then
  echo '::error::This project requires Xcode 26 on macos-26.'
  exit 1
fi

OUT=$(mktemp -d "${RUNNER_TEMP:-/tmp}/sliding-stars-testflight-XXXXXX")
ARCHIVE="$OUT/SlidingStars.xcarchive"
BUNDLE_ID=com.lasmith1689.SlidingStars
echo "Archiving Sliding Stars build $BUILD_NUMBER"
if ! xcodebuild archive \
    -project ios/App/App.xcodeproj -scheme App -configuration Release \
    -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
    CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=- AD_HOC_CODE_SIGNING_ALLOWED=YES \
    PROVISIONING_PROFILE_SPECIFIER= "CURRENT_PROJECT_VERSION=$BUILD_NUMBER" \
    > "$OUT/archive.log" 2>&1; then
  grep -E 'error:|warning:' "$OUT/archive.log" | sort -u | head -50 || true
  echo '::error::The iOS archive failed. See the retained archive log.'
  exit 1
fi

app="$ARCHIVE/Products/Applications/App.app"
actual_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")
actual_build=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$app/Info.plist")
[[ "$actual_id" == "$BUNDLE_ID" && "$actual_build" == "$BUILD_NUMBER" ]] || { echo '::error::Archived app identity or build number does not match.'; exit 1; }
[[ -f "$app/PrivacyInfo.xcprivacy" && -f "$app/public/index.html" ]] || { echo '::error::Archive is missing privacy information or bundled game assets.'; exit 1; }

if [[ "${1:-}" == --archive-only ]] || [[ -z "${APPLE_TEAM_ID:-}" || -z "${ASC_KEY_ID:-}" || -z "${ASC_ISSUER_ID:-}" || -z "${ASC_KEY_P8:-}" ]]; then
  echo '::notice::iOS archive passed. Nothing was uploaded: configure the four repository secrets described in TESTFLIGHT.md.'
  [[ -z "${GITHUB_STEP_SUMMARY:-}" ]] || printf '## iOS archive passed\nNothing uploaded. Configure the four signing secrets in TESTFLIGHT.md.\n' >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi

key="$OUT/AuthKey_$ASC_KEY_ID.p8"
p8=$(printf '%s' "$ASC_KEY_P8" | tr -d '\r')
if [[ "$p8" != *'BEGIN PRIVATE KEY'* ]]; then
  p8=$(printf -- '-----BEGIN PRIVATE KEY-----\n%s\n-----END PRIVATE KEY-----' "$(printf '%s' "$p8" | tr -d ' \n' | fold -w 64)")
fi
(umask 077 && printf '%s\n' "$p8" > "$key")
unset p8 ASC_KEY_P8
trap 'rm -f "$key"' EXIT

cat > "$OUT/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>upload</string>
<key>signingStyle</key><string>automatic</string>
<key>teamID</key><string>$APPLE_TEAM_ID</string>
<key>testFlightInternalTestingOnly</key><false/>
<key>uploadSymbols</key><true/>
<key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
EOF

echo 'Cloud-signing and uploading to App Store Connect'
if ! xcodebuild -exportArchive -archivePath "$ARCHIVE" \
    -exportOptionsPlist "$OUT/ExportOptions.plist" -exportPath "$OUT/export" \
    -allowProvisioningUpdates -authenticationKeyPath "$key" \
    -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
    > "$OUT/export.log" 2>&1; then
  tail -n 60 "$OUT/export.log"
  echo "::error::TestFlight upload failed. Check the App Store Connect record for $BUNDLE_ID and the four repository secrets."
  exit 1
fi
grep -iE 'upload|success|export' "$OUT/export.log" | tail -n 5 || true
echo "::notice::Uploaded Sliding Stars $BUILD_NUMBER for TestFlight and App Store distribution. Apple processing and review still need confirmation."
[[ -z "${GITHUB_STEP_SUMMARY:-}" ]] || printf '## Upload succeeded\nSliding Stars build %s uploaded for public TestFlight and App Store distribution. Confirm processing and review in App Store Connect.\n' "$BUILD_NUMBER" >> "$GITHUB_STEP_SUMMARY"
