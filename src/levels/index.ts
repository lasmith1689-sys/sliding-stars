import type { LevelDef } from '../core/types';
import { makeSolvableLevel } from '../core/generator';
import { LEVEL_001 } from './level001';

/**
 * Level registry. Levels are produced deterministically by the seeded,
 * solver-verified generator (fixed board size, difficulty scaling with the
 * index), so the game has effectively endless play with a difficulty curve.
 * levelFor(n) is memoized. LEVEL_001 is kept as a test fixture.
 */
const cache = new Map<number, LevelDef>();

export function levelFor(index: number): LevelDef {
  const i = Math.max(1, index);
  const hit = cache.get(i);
  if (hit) return hit;
  const def = makeSolvableLevel(i);
  cache.set(i, def);
  return def;
}

export { LEVEL_001 };
