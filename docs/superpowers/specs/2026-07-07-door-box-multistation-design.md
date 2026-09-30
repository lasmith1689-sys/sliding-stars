# Sliding Stars — Door Rescue, Box Wear, Multi‑Station & Zena/Pepper Interior

**Date:** 2026-07-07
**Status:** Approved design (pre‑plan)
**Related:** builds on the shipped core (`src/core`), station meta (`src/meta`), and render layer (`src/render`). Supersedes the finale trigger from `finale.ts` (now fires at first station completion).

## Context & goals

Zena's birthday gift ("Sliding Stars") is content‑complete and live on Cloudflare Pages. This spec adds four interlocking mechanics plus a relationship beat, all requested by the user:

1. **Door rescue** — a station rescues an astronaut only from one specific "door" cell (house faces left/right), replacing today's rescue‑from‑any‑adjacent‑side rule.
2. **Box wear** — supply boxes take **3** adjacent matches to break, showing visible wear as they degrade.
3. **Mid‑board gaps** — confirm/extend support for holes in the interior of the board at higher difficulty.
4. **Multi‑station progression** — after a station is fully built, start another (new modules + new crew), endlessly; lifetime score keeps growing; the station view shows how many stations exist. The heartfelt finale re‑anchors to **first station complete**.
5. **Zena & Pepper in the interior** — the station screen becomes the ship interior with Zena and Pepper present; each time the station grows, Pepper walks up and asks what to add next.

**Non‑goals:** a full 200‑VIP roster now (we seed two stations); "live" empty cells inside the play area (interior gaps remain out‑of‑mask holes); vertical (up/down) door facing.

**Locked‑mechanic note:** this intentionally revises two previously "locked" rules (rescue = on/next‑to station; full tile board) per explicit user request. Update the `sliding-stars-mechanic` memory after implementation.

---

## Feature 1 — Door rescue mechanic

**Data.** `Piece` gains a facing on domes: `{ kind: 'dome'; facing: 'left' | 'right' }`.

**Facing assignment.** A dome is created in three places — the two `MAX_TIER` merge sites in `resolve.ts` and the `'D'` tile in `level.ts`. At each, choose facing so the **door cell** (same row, one column toward the facing) is in‑bounds and in‑mask:
- Both sides valid → pick one via the seeded RNG (`rngState`) so runs stay deterministic.
- Only one side valid → face that way.
- Neither valid (isolated) → default `right`; the house simply has no live door that move (rare; not a softlock because of the guard below).

**Rescue rule (in `settle`).** Replace the current "on the dome **or any of 4 orthogonal neighbors**" test with **door‑cell only**:
- A non‑housed/non‑lost survivor sitting on a station's door cell → `housed`.
- **Softlock guard:** a survivor sitting on the station's **own** tile also counts as home (a survivor fused into the house can't be stranded there). All other sides no longer rescue.
- This applies to `grounded`, `inPod`, and drifting survivors alike (being on the door pulls them in immediately).

**Rendering.** The house sprite shows a lit airlock/door on its facing side (one sprite, flipped horizontally for `left`). The `survivorHoused` animation slides the survivor from the door cell into the house ("suck‑in").

**Tutorial.** One‑time door tip (`src/render/tip.ts`, key `door`) the first time a station appears.

---

## Feature 2 — Box wear (3 hits, visible)

**Data.** Canisters default to `hp: 3` (was 1). `Overlay` shape unchanged (`{ kind: 'canister'; hp }`).

**Damage cadence — per adjacent match.** In `damageOverlays`, a box loses one stage for **each distinct merge event this move that lands on or orthogonally adjacent to it** (min one stage if any). A single large cascade can wear a box faster; it takes 3 stages to break. Breaking still increments `collected`, emits `canisterBroken`, and refills the freed cell (the earlier standalone‑box refill fix).

**Rendering.** Three wear sprites — pristine (hp 3) → cracked (hp 2) → crumbling (hp 1) — selected by `ov.hp` in `boardView`. `canisterHit` already carries `hp` for the swap.

**Rebalance.** 3‑hit boxes make `collectN` levels ~3× harder. In the generator, reduce canister counts and/or raise the collect move budget so the **1..70 solver sweep stays green**. Adjust until verified.

**Tutorial.** Update the box tip (key `boxes`) to mention it takes several hits and shows wear.

---

## Feature 3 — Mid‑board gaps

Interpretation (confirmed): the board **shape** gains interior gaps at higher levels — already supported by `cutCorners` + `punchHoles` (out‑of‑mask holes from ~level 16). These are permanent, act as gravity barriers (tiles route around, never fall through), and will grow denser with difficulty.

**Changes:** none structural. The door‑facing rule already refuses to point a door into a hole. Optionally raise hole density in the late generator bands. (Not "live" empty in‑play cells — those remain out of scope.)

---

## Feature 4 — Multi‑station progression

**Catalog (data‑driven).** `src/meta/roster.ts` becomes a catalog:

```ts
interface StationDef { id: string; name: string; theme: string; modules: StationModule[]; vips: Vip[]; }
export const STATIONS: StationDef[] = [ station1, station2 /* , ... */ ];
```
- **Station 1** = today's 6 modules (greenhouse/galley/observatory/petbay/recdeck/medbay) + 12 crew — moved verbatim into catalog entry 0.
- **Station 2** = "The Boardwalk Ring" (see Art). Each later station is another themed set of **new** modules + **new** VIPs. VIP ids are globally unique, so `vipById` / `moduleOf` search across all stations.

