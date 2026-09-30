# Validation — September 25, 2026

## Automated evidence

- 146 tests across 28 files passed. Includes new move legality, frozen shuffle, survivor transport, special combos, rover detours/final delivery, transactional saves, modal/animation locks, booster targeting, result deduplication, malformed nested saves, authored lessons and station archive/cost guards.
- TypeScript strict check passed.
- Production build passed. Delivery art: 72.14 MB → 1.81 MB. Full distribution approximately 3.32 MB; 78 precached files plus the generated service worker.
- 100-level generator/hint audit: **0 illegal opening hints**, **0 fallback substitutions**, **0 frozen-cell movements** in its shuffle check. Baseline review found 39 illegal opening hints. Generation took 24.8 seconds total in this development host (slowest 1.74 seconds); later mission preparation now runs in a worker so this work does not freeze input.
- Original preservation: SHA-256 comparison of **137 original files**, **0 changed**. The manifest is `docs/original-manifest.json` and records paths relative to the parent project. No original save keys, deployments or Git history were changed.
- Generator tests performing 30–70 complete solver searches have explicit 30-second limits. One run exceeded Vitest's generic 5-second limit for 30 searches; no gameplay assertion failed. The final complete suite passed after assigning an appropriate bulk-test timeout.

## Browser checks

- Real drag playthrough of missions 1–3, including station creation, a pod cascade, a five-slide station delivery, botanist rescue and the first greenhouse build.
- Invalid demolition target retains selection and charge; a subsequent valid target consumes one charge. Reload preserves the altered board and spending.
- Store-open board drag leaves the board unchanged. Purchase and close preserve both board state and the correct wallet balance.
- Reload at the victory screen preserves claimed rewards. After building and customizing, another reload preserves 4 lifetime rescues, the greenhouse, sunset atmosphere and garden arrangement.
- Worker-generated mission 4 loads as a supply mission with a 60-turn budget and visible crate hit counts.
- Phone layouts checked at 390×844, 375×667 and 320×568. Resize updates both canvas and board layout. Small portrait coaching has its own reserved space; short landscape windows receive a rotate/enlarge prompt.
- Oxygen originally blended into the inherited bubble art; visual testing caught this and replaced it with a high-contrast `O₂ 25` badge. Obstacle labels were moved above overlay sprites after a visual check caught obscured hit counts.
- Production launch showed no console errors or warnings in the inspected session.
- Production offline reload was tested by stopping the local preview server and reloading. The first attempt reproduced a cache miss caused by Vite's `Vary: Origin` header differing between precache and module requests. The worker now ignores `Vary` when reading its own same-origin static cache. After rebuilding on a fresh localhost origin, the full app and artwork loaded with the server stopped, and the offline-ready message was visible. This verifies browser offline loading, not iOS eviction/lifecycle behavior.

## Independent review

A fresh read-only reviewer inspected the implementation against `UPGRADE.md` and the original code. One important issue was reproduced and fixed: malformed nested station archives or VIP values could pass save validation and break later screens. Six regression cases failed before the fix and passed afterward. Initial mask/column consistency and catalog/theme enums are now also validated.

The reviewer also found a final-step rover animation omission. The event now carries the rider ID after the rover retires; a regression first failed and then passed. This was included because hazard/rover animation repair was already in the requested upgrade scope.

The reviewer did not assess visual quality, browser interaction, long-term balancing or exact commercial-game parity. The browser checks above cover the first two; balancing and parity limitations remain explicitly documented.

## Remaining device checks

Physical iPhone Safari, Add to Home Screen, actual touch ergonomics, long-session battery/performance and offline lifecycle after OS eviction have not been verified. This is a deployed web/PWA build; no native wrapper was created.

## HTTPS deployment — September 25, 2026

- Published only this folder's `dist` to **https://next--sliding-stars.netlify.app**, a separate Netlify alias. Deployment ID: `6ab6d503552deacadc399f8e`.
- Verified HTTP success and exact SHA-256 equality for all **79 deployed files**, including the generated service worker, installation manifest and Apple Home Screen icon.
- Live browser launch displayed **Offline pack ready** and successfully opened mission 1. Existing local offline-reload verification is recorded above; physical iPhone installation remains an on-device check.
- Netlify's original production deployment remained `6a4d4001f113637e6eb48946` before and after publication. The `next` alias does not replace `https://sliding-stars.netlify.app`.
