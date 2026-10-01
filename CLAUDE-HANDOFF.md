# Latest revision: rescue shuttles

Read docs/2026-09-30-RESCUE-SHUTTLES.md first. It supersedes older pod/raft rules and earlier campaign counts below. Empty shuttles now need a terrain match; only occupied shuttles have powered flight. New spacecraft art, touch guidance, MATCH/ABOARD badges, repaired authored lessons, 1,000 regenerated winning boards, 63 masks and 3,023 hint entries. One-time upgrade resets only the unfinished current mission; earned progress is preserved. 1,024 tests passed. Web/native release verification follows at the end after upload. Next: physical-iPhone playtest of this distinction, then the existing strategic-depth backlog. Continue here; a new Codex thread is not required.

# Continue Sliding Stars in Claude Code

## Latest QC update — read first

The follow-up quality pass supersedes the pacing/hint limitations described in the earlier checkpoint below where specifically noted. Read `docs/2026-09-30-QUALITY-CONTROL.md` and its before/after reports.

- Neighboring generated boards no longer repeat templates or masks in the committed campaign. The weighted rotation spreads learned mechanics through late chapters; proof sequences of at least five moves increased from 60 to 146. All 1,000 proofs still pass, all 102 authored boards are unchanged, and there are now 62 masks.
- Runtime `src/campaign/hintRoutes.ts` loads twenty compact `content/hints-XX.json` maps with 3,041 verified state-to-next-action entries. All 1,000 missions finish when following their route advice. The same 41-mission QC sample improved from 26 wins/six cycles to 41 wins/no cycles. `campaignHint` remains a one-turn fallback after deviations and now recognizes partial obstacle progress.
- Full development proof objects and authoring/solver tools remain outside production. Purpose-built player advice IS shipped. Regenerate advice whenever definitions/proofs change; use `generate.mjs` or `export-hints.mjs`. Never reuse hints for a different saved definition or skip transition checks.
- `src/ui/campaignGuide.ts` teaches only mechanics on the current board. Early obstacle coaching added. Optional supplies collapsed. Existing art preserved with clearer tile borders; compact phase labels no longer spill across cells. Save-retry UI cannot strand the player by being dismissed.
- Tests and release verification for this QC update are recorded at the end of this file. Earlier build 6.1 information is historical. Do not claim subjective fun is proved by autoplay or that off-route hinting is solved.

## User intent and constraints

Build a cute space adaptation of the core Sliding Seas rescue/terrain puzzle experience. The user wants 1,000 winnable procedurally authored levels, varied size and shape, gradual new mechanics, relaxed but thoughtful play and generous retries. Cute nonviolent threats are welcome. Do not reintroduce portals, arrow-driven dragging, a mandatory Continue button, generic typography, or characters labeled safe before rescue. Preserve the original game in the parent directory. Work only in this improved app folder.

User is frustrated with excessive usage and planning. Implement bounded useful changes, verify, continue without routine permission questions, and state actual remaining gaps. No full redesign, sprawling research, or multi-agent expansion by default.

## Repositories and deployment

- Workspace app: `H:\Projects\iPhone Apps\sliding-stars\sliding-stars-next`.
- Parent Git branch: `codex/thousand-level-campaign`; no parent origin. Original app preserved at parent root. Ignore unrelated parent `docs/reviews/`.
- Public release Git checkout: `release/github`, main branch, origin `https://github.com/lasmith1689-sys/sliding-stars.git`. Sync app changes into this checkout before pushing. Do not export the original parent app/history or local secrets.
- Improved web URL: `https://next--sliding-stars.netlify.app/`. Netlify site ID `bc41ec96-bbad-4e56-b0d1-c612c54db038`. Deploy only alias `next`, never overwrite original production with `--prod`.
- Public repo is authorized. A commit containing `[ship]` triggers TestFlight; ordinary pushes run CI. Documentation-only follow-up can use `[skip ci]`.

## Implemented checkpoint

See `docs/2026-09-30-CAMPAIGN-CROSSCHECK.md` and the newer QC report for findings, evidence and limitations. The committed content contains 1,000 unique boards, 102 authored plus 898 terrain variations, 62 masks, nine shape families, 20 implemented mechanics and hash-checked winning traces for every board. The revised generation takes about 31 seconds locally. Proofs are only 1–9 moves; this is not yet a thoroughly playtested 1,000-level game with 25 completed mechanics.

