# Plan C — The Ever-Expanding Station Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans / subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the persistent, ever-expanding Space Station — the emotional core of the gift. Rescue occasional **VIP** crew across levels; at rescue-count milestones the player docks a new **module** onto Zena & Pepper's station, which visibly grows and fills with the crew she's saved.

**Architecture:** A new **app-layer** `src/meta/` (roster data + `localStorage`-backed station state) keeps the pure core untouched. Core gains only an opaque `Survivor.vip?: string` tag and a `LevelDef.vipSurvivor?: number` slot the generator sets; `main.ts` assigns the actual VIP identity from the roster on load, banks rescued VIPs on a win, and opens the station screen at expansion milestones. A new `src/render/station.ts` draws the growing base.

**Tech Stack:** TypeScript (strict) · PixiJS v8 · Vite · Vitest.

## Global Constraints

- **Pure core:** `src/core/` MUST NOT import `src/meta/`, `src/render/`, or `pixi.js` (enforced by `tests/core/purity.test.ts`). The `vip` tag on `Survivor` is a plain string; core never reads the roster.
- **LOCKED loop** unchanged; the station is additive meta-progression.
- **Solver-verified:** the sweep (levels 1..40) MUST stay green.
- **Test:** `npm test`. Typecheck: `npm run typecheck`. Build: `npm run build`.
- **OpenAI art:** key from `H:/Program Files/ams2-setup-coach/.env`, never committed.
- **localStorage keys:** progress uses `sliding-stars-level`; the station uses `sliding-stars-station`.

## Starter roster (data-driven; grows toward 200+ later)

6 modules, 2 VIPs each (12 VIPs). More rows can be appended to the same table over time.

| module id | module name | VIP ids (name) |
|---|---|---|
| `greenhouse` | Greenhouse | `botanist` (Astro-Botanist), `florist` (Zero-G Florist) |
| `galley` | Galley | `chef` (Star Chef), `icecream` (Ice-Cream Vendor) |
| `observatory` | Observatory | `astronomer` (Astronomer), `navigator` (Navigator) |
| `petbay` | Pet Bay | `vet` (Space Vet), `groomer` (Pet Groomer) |
| `recdeck` | Rec Deck | `racer` (Go-Kart Racer), `dj` (Zero-G DJ) |
| `medbay` | Medbay | `medic` (Medic), `nurse` (Nurse) |

Sprites: module `module-<id>.png`, VIP `vip-<id>.png`, plus one `station-core.png` hub.

---

## Task 1: Roster data table

**Files:** Create `src/meta/roster.ts`. Test: `tests/meta/roster.test.ts` (new).

**Interfaces:**
- Produces: `interface Vip { id: string; name: string; module: string }`, `interface StationModule { id: string; name: string }`, `MODULES: StationModule[]`, `VIP_ROSTER: Vip[]`, `vipById(id): Vip | undefined`, `vipsOfModule(moduleId): Vip[]`, `moduleOf(vipId): string | undefined`.

- [ ] **Step 1: Failing test** — create `tests/meta/roster.test.ts`:

```ts
import { MODULES, VIP_ROSTER, vipById, vipsOfModule, moduleOf } from '../../src/meta/roster';

test('every VIP belongs to a real module; ids are unique', () => {
  const moduleIds = new Set(MODULES.map((m) => m.id));
  const vipIds = new Set<string>();
  for (const v of VIP_ROSTER) {
    expect(moduleIds.has(v.module)).toBe(true);
    expect(vipIds.has(v.id)).toBe(false);
    vipIds.add(v.id);
  }
  expect(VIP_ROSTER.length).toBeGreaterThanOrEqual(12);
});

test('lookups resolve', () => {
  expect(vipById('botanist')?.module).toBe('greenhouse');
  expect(moduleOf('chef')).toBe('galley');
  expect(vipsOfModule('petbay').map((v) => v.id).sort()).toEqual(['groomer', 'vet']);
});
```

- [ ] **Step 2: Run** `npm test -- roster` → FAIL (module missing).

- [ ] **Step 3: Implement** — create `src/meta/roster.ts`:

