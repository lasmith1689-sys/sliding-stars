export type Tier = 1 | 2 | 3 | 4 | 5;
export const MAX_TIER: Tier = 5;

export type Pos = { r: number; c: number };

export type Piece =
  | { kind: 'tile'; tier: Tier }
  | { kind: 'pod' }
  | { kind: 'dome'; facing: 'left' | 'right' };

export type SurvivorState = 'swimming' | 'grounded' | 'inPod' | 'housed' | 'lost';

export type Need = { type: 'rescue' | 'shelter'; movesLeft: number } | null;

export interface Survivor {
  id: number;
  r: number;
  c: number;
  state: SurvivorState;
  need: Need;
  /** Opaque VIP id (set by the app layer); core never reads the roster. */
  vip?: string;
}

export type Goal =
  | { type: 'rescueN'; n: number }   // rescue N survivors (bring them home)
  | { type: 'collectN'; n: number }; // break N supply canisters

/**
 * An object sitting on a cell in addition to its tile:
 *  - canister: breaks when a match lands on or next to its cell (collect goal)
 *  - crystal:  freezes its cell (unswappable + immovable) until an adjacent match
 *  - reactor:  a Reactor Core (space-skinned "volcano") — unswappable/immovable;
 *              overloads on a fuse, downgrading neighbor tiles; cool with matches
 *  - comet:    a Frozen Comet (space-skinned "whale") — a multi-cell blocker with
 *              shared hp that shatters when cleared by adjacent matches
 */
export type Overlay =
  | { kind: 'canister'; hp: number }
  | { kind: 'crystal'; hp: number }
  | { kind: 'reactor'; hp: number; fuse: number; period: number }
  | { kind: 'comet'; hp: number };

/** A Rescue Rover: a mobile platform that carries a rider toward a station. */
export interface Rover {
  id: number;
  r: number;
  c: number;
  riderId: number; // the Survivor riding this rover
}

export interface BoardState {
  rows: number;
  cols: number;
  mask: boolean[][];
  grid: (Piece | null)[][];
  /** Overlay objects per cell (null where none). Same dims as grid. */
  overlays: (Overlay | null)[][];
  survivors: Survivor[];
  rovers: Rover[];
  rescued: number;
  /** Supply canisters broken this level (for collectN goals). */
  collected: number;
  /** Points earned this level (merges, rescues, specials) minus power-up spending. */
  points: number;
  /** Remaining turns on move-limited levels; null = unlimited. */
  movesLeft: number | null;
  goal: Goal;
  needMoves: number;
  rngState: number;
  status: 'playing' | 'won' | 'lost';
}

export interface LevelDef {
  id: number;
  mask: string[];
  tiles: string[];
  survivors: Array<{ r: number; c: number; vip?: string }>;
  /** Index of the survivor slot that is a VIP (identity assigned by the app layer). */
  vipSurvivor?: number;
  /** Rescue rovers: each spawns a rider survivor at its cell that it ferries to a station. */
  rovers?: Pos[];
  goal: Goal;
  seed: number;
  needMoves?: number;
  /** Turn budget for goal-limited levels (original's "N TURNS" counter). */
  moveLimit?: number;
  /**
   * Optional overlay grid (same shape as tiles): 'C' canister, 'I' crystal/ice,
   * '.' none. Digits after a letter set hp, e.g. 'C2'. Omit for no overlays.
   */
  overlays?: string[];
}
