#!/bin/bash
set -euo pipefail
OUT="${RUNNER_TEMP:?}/sliding-stars-screenshots"
mkdir -p "$OUT"
swiftc .github/scripts/check-screenshot.swift -o "$OUT/check-screenshot"
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
# A launch/background-only capture is not proof of a working native app. Wait
# for visible mission/crew/controls using Apple's local Vision text recognition.
ready=false
for attempt in {1..18}; do
  sleep 5
  xcrun simctl io "$device" screenshot "$OUT/iphone-gameplay.png"
  if "$OUT/check-screenshot" "$OUT/iphone-gameplay.png"; then ready=true; break; fi
done
if [[ "$ready" != true ]]; then
  echo '::error::The native app never displayed a playable mission. Screenshot was not published.'
  exit 1
fi
echo '::notice::Captured the release build running on an iPhone simulator.'