**State** (`StationState`, localStorage `sliding-stars-station`):
```ts
interface StationState {
  totalRescued: number;      // lifetime OVERALL SCORE — never resets
  stationRescued: number;    // rescues toward current station's builds — resets on completion
  currentStation: number;    // index into STATIONS
  stationsCompleted: number; // fully-built stations (shown in station view)
  collectedVips: string[];   // lifetime collected VIP ids (unique across stations)
  builtModules: string[];    // built for the CURRENT station — resets on completion
}
```

**Migration** in `loadStation` from the old `{ totalRescued, collectedVips, builtModules }`: `stationRescued ??= totalRescued`, `currentStation ??= 0`, `stationsCompleted ??= 0`.

**Rules.**
- `recordWin` adds each level's rescued count to **both** `totalRescued` and `stationRescued`, and unions rescued VIP ids into `collectedVips`.
- `unlockedModules(current)` = current station's modules whose category has a collected VIP. `buildableModules` = unlocked − built.
- `canExpand` = `buildableModules.length > 0 && stationRescued >= (builtModules.length + 1) * RESCUES_PER_MODULE`.
- **Completion:** when `builtModules` covers all of the current station's modules → `stationsCompleted++`, `currentStation++`, `builtModules = []`, `stationRescued = 0`. `collectedVips` persists (the new station's crew are new ids, so its modules start locked → must rescue its crew).

**Level VIP pool.** `main.ts` `pickVip` draws from `STATIONS[currentStation].vips`, preferring uncollected.

**Finale cadence.** A `finaleSeen` flag (localStorage). On the **first** station completion → the heartfelt Pepper/birthday finale (`finale.ts`), once. Each later completion → an **escalating celebration** screen (more crew, confetti, fanfare) — not the full message. (Replaces the old `totalRescued >= 12` trigger.)

**Overall score.** `totalRescued` is surfaced in the station view as the lifetime score that "keeps growing." (Coins/`wallet` remain a separate currency for the store.)

---

## Feature 5 — Zena & Pepper in the ship interior

The station screen (`src/render/station.ts`) is reframed as the **ship interior** with Commander Zena and Pepper present in every mode (reusing `commander.png` + `pepper.png`, plus an optional simple interior backdrop).

- **Expansion/build mode:** when the station can grow, **Pepper scampers up next to Zena** (slide‑in animation) and a speech bubble asks *"What should we add next, Commander?"* The existing module picker below is the answer. This fires **every time the station grows**.
- **View / intro mode:** Zena and Pepper stand together (Pepper idle‑wags), no prompt — the interior feels alive whenever she visits.
- Header also shows the current station's name/theme, the overall score, and the station count.

---

## Art plan (OpenAI pipeline, within daily cap)

Seed **two stations** now; system supports more later.

- **Door house:** 1 sprite with a lit door on one side (flipped in code for the other facing).
- **Box wear:** 2 additional sprites (cracked, crumbling) alongside the existing box.
- **Station 2 — "The Boardwalk Ring"** (orbital seaside‑town, chunky Stardew‑space vibe): 6 module sprites — **Arcade, Diner, Cinema, Bakery, Library, Gym** — and 12 VIPs (2 each): Arcade Champ / Claw‑Machine Whiz, Short‑Order Cook / Soda Jerk, Projectionist / Usher, Baker / Donut Fryer, Librarian / Storyteller, Yoga Instructor / Boxing Coach.
- **Optional:** a `station-interior.png` backdrop for the ship interior.

All art run through `clean-art.mjs`; asset names added to `textures.ts` + `clean-art.mjs` roster.

---

## Testing

- **Door (core):** facing points in‑board on edge columns and beside holes; rescue fires only on the door cell (a survivor on a non‑door adjacent side is **not** rescued; on the door cell **is**; on the station tile **is**, via the guard).
- **Box (core):** `hp` 3; one adjacent merge → hp 2; two adjacent merges in one move → hp 1; three → break + freed cell refilled.
- **Multi‑station (meta):** `recordWin` bumps both totals; completion advances station, resets `stationRescued`/`builtModules`, preserves `totalRescued` + `collectedVips`; `canExpand` uses `stationRescued`; `pickVip` switches pool; old‑shape save migrates.
- **Solver:** full **1..70 sweep** re‑verified with 3‑hit boxes and door‑only rescue; generator tuned until green (30s test budget).
- **Purity:** `src/core` stays free of render/meta imports.

## Tutorials (standing rule)

Every new mechanic ships a one‑time in‑game tip before it challenges the player: **door** tip, updated **box‑wear** tip, and a "**new station!**" note on the first advance to station 2.

## Rollout

- Git safety tag `checkpoint-pre-plan-e` before starting.
- Phase order: (1) door core + tests, (2) box wear core + tests, (3) multi‑station meta + tests, (4) station screen + Zena/Pepper, (5) generator rebalance + solver sweep, (6) art, (7) tutorials.
- **One batched Cloudflare deploy at the end** (per the batching lesson); bump the service‑worker cache version.

## Open items / future

- Additional stations (3+) and progress toward the larger crew roster — deferred; catalog is ready for them.
- Optional late‑game hole‑density increase — tune if levels feel too open.