```ts
/** Curated station modules and the VIP crew that fill them (grows over time). */
export interface StationModule { id: string; name: string }
export interface Vip { id: string; name: string; module: string }

export const MODULES: StationModule[] = [
  { id: 'greenhouse', name: 'Greenhouse' },
  { id: 'galley', name: 'Galley' },
  { id: 'observatory', name: 'Observatory' },
  { id: 'petbay', name: 'Pet Bay' },
  { id: 'recdeck', name: 'Rec Deck' },
  { id: 'medbay', name: 'Medbay' },
];

export const VIP_ROSTER: Vip[] = [
  { id: 'botanist', name: 'Astro-Botanist', module: 'greenhouse' },
  { id: 'florist', name: 'Zero-G Florist', module: 'greenhouse' },
  { id: 'chef', name: 'Star Chef', module: 'galley' },
  { id: 'icecream', name: 'Ice-Cream Vendor', module: 'galley' },
  { id: 'astronomer', name: 'Astronomer', module: 'observatory' },
  { id: 'navigator', name: 'Navigator', module: 'observatory' },
  { id: 'vet', name: 'Space Vet', module: 'petbay' },
  { id: 'groomer', name: 'Pet Groomer', module: 'petbay' },
  { id: 'racer', name: 'Go-Kart Racer', module: 'recdeck' },
  { id: 'dj', name: 'Zero-G DJ', module: 'recdeck' },
  { id: 'medic', name: 'Medic', module: 'medbay' },
  { id: 'nurse', name: 'Nurse', module: 'medbay' },
];

export function vipById(id: string): Vip | undefined { return VIP_ROSTER.find((v) => v.id === id); }
export function vipsOfModule(moduleId: string): Vip[] { return VIP_ROSTER.filter((v) => v.module === moduleId); }
export function moduleOf(vipId: string): string | undefined { return vipById(vipId)?.module; }
```

- [ ] **Step 4: Run** `npm test -- roster` → PASS.

- [ ] **Step 5: Commit** `git commit -m "feat(meta): station roster data table (6 modules, 12 VIPs)"`

---

## Task 2: Station meta-state

**Files:** Create `src/meta/station.ts`. Test: `tests/meta/station.test.ts` (new).

**Interfaces:**
- Produces:
  - `interface StationState { totalRescued: number; collectedVips: string[]; builtModules: string[] }`
  - `RESCUES_PER_MODULE = 5`
  - `emptyStation(): StationState`
  - `recordWin(s, rescuedVipIds: string[], rescuedCount: number): StationState` (pure — dedups VIPs, adds to totalRescued)
  - `unlockedModules(s): string[]` (modules with ≥1 collected VIP)
  - `buildableModules(s): string[]` (unlocked and not yet built)
  - `canExpand(s): boolean` (`buildableModules(s).length > 0 && s.totalRescued >= (s.builtModules.length + 1) * RESCUES_PER_MODULE`)
  - `buildModule(s, moduleId): StationState` (pure — appends to builtModules)
  - `residentsOf(s, moduleId): string[]` (collected VIPs whose module is moduleId)
  - `loadStation(storage?): StationState`, `saveStation(s, storage?): void` (localStorage I/O; storage injectable for tests)

- [ ] **Step 1: Failing test** — create `tests/meta/station.test.ts`:

```ts
import {
  emptyStation, recordWin, unlockedModules, buildableModules, canExpand,
  buildModule, residentsOf, loadStation, saveStation, RESCUES_PER_MODULE,
} from '../../src/meta/station';

test('recordWin banks unique VIPs and counts rescues', () => {
  let s = emptyStation();
  s = recordWin(s, ['botanist', 'chef'], 2);
  s = recordWin(s, ['botanist'], 1); // dupe VIP, +1 rescue
  expect(s.collectedVips.sort()).toEqual(['botanist', 'chef']);
  expect(s.totalRescued).toBe(3);
});

test('a module unlocks once you have a VIP of its category', () => {
  let s = emptyStation();
  expect(unlockedModules(s)).toEqual([]);
  s = recordWin(s, ['botanist'], 1);
  expect(unlockedModules(s)).toEqual(['greenhouse']);
  expect(buildableModules(s)).toEqual(['greenhouse']);
});

test('expansion needs both an unlocked module and enough rescues', () => {
  let s = recordWin(emptyStation(), ['botanist'], 1); // unlocked, but only 1 rescue
  expect(canExpand(s)).toBe(false);
  s = { ...s, totalRescued: RESCUES_PER_MODULE };
  expect(canExpand(s)).toBe(true);
  s = buildModule(s, 'greenhouse');
  expect(s.builtModules).toEqual(['greenhouse']);
  expect(buildableModules(s)).toEqual([]); // nothing else unlocked
  expect(canExpand(s)).toBe(false);
});

test('residents are the collected VIPs of a module', () => {
  let s = recordWin(emptyStation(), ['botanist', 'florist'], 2);
  expect(residentsOf(s, 'greenhouse').sort()).toEqual(['botanist', 'florist']);
  expect(residentsOf(s, 'galley')).toEqual([]);
});

test('save/load round-trips through an injected storage', () => {
  const store: Record<string, string> = {};
  const fake = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
  let s = recordWin(emptyStation(), ['vet'], 1);
  s = buildModule({ ...s, totalRescued: RESCUES_PER_MODULE }, 'petbay');
  saveStation(s, fake as unknown as Storage);
  expect(loadStation(fake as unknown as Storage)).toEqual(s);
});
```

