# Rescue-shuttle revision (September 30, 2026)

User issue: the gold ring looked like an outer-space raft, could swap without matching, and had no apparent purpose.

- Replaced its production texture with a sealed ivory/purple/teal rescue spacecraft. Original pod.png is retained, and the parent original game is untouched.
- Empty shuttles must create an ordinary terrain match when swapped. An occupied shuttle has powered one-cell flight and carries its guest to a station entrance. Stations retain their existing repositioning rule. Cargo capsules still require matches below them and never direct-swap.
- Board badges distinguish MATCH and passenger count ABOARD. Touching either shuttle explains its rule. Four-tile merges collect the guests participating in that merge; empty shuttles do not magically rescue unrelated crew.
- Repaired affected authored routes. Redesigned mission 114 as two separate capsule departures. Replaced empty shuttle placeholders with ordinary platform terrain in key lessons 561-565 and combined lesson 805.
- Regenerated 1,000 distinct booster-free winning boards and 3,023 verified hint entries, with 63 masks and all 20 implemented nonportal mechanics. Preserved pacing checks by spending more generation attempts on the intended long/short pool. Proof length is 1-9 moves; this does not prove human enjoyment.
- One-time save migration prepares the current unfinished mission using the new catalog. Completed levels, rewards, wallet and attempts remain intact; already won missions are preserved. This reset is necessary because old routes could depend on now-illegal empty-shuttle moves.

## Verification

1,026 tests / 114 files passed. Typecheck, production build, production bundle audit and Capacitor iOS sync passed. All 1,000 exact proof routes and hint maps replayed. The 41-board hint QC sample won 41/41. At 390x844, physically dragged a loaded shuttle in lesson 473 twice and rescued the guest; lesson 758 rejected an empty-shuttle nonmatch with zero moves spent and explanatory feedback. This is desktop browser verification, not physical iPhone testing.

## Art provenance

Built-in image_gen used with public/art/home.png as style reference. Saved project asset: public/art/rescue-shuttle.png. Delivery compression is handled by the existing prepare-art script. Source and alpha preserved.

Prompt: Create one production game sprite on a genuinely transparent background. Reference is STYLE ONLY: cute polished chunky pixel-art space station with dark purple outlines, warm ivory metal, teal windows, golden highlights, three-quarter isometric view. New subject: a tiny enclosed RESCUE SPACE SHUTTLE, clearly a spacecraft and never a boat or inflatable raft. Rounded ivory capsule hull, broad sealed teal cockpit window, two small purple side thruster nacelles with tiny cyan exhaust, gold rescue beacon. Empty cockpit, no people, no lettering, no crosses or logos. Friendly compact toy proportions, crisp silhouette readable at 48 pixels, centered square composition, object fills 85 percent of canvas with transparent margin. No planet, platform, water, ground, white sticker border or background. Match reference pixel-art palette and lighting. Save single transparent sprite.

## Next work

Test the new empty-versus-occupied distinction on the physical iPhone. Decide from that playtest whether powered shuttle flight remains enjoyable; do not silently restore unlimited empty-piece swaps. The broader backlog in CLAUDE-HANDOFF.md remains: deeper procedural strategy, off-route hints and remaining genuinely new mechanics. No new Codex thread is required.

Web-cache follow-up: confirmed the live browser was loading obsolete index-BQ4cP84v.js even after refresh. The service worker now activates only after its complete offline pack has downloaded, without waiting indefinitely for old tabs to close. A subsequent reload receives the new build. Claimed legacy victories and unfinished legacy sessions enter the campaign while preserving wallet/station data; unclaimed victory rewards are left accessible. Final deploy ID: 6abda624cb21a77e899952fa.

Live verification: the existing web installation required one hard refresh to escape its old cache. It then loaded index-DO7Sc56M.js, advanced a claimed legacy mission 1 to campaign mission 2, retained all 650 credits, and stayed on the corrected campaign after a subsequent normal reload. Advise returning web players to fully close/reopen or refresh once; do not clear site data. Native TestFlight packages bundle assets and do not use this web service worker.

## Verified release: rescue shuttles, build 9.1

- Public source commit: e94ec3a; parent commit: 177059a. Core shuttle change: public bfced4d / parent ba17b28.
- Live improved web: https://next--sliding-stars.netlify.app/ . Final deploy: 6abda624cb21a77e899952fa. Original production remains preserved.
- TestFlight 1.0 (9.1): https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36795323896 . Job 110157362733 completed successfully. Logs at 2026-10-01 00:23:06 UTC report Upload succeeded, EXPORT SUCCEEDED and Uploaded Sliding Stars 9.1. All 1,026 tests / 114 files passed on the macOS runner. CI run 36795324000 also succeeded.
- Earlier core-only build 8.1 uploaded successfully as well; install 9.1 when Apple finishes processing because it includes returning-player migration.
- Apple processing, internal-testing availability and physical-iPhone install/play remain unverified. Do not describe upload success as confirmed TestFlight availability. Existing Apple browser session requires user sign-in for that check.
- Next concrete step: on the iPhone install 9.1 when it appears, then test a four-tile crew merge, empty-shuttle rejection, loaded flight and station rescue. In the web app, fully close/reopen or refresh if it still shows the old interface; do not clear saved data. No new Codex thread is required. Continue broader development using the existing handoff after this physical-device check.
