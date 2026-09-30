import type { CampaignLevel,MechanicModule,ValidationIssue } from '../types';
import { emit,stableIds } from '../engine/context';
import { activeCell,sameCell,cellKey } from '../engine/geometry';
import { creditGoal } from '../engine/goals';
import { setNeed } from '../engine/needs';
export interface ExitsDef {id:'exits';endpointIds:string[]}
export interface ExitsRuntime {id:'exits';departedIds:string[]}

/** Fixed authored lower edges, including lower-facing edges of irregular masks. */
export function validateExits(level:CampaignLevel):ValidationIssue[] {
 const definition=level.mechanics.find(m=>m.id==='exits');if(!definition)return [];
 const issues:ValidationIssue[]=[],add=(code:string,entityId:string,message:string)=>issues.push({code,levelId:level.id,entityId,message});
 for(const id of definition.endpointIds){
  const exit=level.geometry.endpoints.find(e=>e.id===id);
  if(!exit||exit.kind!=='exit'||!exit.active||!activeCell(level.geometry,exit.at)||level.geometry.mask[exit.at.r+1]?.[exit.at.c])add('exit-boundary',id,'Evacuation exits require an active lower boundary of the permanent authored mask');
 }
 for(const cargo of level.pieces.filter(p=>p.kind==='cargo'&&(p.cargoKind==='capsule'||p.cargoKind==='harvest'))){
  if(cargo.kind!=='cargo')continue;
  const exit=level.geometry.endpoints.find(e=>e.id===cargo.destinationId);
  if(!exit||!definition.endpointIds.includes(exit.id)){add('exit-destination',cargo.id,'Cargo destination must be a declared evacuation exit');continue;}
  // Necessary reachability only: removable fixtures are optimistic. Solver/replay proves the actual route.
  const seen=new Set<string>(),queue=[cargo.at];
  for(let i=0;i<queue.length;i++){
   const at=queue[i]!;if(seen.has(cellKey(at)))continue;seen.add(cellKey(at));
   for(const portal of level.fixtures)if(portal.kind==='portal'&&sameCell(portal.at,at)&&!seen.has(cellKey(portal.receiver)))queue.push(portal.receiver);
   for(const p of [{r:at.r-1,c:at.c},{r:at.r+1,c:at.c},{r:at.r,c:at.c-1},{r:at.r,c:at.c+1}])if(level.geometry.mask[p.r]?.[p.c]&&!seen.has(cellKey(p)))queue.push(p);
  }
  if(!seen.has(cellKey(exit.at)))add('exit-unreachable',cargo.id,'Cargo and its exit are disconnected in the authored footprint');
 }
 return issues;
}
export const exits:MechanicModule={id:'exits',validate:validateExits,settle(context){
 const {state}=context,definition=state.level.mechanics.find(m=>m.id==='exits'),runtime=state.mechanics.find(m=>m.id==='exits');
 if(!definition||!runtime)return false;let changed=false;
 for(const piece of stableIds(state.pieces)){
  if(piece.kind!=='cargo'||runtime.departedIds.includes(piece.id))continue;
  const exit=state.level.geometry.endpoints.find(e=>e.id===piece.destinationId&&definition.endpointIds.includes(e.id));
  if(!exit?.active||!activeCell(state.geometry,exit.at)||!sameCell(piece.at,exit.at))continue;
  const group=context.events.length;
  for(const crew of stableIds(state.crew.filter(c=>piece.passengerIds.includes(c.id)))){
   const before=structuredClone(crew);crew.status='evacuated';crew.carrierId=null;
   setNeed(context,crew,'rescue',null);setNeed(context,crew,'shelter',null);
   emit(context,{type:'transfer',crewId:crew.id,fromCarrierId:piece.id,toCarrierId:null,from:piece.at,to:exit.at},group);
   emit(context,{type:'crew',crewId:crew.id,before,after:crew},group);
  }
  state.pieces=state.pieces.filter(p=>p.id!==piece.id);
  emit(context,{type:'remove',piece,reason:'departure'},group);
  const before=structuredClone(runtime);runtime.departedIds.push(piece.id);runtime.departedIds.sort();
  emit(context,{type:'mechanic',before,after:runtime},group);
  for(const goal of state.level.goals)if(goal.type==='evacuate'||goal.type==='recoverSupplies'||goal.type==='growDeliverHarvest'){
   creditGoal(context,goal.id,piece.id);
   if(goal.type==='evacuate')for(const id of piece.passengerIds)creditGoal(context,goal.id,id);
  }
  changed=true;
 }
 return changed;
}};
