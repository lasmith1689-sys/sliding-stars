import type { Pos, Tier } from './types';

export type GameEvent =
  | { type: 'swap'; a: Pos; b: Pos }
  | { type: 'swapRejected'; a: Pos; b: Pos }
  | { type: 'merge'; cells: Pos[]; anchor: Pos; newTier: Tier }
  | { type: 'podCreated'; at: Pos }
  | { type: 'domeCreated'; at: Pos }
  | { type: 'fall'; from: Pos; to: Pos }
  | { type: 'spawn'; at: Pos; tier: Tier }
  | { type: 'survivorGrounded'; id: number }
  | { type: 'survivorHoused'; id: number }
  | { type: 'survivorLost'; id: number }
  | { type: 'needTick'; id: number; movesLeft: number }
  | { type: 'won' }
  | { type: 'lost' }
  | { type: 'shuffle'; moves: Array<{ from: Pos; to: Pos }> }
  | { type: 'points'; amount: number; reason: PointReason; at?: Pos }
  | { type: 'powerUp'; kind: 'demo' | 'wormhole' | 'tractor'; at?: Pos }
  | { type: 'survivorPulled'; id: number; to: Pos }
  | { type: 'canisterHit'; at: Pos; hp: number }
  | { type: 'canisterBroken'; at: Pos }
  | { type: 'crystalHit'; at: Pos; hp: number }
  | { type: 'crystalCleared'; at: Pos }
  | { type: 'reactorHit'; at: Pos; hp: number }
  | { type: 'reactorCleared'; at: Pos }
  | { type: 'reactorErupted'; at: Pos }
  | { type: 'cometHit'; cells: Pos[]; hp: number }
  | { type: 'cometFreed'; cells: Pos[] }
  | { type: 'roverMoved'; id: number; riderId:number; to: Pos };

export type PointReason =
  | 'merge'      // joined 3 tiles
  | 'bigMerge'   // joined 4+ tiles
  | 'pod'        // launched an escape pod
  | 'shuttle'    // landed a rescue shuttle
  | 'grounded'   // got a drifter onto solid ground
  | 'rescued'    // survivor boarded the shuttle
  | 'special';   // broke a special tile (overlays, Plan 3)
