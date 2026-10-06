# Fixed stations audit - October 6, 2026

The user's correction is the implementation contract: stations stay where they form. Bring crew to the glowing side entrance. The previous release incorrectly allowed station swaps and advertised them in help and winning routes.

## Changes

- Campaign and compatible legacy play reject dragging a station and swapping another piece into it. Rejection preserves the exact board, passengers, score, supplies and move count.
- Single and bulk transport reject stations, including direct calls. Gravity already treated stations as anchors. Occupied shuttles retain one-cell flight; empty shuttles still require a terrain match.
- Drag previews, failure messages, Guide and board-specific coaching explain the fixed entrance. Moving shuttle lessons distinguish a station-blocked route from an obstacle the player can clear.
- All 1,000 immutable missions have new verified routes and advice where needed. Shelter, jelly and reactor teaching routes retain causal mechanic coverage. Retired portal 379 depended solely on moving a station; historical saves remain readable, but it has no movable-station teaching claim and is absent from current release boards.
- A narrow boot repair removes the minimum practice jelly coatings only when a no-failure practice save has no legal non-consumable move. It refuses repairs that expose a pending terrain match. It preserves crew, stations, points, turn, objectives, RNG, supplies, wallet and progression. An already playable save is unchanged.
- Off-route advice scores actual terrain promotion beneath unsafe crew. Bounded hint search still uses 128 transitions / 180 ms in production and can decline without changing a save.

No mission definitions, starting seeds, objectives or rewards were rewritten. Campaign SHA-256 remains `9896b20b34aa2a3104a698427c709a53a57002cc06ae9b9f083c37b2f7a2a3c4`. An old saved station stays at its saved position and becomes fixed there; the update does not restart that board.

## Evidence

- Full local suite: **1,176 tests / 126 files passed**. Typecheck, production build and Capacitor synchronization passed.
- All **1,000 winning routes replay** with zero failures and zero pending revisions. Packaged advice contains **3,983 positions**. Routes span 1-12 moves, mean 3.983.
- Independent final review replayed all 1,000 levels and 3,983 moves, checked every existing station stayed identical, and validated all 3,983 packaged hints. It also probed conservative recovery and corrected dock coaching. No remaining findings.
- Production boundary: **873 modules / 61 chunks / zero development campaign modules**. Offline pack: **208 files**.
- Real 390-by-844 browser dragging completed Mission 3 in seven accepted moves with a fixed station. The original astronaut fell past the permanent hole. Station dragging and reverse swapping left the board and move count unchanged.

The [October 5 audit](2026-10-05-MECHANICS-AUDIT.md) retains earlier gravity, reserved-departure and home/VIP findings and broader research. Its movable-station assumption and four-move Mission 3 demonstration are superseded here.

## Reference limits and shuttle feedback

The [official Sliding Seas site](https://www.slidingseas.com/) describes merging terrain and rescuing survivors. Historical firsthand guides ([Player.One](https://www.player.one/sliding-seas-review-match-three-142252), [2022 illustrated guide](https://newsaround.tistory.com/38)) support the terrain-growth, shelter and move-clock comparison. They do not establish exact current commercial parity for every interaction. Station immobility is the user's explicit requirement.

The empty MATCH shuttle complaint remains a distinct usability concern. The visible screenshot can be navigated under fixed-station rules in a reconstructed state, but actual saved RNG and passenger IDs are unknown, so that reconstruction is not a promised device route. An optional choice between adjacent-crew pickup and making shuttles only from crew-carrying matches is unanswered. Preserve the previously approved empty-shuttle match requirement until that choice is resolved; do not claim every commercial interaction is solved.

Next: verify the released web route and exact new native build, then test Mission 3 on the iPhone with existing progress. Continue in this thread; no new thread is required.