- [ ] **Step 2: Run** `npm test -- station` → FAIL (module missing).

- [ ] **Step 3: Implement** — create `src/meta/station.ts`:

```ts
import { MODULES, moduleOf, vipsOfModule } from './roster';

export interface StationState {
  totalRescued: number;
  collectedVips: string[];
  builtModules: string[];
}

export const RESCUES_PER_MODULE = 5;
const KEY = 'sliding-stars-station';

export function emptyStation(): StationState {
  return { totalRescued: 0, collectedVips: [], builtModules: [] };
}

export function recordWin(s: StationState, rescuedVipIds: string[], rescuedCount: number): StationState {
  const collected = new Set(s.collectedVips);
  for (const id of rescuedVipIds) collected.add(id);
  return { ...s, collectedVips: [...collected], totalRescued: s.totalRescued + rescuedCount };
}

export function unlockedModules(s: StationState): string[] {
  const have = new Set(s.collectedVips.map(moduleOf).filter((m): m is string => !!m));
  return MODULES.map((m) => m.id).filter((id) => have.has(id));
}

export function buildableModules(s: StationState): string[] {
  const built = new Set(s.builtModules);
  return unlockedModules(s).filter((id) => !built.has(id));
}

export function canExpand(s: StationState): boolean {
  return buildableModules(s).length > 0 &&
    s.totalRescued >= (s.builtModules.length + 1) * RESCUES_PER_MODULE;
}

export function buildModule(s: StationState, moduleId: string): StationState {
  if (s.builtModules.includes(moduleId)) return s;
  return { ...s, builtModules: [...s.builtModules, moduleId] };
}

export function residentsOf(s: StationState, moduleId: string): string[] {
  const ids = new Set(vipsOfModule(moduleId).map((v) => v.id));
  return s.collectedVips.filter((id) => ids.has(id));
}

export function loadStation(storage: Storage = localStorage): StationState {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return emptyStation();
    const p = JSON.parse(raw) as Partial<StationState>;
    return {
      totalRescued: p.totalRescued ?? 0,
      collectedVips: p.collectedVips ?? [],
      builtModules: p.builtModules ?? [],
    };
  } catch { return emptyStation(); }
}

export function saveStation(s: StationState, storage: Storage = localStorage): void {
  try { storage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore quota/security */ }
}
```

- [ ] **Step 4: Run** `npm test -- station` → PASS. Then `npm test` (purity guard must stay green — meta imports nothing from core).

- [ ] **Step 5: Commit** `git commit -m "feat(meta): station state (VIP banking, module unlock, expansion math)"`

---

## Task 3: Core VIP tag + generator flags VIP survivors

**Files:** Modify `src/core/types.ts`, `src/core/level.ts`, `src/core/generator.ts`. Test: `tests/core/generator.test.ts`.

**Interfaces:**
- Produces: `Survivor.vip?: string`; `LevelDef.survivors` entries may carry `vip?`; `LevelDef.vipSurvivor?: number` (index of the survivor slot that is a VIP); the generator sets `vipSurvivor` deterministically on ~1-in-4 rescue levels (from level 6). `loadLevel` copies `vipSurvivor`'s tag onto the survivor if the def already has one, else leaves it for the app layer.

- [ ] **Step 1: Failing test** — append to `tests/core/generator.test.ts`:

```ts
test('some rescue levels flag a VIP survivor slot', () => {
  // level 6 is a rescue level chosen to carry a VIP
  const def = makeSolvableLevel(6);
  expect(typeof def.vipSurvivor).toBe('number');
  expect(def.vipSurvivor).toBeLessThan(def.survivors.length);
  // level 1 (intro) never has a VIP
  expect(makeSolvableLevel(1).vipSurvivor).toBeUndefined();
});
```

- [ ] **Step 2: Run** `npm test -- generator` → FAIL.

- [ ] **Step 3: Core types** — in `src/core/types.ts`:

