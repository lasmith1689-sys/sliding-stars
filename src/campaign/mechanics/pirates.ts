import type {CampaignActor,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {activeCell,sameCell} from '../engine/geometry';
import {canMoveActor,moveActor} from '../engine/transport';
import {emit,stableIds} from '../engine/context';
import {creditGoal,setStatus} from '../engine/goals';
import {touches} from './wear';
export interface PiratesDef {id:'pirates';actorIds:string[]}
export interface PiratesRuntime {id:'pirates';interceptedIds:string[]}
export type Pirate=Extract<CampaignActor,{kind:'pirate'}>;
export function pirateNextStep(state:Pick<CampaignState,'geometry'>,pirate:Pirate){return state.geometry.routes.find(r=>r.id===pirate.routeId)?.cells[pirate.routeIndex+1]??null;}
export const pirates:MechanicModule={id:'pirates',validate(level){
 const issues:ValidationIssue[]=[];
 for(const pirate of level.actors.filter(a=>a.kind==='pirate')){
  const route=level.geometry.routes.find(r=>r.id===pirate.routeId),dock=level.geometry.endpoints.find(e=>e.id===pirate.dockId&&e.kind==='supply-dock'&&e.active);
  if(!route||route.loop||route.cells.length<2||!dock||!sameCell(route.cells.at(-1)!,dock.at)||route.cells.some((p,i)=>!activeCell(level.geometry,p)||(i>0&&Math.abs(p.r-route.cells[i-1]!.r)+Math.abs(p.c-route.cells[i-1]!.c)!==1))||new Set(route.cells.map(p=>`${p.r},${p.c}`)).size!==route.cells.length||pirate.distraction!==2||pirate.routeIndex>=route.cells.length-1)
   issues.push({code:'pirate-route',levelId:level.id,entityId:pirate.id,message:'Pirate drones require two distraction points and a simple active orthogonal route ending at their active supply dock'});
 }
 return issues;
},onMerge(context,event){
 for(const pirate of stableIds(context.state.actors.filter(a=>a.kind==='pirate'))){
  const key=`pirate:${pirate.id}:${event.mergeId}`;if(context.processedMergeIds.has(key)||!touches([pirate.at],event))continue;context.processedMergeIds.add(key);
  const before=structuredClone(pirate);pirate.distraction=Math.max(0,pirate.distraction-1);
  if(pirate.distraction){emit(context,{type:'actor',actorId:pirate.id,before,after:pirate});emit(context,{type:'pirate',actorId:pirate.id,parcelId:pirate.parcelId,dockId:pirate.dockId,phase:'distracted',at:pirate.at});continue;}
  const runtime=context.state.mechanics.find(m=>m.id==='pirates');if(!runtime)return;
  const prior=structuredClone(runtime);if(!runtime.interceptedIds.includes(pirate.id))runtime.interceptedIds.push(pirate.id);runtime.interceptedIds.sort();
  context.state.actors=context.state.actors.filter(a=>a.id!==pirate.id);
  const group=context.events.length;emit(context,{type:'pirate',actorId:pirate.id,parcelId:pirate.parcelId,dockId:pirate.dockId,phase:'returned',at:pirate.at},group);emit(context,{type:'actor',actorId:pirate.id,before,after:null},group);emit(context,{type:'mechanic',before:prior,after:runtime},group);
  for(const goal of context.state.level.goals)if(goal.type==='interceptDrones')creditGoal(context,goal.id,pirate.id);
 }
},stepActor(context,id){
 const pirate=context.state.actors.find(a=>a.id===id);if(pirate?.kind!=='pirate')return;
 const next=pirateNextStep(context.state,pirate),dock=context.state.geometry.endpoints.find(e=>e.id===pirate.dockId)!;
 // Authored demonstrations pause at the dock; every ordinary mission keeps the threat.
 const practicePause=next&&sameCell(next,dock.at)&&context.state.level.metadata.failurePolicy==='no-failure';
 if(!next||practicePause||!canMoveActor(context.state,id,next)){emit(context,{type:'pirate',actorId:id,parcelId:pirate.parcelId,dockId:pirate.dockId,phase:practicePause?'practice-paused':'waiting',at:pirate.at});return;}
 const before=structuredClone(pirate),group=context.events.length;moveActor(context,id,next);emit(context,{type:'actor',actorId:id,before,after:pirate},group);
 if(sameCell(pirate.at,dock.at)){emit(context,{type:'pirate',actorId:id,parcelId:pirate.parcelId,dockId:pirate.dockId,phase:'dock-reached',at:pirate.at});setStatus(context,'lost');}
}};
