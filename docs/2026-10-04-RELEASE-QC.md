# Campaign completion and release QC — October 4, 2026

This is the current checkpoint. September reports retain historical evidence; their unfinished-mechanic counts are superseded.

## Gameplay

All 25 nonportal families are playable across 1,000 missions. Magnets replace portals at 376–380; relays arrive at 841–845, tethers at 881–885, repair at 921–925 and rendezvous at 961–965. Each new family has five progressive lessons, strict state validation and causal winning tests. Later practice revisits all learned families. Late 50-level windows revisit 20–22 families, strongest family share 10–16%, with no adjacent template repetition.

The campaign contains 127 authored boards and 873 accepted deterministic variants. All 1,000 initial fingerprints are unique: 68 masks, nine shape families and 16 bounding sizes. Exact booster-free proofs all replay. Campaign SHA-256: 9896b20b34aa2a3104a698427c709a53a57002cc06ae9b9f083c37b2f7a2a3c4. Generation uses a finite 360-attempt cap and has zero unresolved candidates.

Proof depth is 1–9, mean 3.364. After mission 100, 544/802 generated puzzles have at least three proof moves, 226/802 at least five. Variants still share authored goal structures. This establishes solvability and broader pacing, not 1,000 human-playtested strategies.

## Sliding Seas crosscheck

Saved [broader research](SLIDING-SEAS-BROADER-RESEARCH.md) and [crosscheck](2026-09-30-CAMPAIGN-CROSSCHECK.md) include official information, independent reviews and player posts. Their recurring characteristics remain our reference: match terrain, grow shelter, actually rescue vulnerable people, vary boards/objectives and retain readable cute scenes.

Empty shuttles now require a terrain match; supply and repair puzzles require causal actions. Winches, tether harnesses and bot tools use space imagery. Portals remain absent. The references do not prove Sliding Seas generates procedural levels: deterministic verified generation is this user's requested adaptation. Our 25 mechanics are our implemented design, not a claimed inventory of the reference game.

## Verification

- Full suite: **1,149 tests / 119 files passed**; TypeScript passed.
- Campaign: 721 tests / 60 files passed, including all 1,000 exact proofs, 25 new causal teaching proofs, strict rejection, legacy saves and held magnet cargo.
- Presentation: 162 tests / 27 files passed, including dragging either tether end, cancellation, reduced motion and correct event projections.
- Production build and Capacitor sync passed. Offline pack: 208 files. Bundle audit: 869 modules, 61 chunks, zero development campaign modules.
- Browser at 390×844: mission 1 won and auto-advanced; magnet delivered supply after a match; tether moved from its second end and released both guests; repair collected its kit before restoring; relays activated in order; rendezvous kept the first shuttle waiting and counted both departures together. Guide remained readable/scrollable at 320×568.

The client includes 3,364 verified advice positions. A 52-mission sample covering all families finished 52/52 on route advice, without illegal moves, mutation or repeated layouts. One-turn fallback alone won 47/52 within 12 moves; five remained playing without losses or invalid moves. The separate asynchronous detour helper has two tests and bounded yielding/cancellation; the sample does not measure its detour win rate.

Website updates now request live navigation HTML while retaining one previous asset cache, so open older tabs can still load lazy chapters. Offline navigation falls back to packaged pages. Native installs bundle assets and use native storage, separate from Safari progress.

Physical iPhone touch, interruption/save and offline reopening remain unverified. Human feedback may identify balance improvements despite winning proofs. Do not claim subjective fun or universal detour safety.

## Release

Publish only the improved Netlify next alias; original source and production are preserved. iOS export is now eligible for public TestFlight and App Store distribution. Invitation: https://testflight.apple.com/join/7w5XTsgG. It requires eligible build processing and external approval before installation.

The listing, support/privacy pages and actual simulator capture workflow are prepared. Apple's contact is blank and browser sign-in is pending. Contact reuse from Ai Sky requires explicit permission; no private values entered source/chat. [Release instructions](app-store/RELEASE.md) record website steps and actual delivery status.

Next: publish verified code, verify Apple processing/screenshots, finish missing Apple fields and submit reviews. Continue in this thread; no new thread is required.