Add `vip?: string;` to `Survivor` (after `need`).
Change `LevelDef.survivors` from `survivors: Pos[];` to `survivors: Array<{ r: number; c: number; vip?: string }>;`
Add after `survivors` in `LevelDef`: `/** Index of the survivor slot that is a VIP (identity assigned by the app layer). */\n  vipSurvivor?: number;`

- [ ] **Step 4: loadLevel** — in `src/core/level.ts`, the survivors map currently reads `def.survivors.map((p, i) => ...)`. Add `vip: p.vip` to the returned survivor object so an authored tag is preserved:

```ts
    return {
      id: i, r: p.r, c: p.c,
      state: onWater ? 'swimming' : piece.kind === 'pod' ? 'inPod' : 'grounded',
      need: onWater ? { type: 'rescue', movesLeft: needMoves } : null,
      vip: p.vip,
    };
```

- [ ] **Step 5: Generator** — in `src/core/generator.ts`, add to `GenParams`: `vip: boolean;`. In `paramsForLevel`, after `isCollect`:

```ts
  // a VIP rides along on some rescue levels (identity chosen by the app layer)
  const vip = !isCollect && index >= 6 && index % 4 === 2;
```

Include `vip,` in the returned object; add `vip: false` to the `makeSolvableLevel` fallback params.

In `generateLevel`, after the `survivors` array (and the rover pop) are settled, before building `overlays`, add:

```ts
  const vipSurvivor = p.vip && survivors.length > 0 ? 0 : undefined;
```

and add `...(vipSurvivor !== undefined ? { vipSurvivor } : {}),` to the returned `LevelDef` object.

- [ ] **Step 6: Run** `npm test -- generator` → PASS. Then `npm test` — the 1..40 sweep stays green (VIP tag is inert to solving). Fix any test that constructed `survivors` as bare `{r,c}` — those still satisfy the widened type.

- [ ] **Step 7: Commit** `git commit -m "feat(core): VIP survivor tag + generator flags a VIP slot on some levels"`

---

## Task 4: Station art (core hub, 6 modules, 12 VIPs)

**Files:** Modify `scripts/gen-art.mjs`, `scripts/clean-art.mjs`. Create `public/art/station-core.png`, `public/art/module-*.png` (6), `public/art/vip-*.png` (12).

- [ ] **Step 1: Prompts** — in `scripts/gen-art.mjs` `ASSETS`, add the hub, 6 modules, and 12 VIPs. Use `ICON(...)` for all (transparent die-cut). Module example (repeat pattern for each, keep the sci-fi cozy style):

```js
  'station-core': { prompt: ICON('a cozy central SPACE STATION CORE hub module: a rounded ' +
    'habitat pod with warm lit windows, a green-and-cherry-wood trim nodding to a homey ' +
    'office, docking ports on its sides, a small flag — the heart of a growing station'), bg: 'transparent' },
  'module-greenhouse': { prompt: ICON('a SPACE STATION GREENHOUSE module: a glass-domed pod ' +
    'full of lush green plants and flowers, warm grow-lights, a docking collar on one side'), bg: 'transparent' },
  'module-galley': { prompt: ICON('a SPACE STATION GALLEY module: a cozy little kitchen-diner ' +
    'pod with a round window, warm lights, a steaming pot and mugs, a docking collar'), bg: 'transparent' },
  'module-observatory': { prompt: ICON('a SPACE STATION OBSERVATORY module: a domed pod with a ' +
    'big telescope poking out a shutter, star charts glowing inside, a docking collar'), bg: 'transparent' },
  'module-petbay': { prompt: ICON('a SPACE STATION PET BAY module: a snug pod with a dog bed, ' +
    'paw-print decor, chew toys and a water bowl, warm lights, a docking collar — a home for pets'), bg: 'transparent' },
  'module-recdeck': { prompt: ICON('a SPACE STATION REC DECK module: a fun games pod with a tiny ' +
    'go-kart loop, arcade cabinet and colorful lights, a docking collar'), bg: 'transparent' },
  'module-medbay': { prompt: ICON('a SPACE STATION MEDBAY module: a clean white-and-teal medical ' +
    'pod with a red cross, a bed and monitors, warm lights, a docking collar'), bg: 'transparent' },
```

VIP example (repeat for all 12, each a cute chunky astronaut-styled character with a role prop):

