import type { Pos, Tier } from '../core/types';
import type { PowerUpKind } from '../core/powerups';
import type { MechanicDef, MechanicId, MechanicRuntime } from './mechanics/types';
export { MECHANIC_IDS } from './mechanics/types';
export type { MechanicDef, MechanicId, MechanicRuntime } from './mechanics/types';
export const CAMPAIGN_VERSION='2026.1' as const;
export const CAMPAIGN_RULES_VERSION='campaign-1' as const;
export const LEGACY_RULES_VERSION='legacy-1' as const;
export type Direction='down'|'left';
export interface GeometryDef {
  rows:number; cols:number; mask:boolean[][];
  /** Authored footprint cells temporarily absent from play (bridges/gates/repairs). */
  inactiveCells:Pos[];
  refillSources:{id:string;at:Pos;segmentId:string}[];
  gravitySegments:{id:string;cells:Pos[];direction:Direction;chamberId:string}[];
  chambers:{id:string;cells:Pos[];directions:Direction[]}[];
  routes:{id:string;cells:Pos[];loop:boolean}[];
  connections:{id:string;from:Pos;to:Pos;active:boolean}[];
  endpoints:{id:string;kind:'station'|'exit'|'nursery'|'supply-dock'|'staging';at:Pos;active:boolean}[];
}
export type CampaignPiece = {id:string;at:Pos} & (
  | {kind:'tile';tier:Tier}
  | {kind:'pod';passengerIds:string[]}
  | {kind:'station';facing:'left'|'right'}
  | {kind:'cargo';cargoKind:'capsule'|'harvest'|'key'|'kit';destinationId:string;passengerIds:string[]}
);
export interface CampaignCrew {
  id:string; at:Pos; status:'active'|'housed'|'evacuated'|'lost';carrierId:string|null;
  rescueMoves:number|null;shelterMoves:number|null;shelterStarted:boolean;vipId:string|null;
}
export type CampaignActor = {id:string;at:Pos} & (
  | {kind:'rover';routeId:string|null;routeIndex:number;passengerIds:string[]}
  | {kind:'moonwhale';routeId:string;routeIndex:number;passengerIds:string[];landing:Pos;transferRequested:boolean}
  | {kind:'pup';nurseryId:string}
  /** parcelId is a uniquely owned held item, not a separately placed cargo piece. */
  | {kind:'pirate';routeId:string;routeIndex:number;dockId:string;distraction:number;parcelId:string}
  | {kind:'dock';routeId:string;routeIndex:number;entrance:Pos;endpointId:string}
  | {kind:'tether';offset:Pos;passengerIds:[string,string];released:boolean}
  | {kind:'repair';routeId:string;routeIndex:number;jobs:{id:string;cell:Pos}[];nextJob:number;kitId:string|null}
);
export type CampaignFixture = {id:string;at:Pos} & (
  | {kind:'crate';hp:number}
  | {kind:'ice';hp:number}
  | {kind:'reactor';hp:number;fuse:number;period:number}
  | {kind:'comet';cells:Pos[];hp:number}
  | {kind:'portal';receiver:Pos;segmentId:string}
  | {kind:'bridge';cells:Pos[];connectionIds:string[];hits:number;active:boolean}
  | {kind:'garden';stage:number;harvestId:string;exitId:string;outputAt:Pos}
  | {kind:'gate';cells:Pos[];connectionIds:string[];open:boolean}
  | {kind:'lock';gateId:string;keyId:string}
  | {kind:'gravity-switch';chamberId:string;direction:Direction}
  | {kind:'solar';tier:Tier;quota:number;charge:number;endpointId:string}
  | {kind:'jelly';coatedCells:Pos[];preview:Pos|null}
  | {kind:'phase-door';open:boolean;closingPending:boolean}
  | {kind:'relay';order:number;active:boolean;endpointId:string}
);
export interface CampaignArrival {id:string;turn:number;entry:Pos;crew:CampaignCrew[];status:'pending'|'admitted'}
export type GoalEligibility={type:'ids';ids:string[]}|{type:'sources';sourceIds:string[];target:number};
export type CampaignGoal = {id:string;eligible:GoalEligibility} & (
  | {type:'homeCrew'} | {type:'recoverSupplies'} | {type:'evacuate'} | {type:'guideCreatures'}
  | {type:'transferCreatures'} | {type:'interceptDrones'} | {type:'restoreInfrastructure'}
  | {type:'growDeliverHarvest'} | {type:'simultaneousDepartures'}
);
export const GOAL_FAMILIES = {
  homeCrew:'home-crew',recoverSupplies:'recover-supplies',evacuate:'evacuate',
  guideCreatures:'creatures',transferCreatures:'creatures',interceptDrones:'intercept',
  restoreInfrastructure:'restore',growDeliverHarvest:'grow-deliver',simultaneousDepartures:'coordinate',
} as const;
export const SHAPE_FAMILIES=['compact-rectangle','tall-corridor','wide-shelf','diamond','stepped-terraces','l','t','cross','u','ring','linked-lobes','offset-chambers'] as const;
export interface CampaignLevel {
  id:number;campaignVersion:typeof CAMPAIGN_VERSION;rulesVersion:typeof CAMPAIGN_RULES_VERSION;
  chapter:number;seed:number;geometry:GeometryDef;pieces:CampaignPiece[];crew:CampaignCrew[];
  actors:CampaignActor[];fixtures:CampaignFixture[];arrivals:CampaignArrival[];mechanics:MechanicDef[];
  goals:CampaignGoal[];moveLimit:number|null;needMoves:number;
  presentationId:string;lessonId:string|null;rewardId:string;
  metadata:{shapeFamily:typeof SHAPE_FAMILIES[number];difficulty:'teaching'|'gentle'|'standard'|'challenge';purposeTags:string[];
    /** Scheduled demonstrations only; omitted means normal failure rules. */
    failurePolicy?:'no-failure';
    assistedAllowance:number;capOverride:{activeCrew:number;movingCarriers:number;spreadingSystems:number;playtestJustification:string}|null};
}
export interface GoalProgress {goalId:string;completedIds:string[]}
export interface CampaignState {
  /** Immutable authored definition travels with a save; runtime collections own changes. */
  level:CampaignLevel;levelId:number;campaignVersion:typeof CAMPAIGN_VERSION;rulesVersion:typeof CAMPAIGN_RULES_VERSION;
  turn:number;nextEntityId:number;rngState:number;geometry:GeometryDef;pieces:CampaignPiece[];crew:CampaignCrew[];
  actors:CampaignActor[];fixtures:CampaignFixture[];arrivals:CampaignArrival[];mechanics:MechanicRuntime[];
  goalProgress:GoalProgress[];movesRemaining:number|null;points:number;status:'playing'|'won'|'lost';
  transportedThisTurn:string[];pendingTransfers:{crewId:string;destinationId:string}[];
}
export type CampaignAction = {type:'swap';from:Pos;to:Pos}|{type:'translate';actorId:string;dr:number;dc:number}|{type:'booster';kind:PowerUpKind;at:Pos};
export type CampaignEvent = {sequenceId:number;timingGroup:number} & (
  | {type:'turn';before:number;after:number}
  | {type:'merge';mergeId:string;pieceIds:string[];cells:Pos[];at:Pos;before:Tier;after:Tier|'pod'|'station'}
  | {type:'spawn';piece:CampaignPiece}
  | {type:'refill';pieceId:string;sourceId:string;segmentId:string;from:Pos;to:Pos;direction:Direction}
  | {type:'gravity';switchId:string;chamberId:string;mergeId:string;at:Pos;before:Direction;after:Direction}
  | {type:'terrain';pieceId:string;at:Pos;before:Tier;after:Tier;causeId:string}
  | {type:'remove';piece:CampaignPiece;reason:'merge'|'departure'|'consumed'|'booster'}
  | {type:'crew';crewId:string;before:CampaignCrew|null;after:CampaignCrew|null}
  | {type:'arrival';arrivalId:string;before:'pending';after:'admitted';crewIds:string[]}
  | {type:'move';entityId:string;from:Pos;to:Pos;passengerIds:string[]}
  | {type:'transfer';crewId:string;fromCarrierId:string|null;toCarrierId:string|null;from:Pos;to:Pos}
  | {type:'fixture';fixtureId:string;before:CampaignFixture|null;after:CampaignFixture|null}
  | {type:'actor';actorId:string;before:CampaignActor|null;after:CampaignActor|null}
  | {type:'need';crewId:string;need:'rescue'|'shelter';before:number|null;after:number|null}
  | {type:'goal';goalId:string;before:string[];after:string[]}
  | {type:'status';before:CampaignState['status'];after:CampaignState['status']}
  | {type:'points';before:number;after:number}
  | {type:'geometry';before:GeometryDef;after:GeometryDef}
  | {type:'mechanic';before:MechanicRuntime;after:MechanicRuntime}
  | {type:'shelter';crewId:string;phase:'started';allowance:20}
  | {type:'bridge';bridgeId:string;mergeId:string;phase:'charged'|'opened';cells:Pos[]}
  | {type:'solar';collectorId:string;mergeId:string;phase:'charged'|'activated';charge:number;quota:number}
  | {type:'key';keyId:string;lockId:string;gateId:string;at:Pos;phase:'waiting'|'opened'}
  | {type:'garden';gardenId:string;mergeId:string|null;phase:'grown'|'waiting'|'harvested';stage:number;outputAt:Pos;harvestId:string}
  | {type:'current';routeId:string;phase:'shifted'|'waiting'}
  | {type:'portal';portalId:string;pieceId:string;passengerIds:string[];from:Pos;to:Pos;phase:'transferred'|'waiting'}
  | {type:'pirate';actorId:string;parcelId:string;dockId:string;phase:'distracted'|'waiting'|'practice-paused'|'returned'|'dock-reached';at:Pos}
  | {type:'jelly';fixtureId:string;phase:'preview'|'coated'|'cleared'|'waiting'|'practice-assisted'|'practice-waited';at:Pos|null}
  | {type:'dock';actorId:string;phase:'moving'|'waiting'|'boarded';at:Pos;entrance:Pos;crewId?:string}
  | {type:'phase';doorId:string;at:Pos;phase:'opened'|'closed'|'pending';open:boolean;closingPending:boolean}
);
export interface CampaignTransition {accepted:boolean;state:CampaignState;events:CampaignEvent[];rejection?:string}
export interface SolutionTrace {levelId:number;campaignVersion:typeof CAMPAIGN_VERSION;rulesVersion:typeof CAMPAIGN_RULES_VERSION;initialHash:string;actions:CampaignAction[];finalHash:string}
export interface ValidationIssue {code:string;levelId?:number;entityId?:string;message:string}
export interface TurnContext {state:CampaignState;events:CampaignEvent[];processedMergeIds:Set<string>;steppedActorIds:Set<string>}
export interface MechanicModule {
  id:MechanicId;validate(level:CampaignLevel):ValidationIssue[];
  /** Reset accepted ordinary-turn flags before any immediate merge. */
  beginTurn?(context:TurnContext):void;
  onMerge?(context:TurnContext,event:Extract<CampaignEvent,{type:'merge'}>):void;
  /** Refresh saved-state cues after settling, admission and terrain recovery. */
  snapshot?(context:TurnContext):void;
  /** Idempotent gravity-time transport. Return true only when the draft changed. */
  beforeRefill?(context:TurnContext):boolean;
  /** Idempotent immediate departures/effects; never advances a clock. */
  settle?(context:TurnContext):boolean;
  /** Kernel dispatches these per actor in global stable ID order, never module-wide loops. */
  transferActor?(context:TurnContext,actorId:string):void;
  stepActor?(context:TurnContext,actorId:string):void;
  transfer?(context:TurnContext):void;environment?(context:TurnContext):void;admit?(context:TurnContext):void;
  /** Once per accepted turn, after environment settles and before goals/needs. */
  finalize?(context:TurnContext):void;
}
