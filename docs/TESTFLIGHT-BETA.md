# Sliding Stars beta checkpoint - September 30, 2026

The 1,000-mission web beta is live at https://next--sliding-stars.netlify.app/ (deploy 6abd9eca44f1240bfa46bca2). Public source commit: 57f17b9. Original production and original source remain preserved.

## Included

1,000 distinct starting puzzles: 102 authored teaching missions plus 898 seeded terrain variants. Twenty implemented nonportal mechanics, 62 distinct board masks, nine shape families and 15 board bounding sizes. Every exact definition has an independently replayed, hash-checked winning path without boosters. All 1,000 numbers are playable through sequential progression and the 20-constellation picker.

Direct finger-following tiles, cute existing art, offline rounded fonts and automatic mission completion remain intact. New hints prefer immediate objective progress and avoid immediate losing moves. Existing saves and rewards are preserved; migration distinguishes old portal boards from new ordinary missions at the same numbers.

## Validation

- All 1,000 shipped definitions independently replayed to victory; all starting puzzle fingerprints unique; no unintroduced mechanics in generated practice.
- All 1,018 tests across 112 files passed on Linux CI and macOS. GitHub CI passed at source commit 57f17b9: https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36792476789 .
- Typecheck, production build, production-module boundary audit and Capacitor synchronization passed. Generator, solver and proof artifacts are absent from client code.
- Production browser check at 390x844: selected mission 1000 from the constellation picker, won it using two real drag gestures, and observed automatic advancement to the first unfinished mission. Verified the published build shows 0/1000 missions.
- Real iPhone installation, touch feel and offline relaunch still require the account owner's device check.

## Honest limits

This is an expanded playable beta, not the complete original design. Winning proofs are 1-9 moves. Terrain variations often share the same core strategy; human difficulty/playtesting and deeper multi-step generation remain priorities. Relays, tethers, repair bots and rendezvous remain unimplemented, and a fifth mechanic must replace portals to reach 25. Expanded station/VIP rewards remain unfinished.

See [the current research crosscheck](2026-09-30-CAMPAIGN-CROSSCHECK.md) and [Claude Code handoff](../CLAUDE-HANDOFF.md). Those documents distinguish reference evidence, implemented behavior and remaining work.

## iOS delivery

Build 1.0 (7.1) successfully cloud-signed and uploaded at 2026-09-30 23:48:13 UTC: https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36792476666 . Logs explicitly confirm Upload succeeded and EXPORT SUCCEEDED. Apple processing and internal availability of 7.1 remain unverified: the browser's App Store Connect login expired. Previous 5.1 is the last confirmed Testing build in the Me group. Open TestFlight on iPhone to check for 7.1, or sign in to App Store Connect to verify its status.

All four repository secrets are configured. No Mac or certificate/profile management is needed. The native app bundles all chapters and artwork; native and Safari saves remain separate. See [TESTFLIGHT.md](../TESTFLIGHT.md).

Next step: check for 7.1 in TestFlight, install and play on iPhone, then use CLAUDE-HANDOFF.md for continued development. No new Codex thread is required.


QC update: mission-specific help, clearer tile borders, compact phase labels, broader campaign rotation and 3,041 verified player hints are included. See [quality-control findings](2026-09-30-QUALITY-CONTROL.md) for the before/after evidence and limits.
