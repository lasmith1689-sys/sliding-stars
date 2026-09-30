import { array,boolean,integer,nullable,object,oneOf,pair,text,union, type Decoder } from './decode';
import type { Pos, Tier } from '../core/types';
import { CAMPAIGN_RULES_VERSION,CAMPAIGN_VERSION,SHAPE_FAMILIES, type CampaignActor,type CampaignArrival,type CampaignCrew,type CampaignFixture,type CampaignGoal,type CampaignLevel,type CampaignPiece,type GeometryDef,type GoalEligibility,type MechanicDef,type MechanicRuntime } from './types';
export const count=integer(),positive=integer(1),id=text,ids=array(id),pos:Decoder<Pos>=object({r:count,c:count}),cells=array(pos,1),tier:Decoder<Tier>=oneOf([1,2,3,4,5]),direction=oneOf(['down','left']);
export const versions={campaignVersion:oneOf([CAMPAIGN_VERSION]),rulesVersion:oneOf([CAMPAIGN_RULES_VERSION])};
export const geometry:Decoder<GeometryDef>=object({
  rows:integer(1,9),cols:integer(1,7),mask:array(array(boolean,1,7),1,9),inactiveCells:array(pos),
  refillSources:array(object({id,at:pos,segmentId:id})),
  gravitySegments:array(object({id,cells,direction,chamberId:id})),
  chambers:array(object({id,cells,directions:array(direction,1,2)})),
  routes:array(object({id,cells,loop:boolean})),connections:array(object({id,from:pos,to:pos,active:boolean})),
  endpoints:array(object({id,kind:oneOf(['station','exit','nursery','supply-dock','staging']),at:pos,active:boolean})),
});
const placed={id,at:pos};
export const piece:Decoder<CampaignPiece>=union<CampaignPiece>('kind',{
  tile:object({...placed,kind:oneOf(['tile']),tier}),pod:object({...placed,kind:oneOf(['pod']),passengerIds:ids}),
  station:object({...placed,kind:oneOf(['station']),facing:oneOf(['left','right'])}),
  cargo:object({...placed,kind:oneOf(['cargo']),cargoKind:oneOf(['capsule','harvest','key','kit']),destinationId:id,passengerIds:ids}),
});
export const crew:Decoder<CampaignCrew>=object({...placed,status:oneOf(['active','housed','evacuated','lost']),carrierId:nullable(id),rescueMoves:nullable(count),shelterMoves:nullable(count),shelterStarted:boolean,vipId:nullable(id)});
export const actor:Decoder<CampaignActor>=union<CampaignActor>('kind',{
  rover:object({...placed,kind:oneOf(['rover']),routeId:nullable(id),routeIndex:count,passengerIds:ids}),
  moonwhale:object({...placed,kind:oneOf(['moonwhale']),routeId:id,routeIndex:count,passengerIds:ids,landing:pos,transferRequested:boolean}),
  pup:object({...placed,kind:oneOf(['pup']),nurseryId:id}),
  pirate:object({...placed,kind:oneOf(['pirate']),routeId:id,routeIndex:count,dockId:id,distraction:integer(0,2),parcelId:id}),
  dock:object({...placed,kind:oneOf(['dock']),routeId:id,routeIndex:count,entrance:pos,endpointId:id}),
  tether:object({...placed,kind:oneOf(['tether']),offset:object({r:integer(-1,1),c:integer(-1,1)}),passengerIds:pair(id),released:boolean}),
  repair:object({...placed,kind:oneOf(['repair']),routeId:id,routeIndex:count,jobs:array(object({id,cell:pos}),1),nextJob:count,kitId:nullable(id)}),
});
export const fixture:Decoder<CampaignFixture>=union<CampaignFixture>('kind',{
  crate:object({...placed,kind:oneOf(['crate']),hp:positive}),ice:object({...placed,kind:oneOf(['ice']),hp:positive}),
  reactor:object({...placed,kind:oneOf(['reactor']),hp:positive,fuse:count,period:positive}),
  comet:object({...placed,kind:oneOf(['comet']),cells,hp:positive}),
  portal:object({...placed,kind:oneOf(['portal']),receiver:pos,segmentId:id}),
  bridge:object({...placed,kind:oneOf(['bridge']),cells,connectionIds:ids,hits:integer(0,2),active:boolean}),
  garden:object({...placed,kind:oneOf(['garden']),stage:integer(0,3),harvestId:id,exitId:id,outputAt:pos}),
  gate:object({...placed,kind:oneOf(['gate']),cells,connectionIds:ids,open:boolean}),
  lock:object({...placed,kind:oneOf(['lock']),gateId:id,keyId:id}),
  'gravity-switch':object({...placed,kind:oneOf(['gravity-switch']),chamberId:id,direction}),
  solar:object({...placed,kind:oneOf(['solar']),tier,quota:positive,charge:count,endpointId:id}),
  jelly:object({...placed,kind:oneOf(['jelly']),coatedCells:array(pos),preview:nullable(pos)}),
  'phase-door':object({...placed,kind:oneOf(['phase-door']),open:boolean,closingPending:boolean}),
  relay:object({...placed,kind:oneOf(['relay']),order:positive,active:boolean,endpointId:id}),
});
export const arrival:Decoder<CampaignArrival>=object({id,turn:positive,entry:pos,crew:array(crew,1),status:oneOf(['pending','admitted'])});
const eligible:Decoder<GoalEligibility>=union<GoalEligibility>('type',{
  ids:object({type:oneOf(['ids']),ids:array(id,1)}),sources:object({type:oneOf(['sources']),sourceIds:array(id,1),target:positive}),
});
export const goal:Decoder<CampaignGoal>=object({id,type:oneOf(['homeCrew','recoverSupplies','evacuate','guideCreatures','transferCreatures','interceptDrones','restoreInfrastructure','growDeliverHarvest','simultaneousDepartures']),eligible});
export const mechanic:Decoder<MechanicDef>=union<MechanicDef>('id',{
  crates:object({id:oneOf(['crates']),fixtureIds:array(id,1)}),ice:object({id:oneOf(['ice']),fixtureIds:array(id,1)}),
  rovers:object({id:oneOf(['rovers']),actorIds:array(id,1)}),reactors:object({id:oneOf(['reactors']),fixtureIds:array(id,1)}),
  comets:object({id:oneOf(['comets']),fixtureIds:array(id,1)}),exits:object({id:oneOf(['exits']),endpointIds:array(id,1)}),
  waves:object({id:oneOf(['waves']),arrivalIds:array(id,1)}),moonwhales:object({id:oneOf(['moonwhales']),actorIds:array(id,1)}),
  pups:object({id:oneOf(['pups']),actorIds:array(id,1)}),currents:object({id:oneOf(['currents']),routeIds:array(id,1)}),
  pirates:object({id:oneOf(['pirates']),actorIds:array(id,1)}),portals:object({id:oneOf(['portals']),fixtureIds:array(id,1)}),
  bridges:object({id:oneOf(['bridges']),fixtureIds:array(id,1)}),shelter:object({id:oneOf(['shelter']),crewIds:array(id,1),allowance:oneOf([20])}),
  gardens:object({id:oneOf(['gardens']),fixtureIds:array(id,1)}),keys:object({id:oneOf(['keys']),fixtureIds:array(id,1)}),
  gravity:object({id:oneOf(['gravity']),fixtureIds:array(id,1)}),solar:object({id:oneOf(['solar']),fixtureIds:array(id,1)}),
  jelly:object({id:oneOf(['jelly']),fixtureIds:array(id,1)}),docks:object({id:oneOf(['docks']),actorIds:array(id,1)}),
  phase:object({id:oneOf(['phase']),fixtureIds:array(id,1)}),relays:object({id:oneOf(['relays']),fixtureIds:array(id,1)}),
  tethers:object({id:oneOf(['tethers']),actorIds:array(id,1)}),repair:object({id:oneOf(['repair']),actorIds:array(id,1)}),
  rendezvous:object({id:oneOf(['rendezvous']),endpointIds:pair(id),passengerIds:pair(id)}),
});
export const runtime:Decoder<MechanicRuntime>=union<MechanicRuntime>('id',{
  crates:object({id:oneOf(['crates']),openedIds:ids}),ice:object({id:oneOf(['ice']),thawedIds:ids}),
  rovers:object({id:oneOf(['rovers']),arrivedIds:ids}),reactors:object({id:oneOf(['reactors']),overloadCount:count}),
  comets:object({id:oneOf(['comets']),clearedIds:ids}),exits:object({id:oneOf(['exits']),departedIds:ids}),
  waves:object({id:oneOf(['waves']),admittedIds:ids}),moonwhales:object({id:oneOf(['moonwhales']),transferredIds:ids}),
  pups:object({id:oneOf(['pups']),arrivedIds:ids}),currents:object({id:oneOf(['currents']),shiftCount:count}),
  pirates:object({id:oneOf(['pirates']),interceptedIds:ids}),portals:object({id:oneOf(['portals']),transferredPieceIds:ids}),
  bridges:object({id:oneOf(['bridges']),activatedIds:ids}),shelter:object({id:oneOf(['shelter']),startedCrewIds:ids}),
  gardens:object({id:oneOf(['gardens']),harvestedIds:ids}),keys:object({id:oneOf(['keys']),unlockedIds:ids}),
  gravity:object({id:oneOf(['gravity']),toggleCount:count,flippedIds:ids}),solar:object({id:oneOf(['solar']),activatedIds:ids}),
  jelly:object({id:oneOf(['jelly']),turnsUntilSpread:integer(0,3),cancelledThisTurn:boolean}),
  docks:object({id:oneOf(['docks']),boardedIds:ids}),phase:object({id:oneOf(['phase']),waitingDoorIds:ids}),
  relays:object({id:oneOf(['relays']),nextNode:positive}),tethers:object({id:oneOf(['tethers']),releasedIds:ids}),
  repair:object({id:oneOf(['repair']),completedJobIds:ids}),rendezvous:object({id:oneOf(['rendezvous']),departed:boolean}),
});
export const level:Decoder<CampaignLevel>=object({
  id:integer(1,1000),...versions,chapter:integer(1,20),seed:integer(0,0xffffffff),geometry,
  pieces:array(piece),crew:array(crew),actors:array(actor),fixtures:array(fixture),arrivals:array(arrival),mechanics:array(mechanic,0,3),goals:array(goal,1,2),
  moveLimit:nullable(positive),needMoves:positive,presentationId:id,lessonId:nullable(id),rewardId:id,
  metadata:object({shapeFamily:oneOf(SHAPE_FAMILIES),difficulty:oneOf(['teaching','gentle','standard','challenge']),purposeTags:array(id,1),assistedAllowance:count,
    failurePolicy:(v,p)=>v===undefined?undefined:oneOf(['no-failure'])(v,p),
    capOverride:nullable(object({activeCrew:positive,movingCarriers:positive,spreadingSystems:positive,playtestJustification:text}))}),
});
