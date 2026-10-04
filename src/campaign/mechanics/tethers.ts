import type {CampaignActor,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {sameCell} from '../engine/geometry';
import {actorFootprint,pieceAt} from '../engine/occupancy';
import {creditGoal} from '../engine/goals';
export interface TethersDef {id:'tethers';actorIds:string[]}
export interface TethersRuntime {id:'tethers';releasedIds:string[]}
export type Tether=Extract<CampaignActor,{kind:'tether'}>;
export function validateTethers(level:CampaignLevel):ValidationIssue[]{return level.actors.filter((a):a is Tether=>a.kind==='tether').flatMap(actor=>{
 const cells=actorFootprint(actor),crew=actor.passengerIds.map(id=>level.crew.find(c=>c.id===id));
 return actor.released||crew.some((c,i)=>!c||c.status!=='active'||c.carrierId!==actor.id||!sameCell(c.at,cells[i]!))||cells.some(p=>!level.pieces.some(t=>t.kind==='tile'&&sameCell(t.at,p)))?[{code:'tether-pair',levelId:level.id,entityId:actor.id,message:'Tether requires two ordered active passengers on its two ordinary terrain cells, unreleased'}]:[];
 });}
export function tetherStateError(state:CampaignState):string|null {
 const originals=state.level.actors.filter((a):a is Tether=>a.kind==='tether');if(!originals.length)return null;
 const runtime=state.mechanics.find(m=>m.id==='tethers');if(!runtime)return 'missing tether release ledger';
 for(const source of originals){const live=state.actors.find(a=>a.id===source.id),released=runtime.releasedIds.includes(source.id);
  if(released===!!live)return 'tether presence and release ledger disagree';
  if(live){if(live.kind!=='tether'||JSON.stringify({...live,at:source.at})!==JSON.stringify(source)||live.released)return 'tether offset or ordered passengers changed';const cells=actorFootprint(live);if(source.passengerIds.some((id,i)=>!sameCell(state.crew.find(c=>c.id===id)!.at,cells[i]!)))return 'tether passenger order changed';}
  for(const goal of state.level.goals.filter(g=>g.type==='transferCreatures')){const ids=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;for(const id of source.passengerIds)if(ids.includes(id)&&state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.includes(id)!==released)return 'tether goal disagrees with paired release';}
 }
 return null;
}
export const tethers:MechanicModule={id:'tethers',validate:validateTethers,settle(context){
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='tethers');if(!runtime)return false;let changed=false;
 for(const actor of stableIds(state.actors.filter((a):a is Tether=>a.kind==='tether'))){const cells=actorFootprint(actor) as [{r:number;c:number},{r:number;c:number}];if(!cells.every(at=>{const piece=pieceAt(state,at);return piece?.kind==='tile'&&piece.tier>=4;}))continue;
  const group=context.events.length;for(const id of actor.passengerIds){const crew=state.crew.find(c=>c.id===id)!;const before=structuredClone(crew);crew.carrierId=null;emit(context,{type:'transfer',crewId:id,fromCarrierId:actor.id,toCarrierId:null,from:crew.at,to:crew.at},group);emit(context,{type:'crew',crewId:id,before,after:crew},group);}
  state.actors=state.actors.filter(a=>a.id!==actor.id);emit(context,{type:'actor',actorId:actor.id,before:actor,after:null},group);
  const before=structuredClone(runtime);runtime.releasedIds.push(actor.id);runtime.releasedIds.sort();emit(context,{type:'mechanic',before,after:runtime},group);emit(context,{type:'tether',actorId:actor.id,phase:'released',passengerIds:actor.passengerIds,cells},group);
  for(const goal of state.level.goals)if(goal.type==='transferCreatures')for(const id of actor.passengerIds)creditGoal(context,goal.id,id);changed=true;
 }
 return changed;
}};