```js
  'vip-botanist': { prompt: ICON('a cute chunky ASTRO-BOTANIST character: a smiling astronaut in a ' +
    'green-trimmed suit holding a little potted alien plant, a small leaf badge'), bg: 'transparent' },
  'vip-florist': { prompt: ICON('a cute chunky ZERO-G FLORIST: a smiling astronaut holding a bright ' +
    'bouquet of space flowers, a flower badge'), bg: 'transparent' },
  'vip-chef': { prompt: ICON('a cute chunky STAR CHEF astronaut in a white chef hat over the helmet, ' +
    'holding a steaming pan, a fork-and-knife badge'), bg: 'transparent' },
  'vip-icecream': { prompt: ICON('a cute chunky ICE-CREAM VENDOR astronaut holding a swirly ' +
    'ice-cream cone, a pastel-striped apron over the suit'), bg: 'transparent' },
  'vip-astronomer': { prompt: ICON('a cute chunky ASTRONOMER astronaut holding a small telescope, ' +
    'a star badge, curious smile'), bg: 'transparent' },
  'vip-navigator': { prompt: ICON('a cute chunky NAVIGATOR astronaut holding a glowing star-map ' +
    'tablet, a compass badge'), bg: 'transparent' },
  'vip-vet': { prompt: ICON('a cute chunky SPACE VET astronaut with a stethoscope, gently holding a ' +
    'tiny happy puppy, a paw badge'), bg: 'transparent' },
  'vip-groomer': { prompt: ICON('a cute chunky PET GROOMER astronaut holding a brush and a ribbon, a ' +
    'paw badge, cheerful'), bg: 'transparent' },
  'vip-racer': { prompt: ICON('a cute chunky GO-KART RACER astronaut in a racing helmet with goggles, ' +
    'holding a checkered flag, a wheel badge'), bg: 'transparent' },
  'vip-dj': { prompt: ICON('a cute chunky ZERO-G DJ astronaut with headphones over the helmet, hands ' +
    'on a small glowing turntable, a music-note badge'), bg: 'transparent' },
  'vip-medic': { prompt: ICON('a cute chunky MEDIC astronaut with a red-cross armband holding a ' +
    'medkit, kind smile'), bg: 'transparent' },
  'vip-nurse': { prompt: ICON('a cute chunky NURSE astronaut with a soft cap and a clipboard, a ' +
    'heart badge, friendly'), bg: 'transparent' },
```

- [ ] **Step 2:** In `scripts/clean-art.mjs`, extend `CHARACTERS` with `'station-core'`, the six `'module-*'` ids, and the twelve `'vip-*'` ids.

- [ ] **Step 3: Generate + clean** (in a few batches to stay under the 10-min command cap):

```bash
cd "H:/Projects/iPhone Apps/sliding-stars"
export OPENAI_API_KEY=$(grep -oE 'OPENAI_API_KEY=.*' "/h/Program Files/ams2-setup-coach/.env" | head -1 | cut -d= -f2- | tr -d '"\r' | tr -d "'")
node scripts/gen-art.mjs station-core module-greenhouse module-galley module-observatory module-petbay module-recdeck module-medbay
node scripts/gen-art.mjs vip-botanist vip-florist vip-chef vip-icecream vip-astronomer vip-navigator
node scripts/gen-art.mjs vip-vet vip-groomer vip-racer vip-dj vip-medic vip-nurse
node scripts/clean-art.mjs
```

- [ ] **Step 4:** Spot-check a few PNGs (read `station-core.png`, `module-petbay.png`, `vip-racer.png`); confirm clean transparent corners (`node -e` alpha probe as in Plan B).

- [ ] **Step 5: Commit** `git commit -m "art: station core, 6 module sprites, 12 VIP sprites"`

---

## Task 5: Station screen

**Files:** Create `src/render/station.ts`. Modify `src/render/textures.ts`. Verify: typecheck, build, browser.

**Interfaces:**
- Consumes: `StationState`, `MODULES`, `VIP_ROSTER`, `buildableModules`, `buildModule`, `residentsOf` (from meta); textures.
- Produces: `TextureSet.station: { core?: Texture; modules: Record<string, Texture>; vips: Record<string, Texture> }` (loaded from `station-core`/`module-<id>`/`vip-<id>`); `showStation(app, layers, station, opts): Promise<StationState>` where `opts = { expansion?: boolean }`. In expansion mode the player taps a buildable module to dock it (returns the updated state, saved by the caller); otherwise it's a view with a Close button (returns the unchanged state).

- [ ] **Step 1: Load the station textures** — in `src/render/textures.ts`, add to `TextureSet`:

```ts
  station: { core?: Texture; modules: Record<string, Texture>; vips: Record<string, Texture> };
```

