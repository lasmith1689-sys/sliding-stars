import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,sameCell,validateGravityCoverage} from '../engine/geometry';
import {actorAt,blocksTerrain,crewAt,pieceAt,pieceRiders} from '../engine/occupancy';
import {movePiece} from '../engine/transport';
export interface PortalsDef {id:'portals';fixtureIds:string[]}
/** Historical piece identities, including consumed pieces; never a transport guard. */
export interface PortalsRuntime {id:'portals';transferredPieceIds:string[]}
export type Portal=Extract<CampaignFixture,{kind:'portal'}>;
type Layers=Pick<CampaignState,'geometry'|'pieces'|'crew'|'actors'|'fixtures'>;
export function portalReceiverBlocked(state:Layers,portal:Portal):boolean {
 return !activeCell(state.geometry,portal.receiver)||!!pieceAt(state,portal.receiver)||!!actorAt(state,portal.receiver)||crewAt(state,portal.receiver).length>0||blocksTerrain(state,portal.receiver);
}
export function validatePortals(level:Pick<CampaignLevel,'id'|'geometry'|'fixtures'>):ValidationIssue[] {
 const portals=level.fixtures.filter(f=>f.kind==='portal');if(!portals.length)return [];
 const issues:ValidationIssue[]=[],add=(id:string,message:string)=>issues.push({code:'portal-topology',levelId:level.id,entityId:id,message});
 for(const portal of portals){
  const segment=level.geometry.gravitySegments.find(s=>s.id===portal.segmentId);
  if(!segment||!sameCell(segment.cells[0]!,portal.receiver)||level.geometry.refillSources.some(s=>s.segmentId===portal.segmentId))add(portal.id,'Portal receiver must head its unsourced discharge segment');
  if(portals.some(p=>p.id!==portal.id&&(p.segmentId===portal.segmentId||sameCell(p.receiver,portal.receiver))))add(portal.id,'Portal discharge segment must have a unique receiver');
  if(portals.some(p=>sameCell(p.at,portal.receiver)))add(portal.id,'Portal receivers cannot chain into an entry');
 }
 try{validateGravityCoverage(level);}catch(error){add(portals[0]!.id,`Portal geometry: ${error instanceof Error?error.message:String(error)}`);}
 return issues;
}
export const portals:MechanicModule={id:'portals',validate:validatePortals,beforeRefill(context){
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='portals');if(!runtime)return false;let changed=false;
 for(const portal of stableIds(state.fixtures.filter(f=>f.kind==='portal'))){
  const piece=pieceAt(state,portal.at);
  if(!piece||state.transportedThisTurn.includes(piece.id)||!activeCell(state.geometry,portal.at)||blocksTerrain(state,portal.at))continue;
  if(portalReceiverBlocked(state,portal)){
   // One visible wait per unchanged pair/piece, without creating another settle pass.
   if(!context.events.some(e=>e.type==='portal'&&e.portalId===portal.id&&e.pieceId===piece.id&&e.phase==='waiting'))emit(context,{type:'portal',portalId:portal.id,pieceId:piece.id,passengerIds:pieceRiders(state,piece.id).map(c=>c.id),from:portal.at,to:portal.receiver,phase:'waiting'});
   continue;
  }
  const passengerIds=pieceRiders(state,piece.id).map(c=>c.id),group=context.events.length;
  if(!movePiece(context,piece.id,portal.receiver))continue;
  state.transportedThisTurn.push(piece.id);state.transportedThisTurn.sort();
  if(!runtime.transferredPieceIds.includes(piece.id)){const before=structuredClone(runtime);runtime.transferredPieceIds.push(piece.id);runtime.transferredPieceIds.sort();emit(context,{type:'mechanic',before,after:runtime},group);}
  emit(context,{type:'portal',portalId:portal.id,pieceId:piece.id,passengerIds,from:portal.at,to:portal.receiver,phase:'transferred'},group);changed=true;
 }
 return changed;
}};
