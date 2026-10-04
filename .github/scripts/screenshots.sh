#!/bin/bash
set -euo pipefail
OUT="${RUNNER_TEMP:?}/sliding-stars-screenshots"
mkdir -p "$OUT"
xcodebuild build -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath "$OUT/DerivedData" \
  CODE_SIGNING_ALLOWED=NO > "$OUT/simulator-build.log" 2>&1
xcrun simctl list devices available -j > "$OUT/devices.json"
device=$(node -e 'const fs=require("fs");const devices=Object.values(JSON.parse(fs.readFileSync(process.argv[1])).devices).flat();const phone=devices.find(d=>d.name==="iPhone 17 Pro Max")??devices.find(d=>/iPhone.*Pro Max/.test(d.name));if(!phone)throw Error("No large iPhone simulator available");console.log(phone.udid)' "$OUT/devices.json")
xcrun simctl boot "$device" || true
xcrun simctl bootstatus "$device" -b
xcrun simctl status_bar "$device" override --time '9:41' --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl install "$device" "$OUT/DerivedData/Build/Products/Release-iphonesimulator/App.app"
xcrun simctl launch "$device" com.lasmith1689.SlidingStars
# Wait for the bundled WebView and fonts on the CI simulator, then retain actual
# iOS gameplay pixels. No preview query, fabricated save or screen overlay.
sleep 15
xcrun simctl io "$device" screenshot "$OUT/iphone-gameplay.png"
echo '::notice::Captured the release build running on an iPhone simulator.'