- `src/campaign/generation.ts`: deterministic offline template mutation, optional safe horizontal mirroring, replay acceptance, duplicate rejection, bounded failure. `scripts/campaign/generate.mjs` writes 20 chapter files and validation artifacts.
- `src/campaign/catalog.ts`: full 1–1000 IDs, authored boards kept exact, lazy chapter loading. `BETA_CAMPAIGN_IDS` remains an API compatibility alias.
- `src/ui/releaseNavigation.ts`: 20 constellation choices with 50 missions per page.
- `src/session/adapter.ts`: save-safe advancement and retired portal migration. IDs 376–380/615 now also identify ordinary generated missions; migrate ONLY saved definitions that actually contain portals. Never discard progress, wallets or reward ledgers.
- `src/campaign/hints.ts`: bounded immediate goal/shelter scoring; no consumables or live-state mutation. Not a multi-turn solver.
- Previous TestFlight 5.1 fixes: real-time drag (`campaignDrag.ts`, board renderer), automatic celebratory advancement (`missionCompletion.ts`), offline Nunito/Fredoka fonts, unsafe starting crew in missions 1–3, portals removed from release.

## Next useful work, in order

1. Read this handoff, research crosscheck, current release status below, and `git status`. Preserve ongoing user changes. Run targeted tests before editing.
2. Improve procedural variety and purpose: multiple causal rescue steps, alternate masks/topologies, genuinely interacting mechanics. Keep deterministic generation, exact definition proofs, duplicate rejection and bounded work. Do not claim cosmetic terrain changes alone deliver 1,000 distinct strategic experiences. Preserve the QC rotation/variety improvements; late chapters now deliberately revisit the learned catalog.
3. Implement the four planned modules one at a time: relays at 841, tethers at 881, repair at 921, rendezvous at 961. Add original art/animation, five progressive teaching boards, rules/save validation, independent winning traces and a causal test that disabling the new mechanic prevents the intended solution. Add a suitable fifth original mechanic in the retired portal introduction slot to reach 25. Never restore portals without user direction.
4. Regenerate affected content only deliberately, preserve all authored IDs and in-progress immutable saved definitions, rerun all 1,000 exact proofs, then build and publish. Validate actual mobile interactions, end-of-chapter/1000 progression, save upgrade and offline reopening on iPhone.
5. Assess shelter pacing and station/home rewards against reference evidence. Do not blindly implement every old plan item; the old superpowers plan is aspirational and has stale counts.

## Commands and safeguards

Windows uses `npm.cmd` / `npx.cmd` if PowerShell blocks npm.ps1. Node 24 is used by CI.

```text
npm run typecheck
npm test -- --configLoader runner
node scripts/campaign/generate.mjs
npm run build
node scripts/campaign/audit-bundle.mts
npx cap sync ios
npx netlify deploy --dir dist --alias next --no-build --site bc41ec96-bbad-4e56-b0d1-c612c54db038 --json
```

The generator and proofs are development-only. The production audit forbids solver, validator, generator and proof artifacts in the client graph. Commit generated chapter files and validation evidence. No runtime generation, random fallback, fake win flags, paid-powerup requirements or weakened schema checks to make a proof pass.

## Apple / no Mac

Paid individual account holder, Windows PC and iPhone. Build on GitHub Actions `macos-26`, Xcode 26. Bundle ID `com.lasmith1689.SlidingStars`, App Store Connect app ID `6817778193`. Internal group `Me` has automatic distribution. User has already configured all four repository secrets: APPLE_TEAM_ID, ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8. Never ask to paste a key or print it.

Use existing `.github/workflows/testflight.yml` and `.github/scripts/testflight.sh`: archive ad-hoc signed with entitlements; export automatic app-store-connect upload using the Admin Team API key and Apple's cloud-managed distribution certificate. Build number is run_number.run_attempt. Privacy manifest and encryption declaration already exist. Do not replace working signing with certificate/profile management. The earlier 1.0 (5.1) build was verified Testing in App Store Connect before this expansion.