Initialize it in the set factory (where the object is first built) with `station: { modules: {}, vips: {} }`, and in the image-asset loader add entries that populate it. Since module/VIP files are many, load them by iterating the roster after the fixed assets. In `loadTextures`, after the existing `IMAGE_ASSETS` loop, add:

```ts
  const { MODULES, VIP_ROSTER } = await import('../meta/roster');
  await Promise.all([
    Assets.load<Texture>('art/station-core.png').then((t) => { set.station.core = t; }).catch(() => {}),
    ...MODULES.map((m) => Assets.load<Texture>(`art/module-${m.id}.png`).then((t) => { set.station.modules[m.id] = t; }).catch(() => {})),
    ...VIP_ROSTER.map((v) => Assets.load<Texture>(`art/vip-${v.id}.png`).then((t) => { set.station.vips[v.id] = t; }).catch(() => {})),
  ]);
```

(Match the existing `loadTextures` structure — it already uses `Assets.load` per asset; mirror its error handling. If `loadTextures` builds the set via a different local variable name than `set`, use that name.)

- [ ] **Step 2: Implement `showStation`** — create `src/render/station.ts`:

```ts
import { Application, Container, FillGradient, Graphics, Sprite, Text } from 'pixi.js';
import type { Layers } from './app';
import type { TextureSet } from './textures';
import { MODULES, vipsOfModule } from '../meta/roster';
import { buildableModules, buildModule, residentsOf, type StationState } from '../meta/station';
import { outBack, tween } from './tween';

/**
 * The ever-expanding station screen. Draws the core hub, docked modules and the
 * rescued crew. In expansion mode the player taps a highlighted buildable module
 * to dock it; the (possibly updated) state is returned for the caller to save.
 */
export function showStation(
  app: Application, layers: Layers, textures: TextureSet, station: StationState,
  opts: { expansion?: boolean } = {},
): Promise<StationState> {
  const W = app.screen.width, H = app.screen.height;
  const root = new Container();
  layers.hud.addChild(root);
  root.addChild(new Graphics().rect(0, 0, W, H).fill(new FillGradient({
    type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
    colorStops: [{ offset: 0, color: 0x141636 }, { offset: 1, color: 0x0a0c1e }], textureSpace: 'local',
  })));

  const title = new Text({ text: opts.expansion ? 'Your station grew!' : 'Home Station',
    style: { fill: 0xffe066, fontSize: W * 0.07, fontWeight: '900', fontFamily: 'system-ui, sans-serif' } });
  title.anchor.set(0.5); title.x = W / 2; title.y = H * 0.08; root.addChild(title);

  // core hub, centered
  if (textures.station.core) {
    const core = new Sprite(textures.station.core); core.anchor.set(0.5);
    core.width = core.height = W * 0.3; core.x = W / 2; core.y = H * 0.4; root.addChild(core);
  }

  // built modules ring around the core
  const ring = W * 0.34;
  station.builtModules.forEach((id, i) => {
    const tex = textures.station.modules[id]; if (!tex) return;
    const ang = -Math.PI / 2 + (i / Math.max(1, station.builtModules.length)) * Math.PI * 2;
    const sp = new Sprite(tex); sp.anchor.set(0.5);
    sp.width = sp.height = W * 0.18;
    sp.x = W / 2 + Math.cos(ang) * ring; sp.y = H * 0.4 + Math.sin(ang) * ring * 0.72;
    root.addChild(sp);
    // resident VIP faces under the module
    residentsOf(station, id).slice(0, 4).forEach((vid, j) => {
      const vt = textures.station.vips[vid]; if (!vt) return;
      const face = new Sprite(vt); face.anchor.set(0.5);
      face.width = face.height = W * 0.06;
      face.x = sp.x + (j - 1.5) * W * 0.055; face.y = sp.y + W * 0.11;
      root.addChild(face);
    });
  });

  let result = station;
  const buildable = opts.expansion ? buildableModules(station) : [];

  return new Promise<StationState>((resolve) => {
    const finish = () => { void tween(root, { alpha: 0 }, 220).then(() => { root.destroy(); resolve(result); }); };

    if (opts.expansion && buildable.length > 0) {
      const prompt = new Text({ text: 'Choose a module to dock:',
        style: { fill: 0xffffff, fontSize: W * 0.045, fontWeight: '700', fontFamily: 'system-ui, sans-serif' } });
      prompt.anchor.set(0.5); prompt.x = W / 2; prompt.y = H * 0.68; root.addChild(prompt);
      buildable.forEach((id, i) => {
        const mod = MODULES.find((m) => m.id === id)!;
        const chip = new Container();
        const w = W * 0.42, h = H * 0.09;
        const bg = new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2)
          .fill({ color: 0x2b2856 }).stroke({ color: 0x7dd45f, width: 3 });
        const tex = textures.station.modules[id];
        if (tex) { const ic = new Sprite(tex); ic.anchor.set(0.5); ic.width = ic.height = h * 0.8; ic.x = -w / 2 + h * 0.6; chip.addChild(bg, ic); }
        else chip.addChild(bg);
        const label = new Text({ text: mod.name, style: { fill: 0xffffff, fontSize: h * 0.34, fontWeight: '800', fontFamily: 'system-ui, sans-serif' } });
        label.anchor.set(0, 0.5); label.x = -w / 2 + h; chip.addChild(label);
        chip.x = W / 2; chip.y = H * 0.76 + i * h * 1.25;
        chip.eventMode = 'static'; chip.cursor = 'pointer';
        chip.on('pointertap', () => { result = buildModule(station, id); finish(); });
        root.addChild(chip);
      });
    } else {
      const btn = new Container();
      const w = W * 0.4, h = H * 0.08;
      const bg = new Graphics().roundRect(-w / 2, -h / 2, w, h, h / 2)
        .fill(new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
          colorStops: [{ offset: 0, color: 0x6fe06a }, { offset: 1, color: 0x3f9e3a }], textureSpace: 'local' }));
      const label = new Text({ text: 'Close', style: { fill: 0xffffff, fontSize: h * 0.42, fontWeight: '900', fontFamily: 'system-ui, sans-serif' } });
      label.anchor.set(0.5); btn.addChild(bg, label);
      btn.x = W / 2; btn.y = H * 0.9; btn.eventMode = 'static'; btn.cursor = 'pointer';
      btn.on('pointertap', finish); root.addChild(btn);
    }

    root.alpha = 0; void tween(root, { alpha: 1 }, 260);
    title.scale.set(0.8); void tween(title.scale, { x: 1, y: 1 }, 400, outBack);
  });
}
```

