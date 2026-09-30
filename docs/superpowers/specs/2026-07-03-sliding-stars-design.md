# Sliding Stars — Design Spec

**Date:** 2026-07-03
**Deadline:** 2026-07-12 (Zena's birthday) — playable, polished, and installed on her iPhone before then.
**What it is:** A space-themed, mechanically faithful remake of *Sliding Seas* (Mugshot Games), built as an installable PWA for iPhone. Nothing more, nothing less: the original's mechanics and gameplay loop, reskinned as terraforming a dead planet sector, with subtle personal touches for Zena.

## Purpose & success criteria

Zena plays Sliding Seas a lot and knows its rules cold. Three previous remake attempts failed on: (1) wrong mechanics, (2) clunky feel, (3) cheap-looking art. Success means:

1. **Mechanics** — someone who knows Sliding Seas recognizes every rule instantly; no drift into generic match-3.
2. **Feel** — swaps track the finger, animations are springy and juicy at 60fps; nothing feels like a webpage.
3. **Look** — cohesive, charming, readable art; the tile hierarchy is legible at a squint.
4. **iPhone experience** — launches fullscreen from a home-screen icon, works offline, no scroll/bounce/zoom artifacts, no address bar.
5. **Endless content** — handcrafted opening arc plus generated levels; she never runs out.

## Delivery

Installable PWA hosted at a clean static URL (Netlify, Vercel, or Cloudflare Pages — decided at deploy time). iOS specifics: `apple-mobile-web-app-capable`, standalone display, icon set + splash, safe-area insets honored, `touch-action: none` on the game surface, no double-tap zoom, audio unlocked on first touch, localStorage/IndexedDB persistence. Target devices: iPhone Safari (primary), desktop browsers (dev convenience only).

## Source-of-truth research

Studied frame-by-frame: [Level 1–10 guide](https://www.youtube.com/watch?v=wE0UUKDhaLA) (the gift's reference video), [Level 51–60 guide](https://www.youtube.com/watch?v=RYt2LOBZxw0) / [51–60 alt](https://www.youtube.com/watch?v=OJF8TanPx48), [Level 1000](https://www.youtube.com/watch?v=pdploHy7egM). Plus store/press descriptions (App Store, mugshotgames.com, hardcoredroid, player.one, appgamer).

Confirmed by direct observation and/or the user:
- Tutorial text: "Swap tiles to match 3 in a row"; **moves are adjacent-tile swaps** (user-confirmed).
- **Gravity refill** (user-confirmed): after a merge, empty slots fill from the tile above; new tiles enter from the top of the screen.
- Match 3 → tiles **merge into one tile of the next tier** (observed: three shallow tiles became one glowing sand tile).
- Match 4 → **life raft** (observed tutorial callout "MATCH 4 LIFE RAFT!").
- Tile tiers (observed): deep water (3 waves) → mid water (2 waves) → shallow (1 wave) → sand (dune texture) → grass (green). Grass tiles host **huts** (shelters).
- Survivors stand on tiles or float in open water; **need bubbles**: life-ring (rescue from water), hut icon (wants shelter). Needs have a ~12-move countdown (press sources) before the survivor is lost and the level fails.
- HUD (observed): survivor goal counter ("0/4", "0/5", "0/15" at level 1000, "4/11" pirates at ~level 54), gem counter, settings gear; three power-up slots bottom center — dynamite, tornado, magnet; later the third slot shows a **rocket**.
- Boards are **irregular masks** (organic shapes with holes), growing from ~3×3 tutorial clusters to ~7×9+ by level 1000.
- Rescue **speedboat** arrives carrying/collecting survivors (observed at ~level 54).
- Later-level overlay objects (observed at level 54/1000): **corals** (pink/teal, sit on tiles), **barrels/crates**, **treasure chests floating in open water**, **pirate characters**; press confirms modes: ocean rescue, pirates, whirlpools, treasure, volcanoes, turtles, penguins; goal styles: "breaking crates of goodies", "dropping survivors to the bottom", "blowing up pirate ships", "getting people to a village or mountain".

**To verify at implementation time** (frame-step the videos at specific moments; confirm with the user at first playable):
- Whether a swap that produces no match is allowed or snaps back.
- Exact merge position rule (merged tile lands on the swapped-in cell vs. pattern center).
- Whether matches can chain into cascades after gravity refill, and how the original scores/celebrates cascades.
- Whether there is any per-level move limit (none observed in HUD; pressure appears to come from need timers).
- Exact need-timer length and its on-screen representation.
- Raft behavior details (does the raft drift? who can board? how does the boat interact?).
- Shelter creation rule (max-tier match vs. "match more than 4", per press).

## Amendments (2026-07-03, after first-playable review with the user)

**Rescue chain (corrected against video frame at 1:30 — goal chip shows person+hut):**
survivors ride their tile through merges and falls (visually and mechanically);
reaching land (tier ≥4) makes them `grounded` with a fresh **shelter need**;
matching 3 max-tier tiles lands a **rescue shuttle** (replaces "hut/dome" as the
safe zone, per the user); grounded survivors on/adjacent to a shuttle walk
aboard — THAT is what counts as rescued. Early levels pre-place land tiles
(confirmed in video) so shuttles are reachable from level 1.

**Refill (tamed to match the original's calm boards):** spawns are tier 1–2,
chosen to avoid completing an instant match; escape pods come only from
player-made match-4s, never from cascades.

**Call-outs:** need bubble + countdown bar appear when the timer is ≤12 moves
(grace period before that, like the original's "calling out").

**Art direction (user-provided reference, "Orbital Drift" mockup):** cute,
chunky pixel art, Stardew Valley vibes — every tier is a distinct MATERIAL,
not a color step: 1 void current (swirl) → 2 debris field (rubble) →
3 platform (stone slabs) → 4 biosphere (grass + flowers, first solid tier) →
5 launch pad → shuttle. 24×24 pixel grid per tile, dark outlines, top-light /
bottom-shade relief, luminance still ramps strictly upward (guarded by test).

**Auto-shuffle (user request):** whenever the settled board has no legal move
(after a move resolves, or at level start), loose tiles auto-shuffle — retried
until playable and match-free. Pods and shuttles stay put.

**Points economy (user request):** accomplishments earn points shown in a
crystal HUD chip with floating "+N" popups — merge 10×tier, 4+ join +20,
escape pod +30, shuttle landed +100, drifter grounded +50, rescue +200,
special-tile breaks reserved for overlays (Plan 3). Power-ups are purchased
with points (demo charge 300, wormhole shuffle 200, tractor beam 400), never
tick need timers, and demo refuses targets under survivors.

## Research pass 2 (2026-07-03, frames from Level 11–20 guide + press)

Confirmed original mechanics, mapped to incorporation status:

| Original (observed/press) | Status in Sliding Stars |
|---|---|
| Combos (cascade matches) score extra | ✅ have (cascade escalation + points) |
| 12-move call-out with life-preserver bubble | ✅ have (call-out at ≤12) |
| Goal-limited levels show a **"N TURNS" counter** (e.g. collect-valuables level with 19 turns) | 🔶 incorporate now: optional per-level move limit |
| **Collect-N-valuables goal**: crates sit ON tiles, break to collect ("3 VALUABLES TO GO!") | Plan 3: supply canisters + goal type |
| **Ice/frozen tiles** blocking movement until broken | Plan 3: cryo-crystal obstacle |
| **2×2 mega-tiles** occupying four cells | Plan 3 stretch (complex; observe more first) |
| Power-ups are **inventory items with counts**; "+" badge buys more with gems | 🔶 incorporate now: buy-then-use model |
| **Hint system**: game suggests a move (toggleable in settings) | 🔶 incorporate now: idle hint pulse |
| **VIP survivors** worth bonus currency; caged VIPs freed on board | Plan 3/4 (ties into colony buildings) |
| Ridge/mountain tier & village/mountain delivery goals | Plan 3: summit-station goal tiles |
| Multiple survivors gather on one tile | 🔶 incorporate now: stacked rendering offsets |
| Pre-level "testing opportunity" tutorials for new mechanics | Plan 3: mechanic-intro screens |
| Gems can extend a failed run | Plan 4 (gift-friendly "+5 turns" offer) |
| Rescued survivors' island grows; buildings request VIPs | Plan 4 colony |

## Theme mapping (ocean → space, 1:1)

| Original | Sliding Stars | Reading |
|---|---|---|
| Open sea background | Open space, subtle starfield | Darkest value on screen |
| Deep water · 3 waves | Dense nebula · 3 energy wisps | Dark violet |
| Mid water · 2 waves | Thin nebula · 2 wisps | Violet-blue, lighter |
| Shallow · 1 wave | Stardust cloud · 1 wisp | Pale, bright |
| Sand · dunes | Regolith rock · craters | Warm ochre |
| Grass (max) | Living terraformed land | Vivid green |
| Life raft (match 4) | Escape pod | Wood → capsule |
| Hut/shelter (max-tier match) | Habitat dome | |
| Survivors swimming | Colonists adrift in EVA suits | |
| Rescue speedboat | Rescue shuttle (Pepper co-pilots) | |
| Dynamite | Demolition charge | breaks one tile |
| Tornado | Wormhole shuffle | rearranges board |
| Magnet | Tractor beam | pulls survivors toward a tile |
| Rocket power-up | Rocket (kept as-is) | |
| Gems | Gems/crystals (kept) | |
| Home island meta | Home colony meta ("growing planet") | |

**Visual hierarchy is a hard requirement.** Tier must be readable two redundant ways: a strict brightness ramp (void darkest → living land brightest/most saturated) and a symbol count (3/2/1 wisps mirroring the original's wave counts; regolith and living land get unmistakable texture identities). Higher tiers gain visible edge relief so terrain reads as rising out of space. The merge animation itself teaches the chain (3 fuse → next tier). A progression strip appears in the pause menu as backup; the board must never require it.

## Core rules (the mechanics spec)

- **Board:** per-level irregular mask over a rectangular grid (portrait, up to ~7×9 playable). Cells are: out-of-play, open space, or occupied by a tile (tier 1–5), possibly with an overlay object and/or a survivor.
- **Move:** drag a tile onto an orthogonally adjacent tile → they swap. The drag visually tracks the finger from the first pixel of movement (feel requirement), previewing the swap; release commits it. (Whether no-match swaps are permitted: verify — see list above.)
- **Match:** 3+ same-tier tiles in a horizontal or vertical line after a swap. Resolution: the matched tiles merge into **one tile of tier N+1**; remaining matched cells become empty; **gravity** pulls tiles down within the mask; **new tier-1 tiles enter from the top**. Cascades resolve recursively (celebration escalates per chain — verify original's exact behavior).
- **Match 4+ (tiers 1–3):** produces an **escape pod** instead of/in addition to the upgrade (verify exact rule) — pods hold survivors, keeping them safe from need-timers.
- **Max-tier match:** creates a **habitat dome** on the resulting tile. Domes permanently house survivors; housing counts toward the rescue goal.
- **Survivors:** enter adrift in open space or standing on tiles (per level data or spawned during play). A survivor in open space or with an unmet need shows a **need bubble** (oxygen = get me onto solid ground/pod; dome = house me) and a visible move-countdown (pips). Countdown expiry = survivor lost = level failed. Getting land under a drifting survivor (by merging tiles beneath/adjacent — verify exact adjacency rule) or a pod/tractor beam saves them; the rescue shuttle collects survivors and delivers them to domes/goal.
- **Goals (rotating by level):** rescue N colonists · house N in domes · deliver survivors to a summit station tile · break N supply canisters · defeat N raider drones · recover N artifact caches. HUD always shows goal progress (X/N), gems, settings; power-up tray at bottom.
- **Power-ups:** demolition charge (destroy one chosen tile/overlay), wormhole shuffle (rearrange all tiles), tractor beam (pull survivors adjacent to a chosen tile onto it), rocket (later unlock; effect per original — verify). Earned via levels/gems; usable anytime on your turn; locked slots display before unlock, exactly like the original's grey tray.
- **Economy:** gems earned from levels, cascades, and canisters; spent on power-ups. No real-money anything.
- **Fail/retry:** losing a survivor fails the level with a gentle retry screen (this is a gift — failure is soft, restart is instant).

## Animation spec (KEY REQUIREMENT — match the original's feel)

Every animation below gets implemented deliberately, tuned against the reference videos (frame-stepped at 0.25× during implementation) rather than left to defaults. Target 60fps throughout; all timings ease-out unless noted.

1. **Idle board life:** water/nebula tiles shimmer subtly (wisp icons pulse slowly, slight tile bob); the board never looks frozen. Survivors bob in open space; need bubbles hover-bounce.
2. **Drag:** the grabbed tile lifts (scale ~1.06 + shadow/glow) and follows the finger 1:1; the displaced neighbor previews sliding into the vacated slot. Cancel = both spring back (~150ms, slight overshoot).
3. **Swap commit:** both tiles glide into place ~120–150ms with a soft settle squash.
4. **Merge:** matched tiles slide *into* the merge cell, compress together, flash, and the new higher-tier tile pops out with overshoot scale + radial sparkle burst + tier-colored glow ring. This is the game's signature moment — it must feel like the original's "fuse into land" beat, and it visually teaches the hierarchy.
5. **Gravity refill:** tiles fall with acceleration and land with a small squash-and-settle bounce; new tiles slide in from the top edge. Cascade merges escalate: bigger flash, higher-pitch chime, screen-space confetti at 3+ chains.
6. **Escape pod / dome creation:** distinct, bigger celebration — pod splashes down / dome constructs itself (scaffold-to-dome, ~400ms) with sound sting.
7. **Survivor moments:** rescue (scooped by shuttle: shuttle flies in, pauses, waves, flies off — Pepper visible in the co-pilot seat), housing (survivor walks into dome, door closes, heart puff), need bubble appearance (pop-in with wobble), countdown pips depleting (color shifts toward red), loss (fade with a small sad beat — soft, not traumatic).
8. **Goal/HUD:** counter ticks up with a bounce on each rescue; gem pickups fly to the HUD counter.
9. **Level complete:** full celebration — fireworks/starburst, Pepper bark + tail wag, goal banner, then colony growth vignette.
10. **Transitions:** level in/out, map/colony screens — quick crossfade + slide; nothing abrupt, nothing slow (>400ms is too slow for repeated-play chrome).

Feel guardrails: input latency from touch to visible response <1 frame; no animation ever blocks input queuing for the next move; all juice is interruptible.

## Escalation system (levels 1–70 handcrafted, then endless)

Faithful to the original's model: **the core rules never change; new overlay objects and goal types layer in**, one new element per ~8–12 levels, tutorialized on first appearance (one-line callout, like "MATCH 4 LIFE RAFT!"), then remixed forever.

| Levels | Introduces (space analog of original) |
|---|---|
| 1–5 | Tutorial: swap, merge chain to regolith, first rescue |
| 6–10 | Match-4 escape pods; need timers; living-land tier + first dome |
| 11–18 | Bigger masks; multiple simultaneous survivors; demolition charge unlock |
| 19–26 | **Supply canisters** (crates) + break-N goals; wormhole shuffle unlock |
| 27–34 | **Crystal growths** (corals): blockers cleared by matching beneath; tractor beam unlock |
| 35–42 | **Artifact caches** (treasure) + recover-N goals; summit-station delivery goals |
| 43–50 | **Raider drones** (pirates): capture by building land around them; defeat-N goals |
| 51–58 | **Gravity wells** (whirlpools): rotate adjacent tiles each move |
| 59–66 | **Meteor geysers** (volcanoes): periodically damage/downgrade a tile; rocket unlock |
| 67–70 | **Star whales** (turtles): ferry drifting survivors; capstone mixed levels |

**Endless generator (level 71+):** seeded procedural levels combining unlocked elements with a difficulty curve (board size, survivor count, timer tightness, overlay density cycle in waves so hard levels are followed by breathers, like the original). Every generated level is **verified solvable by an automated bot** (greedy + lookahead) within a comfortable move budget before being served; unsolvable candidates are discarded and regenerated. Level number seeds the generator → deterministic, resumable, shareable.

## Story & personalization (subtle)

- **Title screen:** "Sliding Stars" with a small "Happy Birthday, Zena ♥" dedication line; her home-office Mission Control vignette — Commander Zena Patel at her desk, Pepper curled at her feet.
- **Pepper** is a **black lab/basset hound mix**: black coat, long droopy basset ears, short legs, lab face — instantly recognizable as *her* dog, not a generic pup. Pepper rides co-pilot in the rescue shuttle, celebrates level completion (bark + tail wag), and occasionally digs up bonus gems on the colony screen.
- **Framing:** distress calls from the Kepler shallows reach Mission Control; Commander Z. Patel coordinates rescue and terraforming from home, with Pepper supervising from the office floor.
- **Meta layer (home colony):** rescued colonists populate her growing colony; buildings/decorations appear as levels complete (the original's island-building, as a lightweight visual reward — no separate decorating chores unless time permits).
- **Arc finale (level 70):** a short, heartfelt message from the colonists (and one muddy paw print) — warm, brief, skippable.

## Architecture

```
sliding-stars/
  src/
    core/      # PURE TypeScript, zero DOM/Pixi imports: board, tiles, swap/match/
               # gravity resolution, survivors, needs, overlays, goals, power-ups,
               # RNG (seeded), level schema, generator, solver bot
    render/    # PixiJS 8 scene layer: sprites, animations, particles, HUD
    input/     # pointer handling: drag state machine, swap preview, cancel logic
    audio/     # WebAudio: synth SFX + ambient loop, unlock-on-first-touch
    ui/        # screens: title, level select/map, colony, pause, win/fail
    levels/    # JSON level definitions (handcrafted 1–70) + generator params
    save/      # localStorage progress, settings
  public/      # manifest, icons, splash, service worker (offline-first)
```

- **Core is the contract:** every rule in this spec becomes a Vitest unit test against `core/`. The renderer *observes* core state transitions (event stream) and animates them; it can never change rules. This is the structural defense against mechanics drift.
- **Determinism:** all randomness through a seeded RNG owned by core → replayable levels, testable outcomes, deterministic generator.
- **Art:** procedurally authored sprite atlas (SVG-designed shapes rendered to textures at build time) — cohesive palette, rounded cute geometry matching the original's charm; WebGL glow/particles supply the expensive-looking juice. No external asset pipeline dependencies.
- **Performance budget:** 60fps on iPhone Safari; texture atlas ≤ 4MB; total offline bundle ≤ 10MB; cold start < 2s.

## Testing & verification

1. **Unit tests** (Vitest) for every core rule, including edge cases (masked cells, cascades, timer expiry ordering, overlay interactions).
2. **Bot-driven simulation:** the solver plays all 70 handcrafted levels + a large sample of generated levels in CI fashion; any unsolvable or degenerate level fails the build.
3. **Animation fidelity pass:** side-by-side comparison of each Animation-spec item against the reference videos at 0.25×; tune until matched.
4. **Device verification:** real-iPhone testing over the local network throughout development (dev server on LAN); pre-gift checklist: install-to-home-screen flow, offline launch, safe areas on her iPhone model, audio, persistence across relaunch.
5. **Playtest gate:** the user (who knows the original) plays a first-playable build early — mechanics sign-off before content buildout.

## Error handling

- Save writes are versioned + atomic (write-then-swap key); corrupted saves fall back to last good snapshot, never a wiped game.
- Service worker updates in the background and applies on next launch (no mid-session reloads).
- Core rejects illegal inputs (out-of-mask swaps, moves during resolution) silently at the input layer — no error states reachable by touch.
- Audio/haptic failures degrade silently; game never blocks on them.

## Out of scope

Accounts, servers, analytics, monetization, iOS App Store/TestFlight, Android tuning, decorating mini-game (stretch), VIP character collection (stretch — could become "colony pets"), daily missions/events (post-birthday ideas).

## Risks

- **Micro-rule uncertainty:** mitigated by the verify list, early playtest gate with the user, and video frame-stepping during implementation.
- **9-day deadline:** mitigated by engine-first sequencing (feel + mechanics + one perfect level → then content), data-driven levels, and the generator reducing content authoring pressure. The arc can ship at 50 levels instead of 70 without harming the gift if needed.
- **iOS Safari quirks (audio, PWA):** mitigated by testing on the real device from day one, not at the end.
