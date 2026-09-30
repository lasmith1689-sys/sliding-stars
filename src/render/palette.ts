import type { Tier } from '../core/types';

/** Space background. */
export const SPACE_BG = 0x0b0e1d;

/**
 * Representative tile fills, tier 1-5 — used for fx tints and the hierarchy
 * guard. HARD REQUIREMENT: perceived brightness ramps strictly upward so the
 * board reads dangerous-dark -> safe-bright at a squint.
 * Materials (Stardew-ish pixel art, painted in textures.ts). Tiers 1-3 are
 * UNSAFE (survivors drift on them); 4-5 are solid ground:
 *   1 void current (swirling dark space) -> 2 debris field (loose rubble) ->
 *   3 platform (bare stone slabs) -> 4 biosphere (grass + flowers, solid!) ->
 *   5 launch pad (bright pad; 3 pads merge into the rescue shuttle)
 */
export const TIER_FILL: Record<Tier, number> = {
  1: 0x352052, // void current (richer violet)
  2: 0x424566, // debris field (blue-slate)
  3: 0x64789a, // platform stone (cooler blue)
  4: 0x5cc24e, // biosphere grass (candy green)
  5: 0xc9d4a8, // launch pad (warm cream)
};

/** Accent colors per tier (fx bursts, glow rings). */
export const TIER_ACCENT: Record<Tier, number> = {
  1: 0x8a84c8, // void glints
  2: 0x767b8e, // rubble highlight
  3: 0x9db3cc, // stone highlight
  4: 0x8fe06a, // fresh growth
  5: 0xffe066, // pad lights
};

export const POD_HULL = 0xe8e8f2;
export const DOME_SHELL = 0xe8f4ff; // legacy name; shuttle hull highlight
export const NEED_URGENT = 0xe05555;

/** Survivors call out (bubble appears) when their timer drops to this. */
export const CALLOUT_AT = 12;
