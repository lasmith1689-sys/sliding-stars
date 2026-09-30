# Sliding Stars Next — design, research, and execution record

## Brief
Preserve the original project. Deliver a separate, playable improvement of the space rescue-and-home-building game, addressing the September 25 review and strengthening its Sliding Seas-inspired mechanics. Keep Zena, Pepper, original art, portrait touch play, and offline capability. Do not deploy or replace the existing site.

## Research, checked September 25, 2026

- [Current iPhone listing](https://apps.apple.com/us/app/sliding-seas/id1436245163): version 2.4.7 is listed with a September 9 update. The developer describes terrain merging, rescue/penguin/turtle/pirate/treasure modes, VIPs, decorations, optional power-ups, daily missions and weekend events, and offline play. This is the current public feature description, not direct testing of the installed commercial app.
- [Developer game page](https://www.mugshotgames.com/games/sliding-seas/): confirms the combination of rescue puzzles and a customizable home. Its published screenshots were inspected: three depths of water, sand/grass, survivor positions, volcanoes, irregular boards, turn-limited objectives, a three-booster tray, and choices between buildings. The screenshot files date from 2021; they are not evidence of all current rule details.
- [Official game website](https://www.slidingseas.com/): identifies volcano, pirate, whirlpool and treasure variety, plus a home that grows with play.
- [Published promotional screenshot analysis](https://mwm.ai/apps/sliding-seas/1436245163) and [older gameplay description](https://download.com.vn/sliding-seas-cho-android-165399) corroborate special larger combinations yielding rafts/shelters. Exact thresholds vary in the available descriptions. Our space combo rules below are an explicit adaptation, not a claim of exact current parity.

## Design decisions

Use the existing tested puzzle engine and Pixi board, and replace the canvas-only menus/HUD with responsive accessible HTML controls. This cleanly separates board gestures from modal controls, adds readable phone layouts, and supports browser-level integration checks. Keep gameplay animations on the board.

1. Shared move legality for core, drag and hints; goal-aware hints prefer endangered crew and rescue entrances. Shuffle only loose terrain and carry its riders. Pods and stations can slide without matching. Rovers use shortest-path routing around obstructions.
2. Preserve normal three-tile terrain upgrades and tier-5 station creation. Add deliberate four-or-more combos: danger tiers 1–3 produce a safe rescue pod; safe terrain tiers 4–5 produce a station. The same rule applies to connected L/T/+ matches. Pods can be moved to an entrance; they do not indefinitely trap a rider. A separate rules card teaches these adaptations.
3. A single versioned run record owns the board, wallet, level, station, claimed result, and preferences. Commit moves/rewards before animation. Reload restores the exact run, including RNG and timers. Use a new storage key and a distinct port so existing saves are not touched.
4. Explicit input modes: playing, animating, modal, targeting. No move can run against an unseen future state. Invalid targets retain booster selection. Menus pause interaction, and restart is an explicit action.
5. Authored introductory rescue levels with contextual coaching; first VIP and first module within the opening three missions. A complete help screen remains available. Oxygen is visible from the start; safe crew have a readable safety state. Show terrain progression, station entrance markers, and legal combo preview.
6. Improve the home: persistent completed-station archive, browsable crew, module descriptions, visible construction requirements, selectable color theme and module arrangement. Avoid pretending that two catalogs provide endless new crew: after both stations are complete, keep the fleet and continue rescue missions.
7. Separate outcome copy for rescue and supply missions, visible hazard/rover events, sound toggle and reduced-motion preference. Use worker generation for later levels, prefetch the next board, and never return an unverified fallback.
8. Preserve existing rescue/salvage/escort/hazard variety. Pirate combat, rotating whirlpools, penguin events and server-backed daily events remain explicit reference gaps, not features this build claims to have. Improving the complete existing rescue loop takes priority over thin imitations of every event mode.

## Implementation checklist

- [x] Core rules: blocked hints, shuffle riders, large-match combos, rover detours, verified generation with a retryable error on exhaustion. Regressions passed; 100-level audit found zero illegal hints and zero fallback substitutions.
- [x] Run ownership: atomic saves, reward deduplication, spending, modal/animation locks, retry/resume. Reload checked after a move, win, station build and customization; malformed nested saves rejected.
- [x] Intro/progression: three authored levels with verified solutions; early VIP/build; station archive, guarded builds, layout/theme persistence. Both catalog completions tested without discarding homes.
- [x] Player interface: responsive HTML HUD/dialogs, board hints and previews, visible oxygen/hazards, grouped riders, help/settings/outcomes, optional audio, worker generation.
- [x] Integration: phone viewport playthrough, boosters, blocked modal swipes, reload, resize, home controls. 146 tests, typecheck and production build passed. 137 original-file hashes matched. Production offline reload verified with the server stopped.

## Review focus
Fast gestures during cascades; opening menus with a booster armed; reload at a win boundary; changing viewport with a dialog open; saves containing invalid board dimensions or unknown data. These must leave the game usable without spending twice or losing progress.

## Execution
Continuous implementation in this task, as requested. The prior review and user's explicit request authorize the improvements; additional phase approval stops are not needed. All edits stay under `sliding-stars-next`. Documentation is a record of decisions and validation, not a deployment authorization.

### Decisions and review record

- Generation exhaustion uses a visible retryable error instead of inventing a simpler fallback mission. This preserves the requested objective and guarantees that unverified boards are not presented; the tradeoff is an occasional retry if no candidate passes.
- The opening levels teach the existing art as biospheres and flowering habitats rather than calling a visibly grassy tile a gold landing pad.
- Source PNGs are retained, while deterministic WebP delivery copies reduce loading and offline storage. No reference-game artwork was incorporated.
- Original preservation was implemented as a folder copy, with no new Git history or deployment changes. The execution record stays here rather than being deleted after completion.
- The independent review's malformed nested-save issue and final-step rover animation issue were fixed and covered by regressions. No reported issue remains deferred. Long-term balance, exact commercial parity and physical device behavior remain outside the evidence claim.

Detailed results: [VALIDATION.md](VALIDATION.md). Launch instructions: [../README.md](../README.md).