## Copy-paste continuation prompt

Continue development of Sliding Stars in this folder. First read CLAUDE-HANDOFF.md, docs/2026-09-30-QUALITY-CONTROL.md and docs/2026-09-30-CAMPAIGN-CROSSCHECK.md, inspect Git status and current verification evidence. Preserve the original parent app, direct touch, automatic completion, cute art, concise board-specific guide, improved campaign rotation, verified route hints, saved progress and no-portals decision. Prioritize purposeful multi-step procedural variety and useful hints after player detours, then one complete new mechanic at a time. Keep generation bounded, booster-free proofs and shipped hint advice synchronized. Work efficiently without routine approval stops or spawning teams. Do not claim the 25-mechanic plan is finished: this checkpoint has 1,000 verified but often short template-based missions and 20 mechanics. Use the existing Windows/GitHub macOS signing workflow for TestFlight. Finish a tested increment, publish under existing authorization, and report actual remaining work and device-test limits.

## Earlier release verification (6.1, retained for provenance)

- Parent source checkpoint `36beb03`; public release source `1fd78f0dc999830a57d0be4010b43c09d6629a4e`.
- Web alias is live, deploy `6abd917f9a40900b6eebd98d`. Its production browser shows 1,000 missions. Local production at 390x844 loaded mission 1000, won through two real drag gestures, and automatically advanced to the first unfinished mission with saved rewards.
- Typecheck/build/iOS sync passed. Production boundary audit: 839 modules, 41 chunks, zero forbidden development campaign modules. All 994 tests / 109 files passed on both Linux CI and macOS TestFlight runners.
- CI success: https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36787522319 .
- TestFlight build **1.0 (6.1)** successfully cloud-signed and uploaded at 2026-09-30 22:50:38 UTC: https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36787522322 . Logs explicitly say Upload succeeded and EXPORT SUCCEEDED.
- **Apple processing/internal availability of 6.1 has not been verified.** App Store Connect browser session expired and now requires account-holder sign-in. Earlier 5.1 remains the last independently confirmed Testing build. Next device step: open TestFlight and check for 6.1, or sign in to App Store Connect and verify Me has 6.1. Never report upload alone as installability.
- No private keys were read or committed. Original app and production preserved. Temporary preview server stopped and phone viewport reset. Only unrelated parent `docs/reviews/` was left untouched.
- Approximately 13% of the user's weekly Codex allowance remained at handoff. The user explicitly wants to continue efficiently in Claude Code; the copy-paste prompt above supplies the task and safeguards. No additional Codex thread is required.

## QC release verification (latest)

- QC source: parent commit `91a7f93`; public release source `57f17b92a3152d142a90a564cd3ef4a88eb2cdf9`. Later documentation-only commits update this handoff without changing the binary.
- Live web alias: https://next--sliding-stars.netlify.app/ . Verified deploy `6abd9eca44f1240bfa46bca2` loads the concise guide and route hint. Original production is unchanged.
- **1.0 (7.1) uploaded successfully to Apple at 2026-09-30 23:48:13 UTC.** The logs explicitly confirm Upload succeeded and EXPORT SUCCEEDED: https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36792476666 .
- All **1,018 tests / 112 files passed** locally, on Linux CI and on the macOS TestFlight runner. Linux run: https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36792476789 . Production audit, build and iOS sync passed. Web and native bundles each include all twenty hint chapters; all twenty level chapters are packaged offline.
- Physical device installation, offline relaunch and Apple's internal-testing availability of 7.1 remain unconfirmed. App Store Connect previously required account-holder sign-in. Check TestFlight for 7.1; don't equate successful upload with confirmed installability.
- Browser checks: mission 1 won and advanced to 2 at 390x844; concise guide and crate coaching inspected; mission 801 won through two real drag gestures and automatically advanced to 802 at 320x568. Its long label was shortened after spotting overlap. Temporary local server stopped and viewport restored.
- Start the next development increment with the prioritized QC follow-ups above. Approximately 7% of weekly Codex allowance remained near the end of QC, within the user-authorized ten-percentage-point spend. This is a tested beta checkpoint, not a declaration of all 25 mechanics or thousand-session fun.
