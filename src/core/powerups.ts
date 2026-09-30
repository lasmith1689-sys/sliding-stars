import { applyGravity } from './gravity';
import { resolveMatchesOnce } from './resolve';
import { shuffleBoard } from './shuffle';
import { settle, type MoveResult } from './game';
import type { GameEvent } from './events';
import type { BoardState, Pos } from './types';

export type PowerUpKind = 'demo' | 'wormhole' | 'tractor';

/** Purchase costs in points (earned by playing — see POINTS in game.ts). */
export const POWER_UP_COST: Record<PowerUpKind, number> = {
  demo: 300,     // demolition charge: destroy one tile
  wormhole: 200, // rearrange the whole board
  tractor: 400,  // tractor beam: pull adjacent drifters onto a target tile
};

const clone = <T>(x: T): T => structuredClone(x);

/**
 * Purchase one power-up charge with crystals (the original's "+" buy badge).
 * Owning and consuming charges is the UI/save layer's job.
 */
export function buyPowerUp(state: BoardState, kind: PowerUpKind): MoveResult {
  if (state.status !== 'playing' || state.points < POWER_UP_COST[kind]) {
    return { state, events: [], legal: false };
  }
  const s = clone(state);
  s.points -= POWER_UP_COST[kind];
  return { state: s, events: [], legal: true };
}

/**
 * Use a power-up charge. Free at this layer (charges are bought via
 * buyPowerUp); never ticks need timers or consumes turns.
 * demo/tractor require a target cell; wormhole ignores it.
 */
export function usePowerUp(state: BoardState, kind: PowerUpKind, target?: Pos): MoveResult {
  const reject = (): MoveResult => ({ state, events: [], legal: false });
  if (state.status !== 'playing') return reject();

  const s = clone(state);
  const events: GameEvent[] = [];

  if (kind === 'wormhole') {
    events.push({ type: 'powerUp', kind });
    shuffleBoard(s, events);
    if (!events.some(e => e.type === 'shuffle')) return reject();
  } else {
    if (!target || !s.mask[target.r]?.[target.c]) return reject();
    // overlay objects (boxes/crystals/reactors/comets) shield their cell — and a
    // standalone box cell has no tile at all, so there is nothing to target
    if (s.overlays[target.r]?.[target.c]) return reject();
    const piece = s.grid[target.r]?.[target.c];
    if (!piece) return reject();
    if (kind === 'demo') {
      if (piece.kind !== 'tile') return reject(); // pods/shuttles are safe
      if (s.survivors.some((sv) => sv.r === target.r && sv.c === target.c &&
        sv.state !== 'housed' && sv.state !== 'lost')) return reject(); // never under a survivor
      events.push({ type: 'powerUp', kind, at: target });
      s.grid[target.r]![target.c] = null;
      applyGravity(s, events);
      while (resolveMatchesOnce(s, null, events)) applyGravity(s, events);
    } else {
      // tractor: target must be solid ground or a pod
      const solid = piece.kind === 'pod' || piece.kind === 'dome' ||
        (piece.kind === 'tile' && piece.tier >= 4);
      if (!solid) return reject();
      events.push({ type: 'powerUp', kind, at: target });
      let pulled = 0;
      for (const sv of s.survivors) {
        if (sv.state !== 'swimming') continue;
        const adj = Math.abs(sv.r - target.r) + Math.abs(sv.c - target.c) === 1;
        if (adj) {
          sv.r = target.r; sv.c = target.c;
          events.push({ type: 'survivorPulled', id: sv.id, to: target });
          pulled++;
        }
      }
      if (pulled === 0) return reject(); // nothing to pull — don't waste points
    }
  }

  settle(s, events, false); // no need ticks or turn cost for power-ups
  return { state: s, events, legal: true };
}
