import type { LevelDef } from '../core/types';

/**
 * Level 1 — "First Light". One colonist waits on the biosphere shore; one
 * drifts in the void. Raise land under the drifter, then merge the biosphere
 * row into a rescue shuttle — survivors standing on merging tiles ride them in.
 * Shuttle path: swap (4,1)<->(5,1) makes r4 = 4,4,4 -> tier5 at (4,1);
 * then (4,1)<->(5,1) makes r5 = 5,5,5 -> shuttle, sweeping the shore survivor in.
 * No matches exist at load.
 */
export const LEVEL_001: LevelDef = {
  id: 1,
  mask: [
    '.###.',
    '#####',
    '##.##',
    '#####',
    '.###.',
    '.###.',
  ],
  tiles: [
    '.121.',
    '21312',
    '13.31',
    '32323',
    '.434.',
    '.545.',
  ],
  survivors: [{ r: 5, c: 1 }, { r: 1, c: 2 }],
  goal: { type: 'rescueN', n: 2 },
  seed: 11,
  needMoves: 25,
};
