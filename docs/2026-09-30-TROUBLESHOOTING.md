# Troubleshooting checkpoint: September 30, 2026

## Findings and fixes

The previous winning-route-only checks were too narrow. Three deterministic randomized trials on every level, up to 15 moves each, now cover 29,969 accepted off-route transitions. Zero crashes, rejected enumerated moves, input mutations or serialized-save/schema failures. Outcomes: 1,612 wins, 40 normal losses, 1,348 unfinished. This is not exhaustive or human fun verification.

Fallback hints had real cycling: without shipped route maps, a 41-board/all-20-mechanic sample won only 31 within 12 moves and repeated arrangements at 750/900. Distance-to-station tie-breaking now follows goal/safety/obstacle priority. Runtime remembers up to 32 recent arrangements, excluding clock-only changes, and refuses revisits. Restart clears this history. Final sample: 38 wins, zero repeated layouts/illegal hints/mutations/losses. Missions 516, 600 and 900 remain unfinished within 12 moves; do not claim complete off-route solving.

Native background handling previously called recover() before marking the app inactive, allowing the victory timer to restart while document.hidden lagged behind the native event. Native and page visibility now explicitly gate completion before recovery. This is a source-confirmed ordering fix; physical iPhone interruption testing remains required.

## Evidence

1,034 tests / 114 files passed, including all exact 1,000 proof routes and route hints. Typecheck, build, production bundle separation and Capacitor sync passed. Reports: validation/campaign/random-play.json, fallback-hints-before.json and fallback-hints-after.json. Reproduce from the app root using node scripts/campaign/stress.mjs and node scripts/campaign/audit-fallback.mjs. Development tooling stays outside the production bundle.

Web deploy: 6abda9fe989d2e839f14030f at https://next--sliding-stars.netlify.app/ . Native upload verification follows in the handoff. Existing original app remains preserved.

## Outstanding release gaps and next work

- Physical iPhone: test interruption during a drag and victory, background/resume, force-close/reopen persistence, offline launch, sound and compact layout. Prior desktop-browser visual/drag checks are in the rescue-shuttle report; they are not iPhone verification.
- Strategic depth remains insufficient for a finished 1,000-level game: known proofs are 1-9 moves, content largely varies authored templates, and only 20 nonportal mechanics exist versus the requested 25+. Do not call the whole game finished based on tests.
- Fallback advice still cannot solve every deviation. Extend bounded planning with measured mobile latency, not fake winning guarantees.
- Apple upload success is not confirmed TestFlight processing or installability.

The account reached 99% weekly use. Preserve this handoff. Next concrete step is the physical-device checklist, then deeper procedural strategy and the remaining mechanics. Continue in the existing task; a new Codex thread is not required.
