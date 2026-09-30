# Quality-control pass: clarity, pacing and playable hints

User requested a focused fun/visual QC pass within ten percentage points of weekly Codex allowance. Started at 87% used; stayed below the 97% ceiling. This is an evidence-based improvement pass, not a claim that automated tests establish subjective fun.

## Problems found and fixed

| Finding | Revision | Evidence |
|---|---|---|
| Mission 1's guide explained almost every future mechanic, burying basics and settings | Three basic steps, a visual terrain chain, current objectives and only mechanics present on the board. Optional supplies are collapsed. | Inspected at 390x844; new guide tests cover every released mechanic and prevent future-rule leakage. |
| First crate/ice/rover/reactor/comet boards often displayed only generic drag instructions | Short contextual coaching explains the current obstacle and that deadlines count moves. | First crate board inspected in the browser; actual mechanism rules checked against engine modules. |
| Dark playable tiles could resemble holes; a phase label spread across neighboring cells | Thin tier-colored tile edges preserve the artwork and expose the board shape. Phase labels shortened to OPEN/CLOSED/WAIT; full explanation remains below. | Opening and crate boards at 390x844; phase board 801 at 320x568. Controls and coaching remain separate. |
| Nearby generated missions repeatedly reused their template, and late game concentrated on docks/phase | Deterministic weighted rotation favors less-recent templates and mechanics; periodically favors longer proven sequences followed by gentler recovery | Adjacent same-template pairs 221 to 0; adjacent same-mask pairs 202 to 0. Late-window dominant family share 44–58% to 10–16%. Proofs at least five moves: 60 to 146. |
| Greedy hints could swap the same pair repeatedly without progress | Optional next-move advice keyed to the exact game state, derived from verified routes and loaded by chapter. Heuristic fallback now values obstacle damage/growth, not just completed goals. | Before: 26/41 sampled missions won within 12 hints, six cycling boards. After: 41/41 won, no cycles, illegal hints, losses or state mutation. Separate tests follow only committed hint advice through all 1,000 missions. |
| Failed automatic advancement could leave a dismissible dialog over a completed, disabled board | Save-retry panel remains available until saving/advancement succeeds | Existing persistence/completion regressions retained; no reward or progress changes. |

## Content and verification

The revised campaign still has exactly 1,000 unique opening puzzles and 102 unchanged authored boards. It now has 62 distinct masks, nine shape families, and twenty implemented mechanics. Longer existing proofs are used more often, but proofs remain 1–9 moves and are not measured shortest solutions. Every candidate still needs a booster-free winning replay; exhausting the bounded generator reports failure instead of substituting unproved content.

There are 3,041 player hint entries across twenty chapter files. These are shipped game advice, distinct from the development-only proof objects, validator, generator and solver. The production audit also excludes hint-authoring code. Hint lookup verifies the current state fingerprint and legal transition before showing advice; asynchronous results are discarded if the board, gesture or dialog changes while loading. Existing immutable saved boards are preserved; older generated definitions can fall back to the heuristic until a newly revised mission is started.

Desktop QC timing for already-loaded route advice, including state hashing and transition verification: median approximately 0.82ms, maximum 2.12ms in the 41-board audit. These are desktop measurements, not iPhone performance claims.

Reproduce evidence:

```text
npm run typecheck
npm test -- --configLoader runner
node scripts/campaign/qc-play.mjs
node scripts/campaign/pacing-report.mjs
npm run build
node scripts/campaign/audit-bundle.mts
npx cap sync ios
```

Reports: `validation/campaign/generated/pacing-{baseline,after}.json` and `qc-play{-before,}.json`. To regenerate both levels and their matching hint advice, run `node scripts/campaign/generate.mjs`. To rebuild advice from unchanged committed levels/proofs, run `node scripts/campaign/export-hints.mjs`.

Local integrated verification: 1,018 tests across 112 files passed. Typecheck, production build, iOS synchronization and production boundary audit passed (861 modules, 61 chunks, no development campaign tooling). Browser gestures completed mission 1 at 390x844 and phase-door mission 801 at 320x568. Completion automatically advanced to the next unfinished mission. The offline package contains all twenty chapter files and twenty hint maps.

## Judgment and remaining work

The opening rescue and crate lesson are readable, responsive and easy to understand in browser play. The compact phase board retains distinct holes, visible crew and reachable controls. The improved rotation and useful hints remove concrete sources of boredom and frustration. That supports a stronger playable beta, not a guarantee that a person will enjoy a thousand sessions.

Highest remaining priorities: physical iPhone play for touch/offline/save checks; multi-step strategic generation beyond terrain mutations; useful bounded hints after deviations from recognized routes; five additional complete mechanics to reach 25; and stronger station/VIP rewards. Do not use the sampled hint win rate as a human engagement measurement, or claim the full original game plan is complete.

## Published checkpoint

QC source `57f17b9` is live on the `next` Netlify alias, deploy `6abd9eca44f1240bfa46bca2`. Production startup, route hint and the concise guide were verified there. TestFlight **1.0 (7.1)** successfully uploaded at 2026-09-30 23:48:13 UTC; [the macOS run](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36792476666) and [Linux CI](https://github.com/lasmith1689-sys/sliding-stars/actions/runs/36792476789) both passed all 1,018 tests. Apple processing/internal availability and real iPhone testing remain to be confirmed. See the latest section of CLAUDE-HANDOFF.md for continuation.