- [ ] **Step 3: Typecheck + build** → clean.

- [ ] **Step 4: Browser** — after Task 6 wires it, verify (deferred to Task 6's device pass).

- [ ] **Step 5: Commit** `git commit -m "feat(render): station screen (core + docked modules + crew + expansion picker)"`

---

## Task 6: Wire the station into the game loop

**Files:** Modify `src/main.ts`, `src/render/boardView.ts`, `src/render/hud.ts`. Verify: typecheck, build, browser device pass.

**Interfaces:**
- Consumes: `loadStation`, `saveStation`, `recordWin`, `canExpand` (meta); `showStation` (render); roster.
- Produces: on load, the flagged VIP survivor gets an identity (an uncollected VIP preferred); a VIP renders with its own sprite in-level; on a win, rescued VIPs bank + an expansion opens when earned; a small HUD "🛰 Station" button opens the view any time.

- [ ] **Step 1: VIP identity on load** — in `src/main.ts`, import the meta + render bits:

```ts
import { loadStation, saveStation, recordWin, canExpand } from './meta/station';
import { VIP_ROSTER } from './meta/roster';
import { showStation } from './render/station';
```

Add near the top of `boot`, after `let currentLevel`:

```ts
  let station = loadStation();
  const pickVip = (): string => {
    const have = new Set(station.collectedVips);
    const pool = VIP_ROSTER.filter((v) => !have.has(v.id));
    const list = pool.length ? pool : VIP_ROSTER; // once all collected, allow repeats
    return list[Math.floor(Math.random() * list.length)]!.id;
  };
```

Add a helper that assigns identity to a freshly loaded level's VIP slot, and call it in both the initial load and `startLevel` right after `state = loadLevel(...)`:

```ts
  const assignVip = () => {
    const def = levelFor(currentLevel);
    if (def.vipSurvivor != null && state.survivors[def.vipSurvivor] && !state.survivors[def.vipSurvivor]!.vip) {
      state.survivors[def.vipSurvivor]!.vip = pickVip();
    }
  };
```

Call `assignVip();` immediately after `let state = loadLevel(levelFor(currentLevel));` (initial) and after `state = loadLevel(levelFor(currentLevel));` inside `startLevel` (before `view.relayout(state)`).

- [ ] **Step 2: Distinct VIP sprite in-level** — in `src/render/boardView.ts` `syncSurvivors`, when building/refreshing the body sprite, use the VIP texture if the survivor has one. Where the body texture is set (the `body` sprite created in `makeSurvivorNode` uses `this.textures.survivor`), add after positioning the node in `syncSurvivors`:

```ts
      const body = node.getChildByLabel('body') as Sprite;
      const vipTex = sv.vip ? this.textures.station?.vips[sv.vip] : undefined;
      body.texture = vipTex ?? this.textures.survivor;
```

(Place this next to the existing `body.scale.set(...)` line so the scale still applies to whichever texture is used.)

- [ ] **Step 3: Bank VIPs + expansion on win** — in `src/main.ts`, replace `showEndBanner`:

```ts
  const showEndBanner = (status: 'won' | 'lost') => {
    if (status !== 'won') { hud.showBanner('lost', startLevel); return; }
    // bank rescued VIPs + total rescues, then offer an expansion if earned
    const rescuedVips = state.survivors.filter((s) => s.state === 'housed' && s.vip).map((s) => s.vip!);
    station = recordWin(station, rescuedVips, state.rescued);
    saveStation(station);
    const advance = () => { currentLevel++; startLevel(); };
    hud.showBanner('won', () => {
      if (canExpand(station)) {
        void showStation(app, layers, textures, station, { expansion: true }).then((updated) => {
          station = updated; saveStation(station); advance();
        });
      } else advance();
    });
  };
```

- [ ] **Step 4: HUD Station button** — in `src/render/hud.ts`, add a small button in the constructor that calls a public `onStationTap` callback. Add a field `onStationTap: () => void = () => {};` and, in the constructor after the other chips, build a compact button (top-right under the points chip):

```ts
    const sB = this.app.screen.height * 0.05;
    const btn = new Text({ text: '🛰', style: { fontSize: sB } });
    btn.anchor.set(0.5);
    btn.x = this.app.screen.width * 0.92; btn.y = this.app.screen.height * 0.12;
    btn.eventMode = 'static'; btn.cursor = 'pointer';
    btn.on('pointertap', () => this.onStationTap());
    this.layer.addChild(btn);
```

In `src/main.ts`, after creating `hud`, wire it:

```ts
  hud.onStationTap = () => { void showStation(app, layers, textures, station); };
```

- [ ] **Step 5: Typecheck + build** → clean.

- [ ] **Step 6: Device pass** — start the preview. Use `__game` to fast-forward: set a level with a VIP (e.g. 6), confirm the VIP renders with its own sprite; win it (drive moves) and confirm the VIP banks; force `localStorage['sliding-stars-station']` to a state with an unlocked module + enough rescues, reload, win, and confirm the expansion screen offers the module and docks it; tap the 🛰 button to view the station. Screenshot the station screen.

- [ ] **Step 7: Commit** `git commit -m "feat: wire station into the loop (VIP identity, banking, expansion, HUD button)"`

---

## Task 7: Full verification + deploy

- [ ] **Step 1:** `npm test && npm run typecheck && npm run build` → all green.
- [ ] **Step 2: Device pass** — confirm a normal playthrough is unaffected (no VIP levels early), a VIP level shows a distinct rescuee, and the station view opens from the HUD.
- [ ] **Step 3: Deploy** to Netlify site `bc41ec96-bbad-4e56-b0d1-c612c54db038`; report the URL.

## Self-Review

**Spec (Feature 6) coverage:** meta-state (T2) with `totalRescued`/`collectedVips`/`builtModules`; roster table (T1); VIP tag + sporadic generator flag (T3); art (T4); station screen with docked modules + crew + free-choice expansion picker (T5); rescue-count milestone via `canExpand` and banking on win (T6). `placements`/`lastMilestoneIndex` from the spec are intentionally derived (residents = collected VIPs of a built module; milestone = builtModules.length) rather than stored — simpler and equivalent. The 200+ roster is delivered as a data-driven starter of 12 that appends over time. ✓
**Placeholder scan:** all code complete; art prompts are concrete. ✓
**Type consistency:** `StationState` shape identical across T2/T5/T6; `Survivor.vip?: string` (T3) read in boardView (T6) and main (T6); `showStation(app, layers, textures, station, opts): Promise<StationState>` signature matches its call sites; `TextureSet.station` shape defined in T5 used in T6. ✓
**Purity:** `src/meta/` imports only within meta; core never imports meta; `Survivor.vip` is a plain string — purity guard stays green. ✓
**Risk:** the VIP tag widens `LevelDef.survivors`; any test/level building bare `{r,c}` still conforms. Art generation is ~19 images across 3 batches — spread to respect the daily cap.
