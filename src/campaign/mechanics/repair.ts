import type {CampaignActor,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,cellKey,sameCell,validateGravityCoverage} from '../engine/geometry';
import {moveActor} from '../engine/transport';
import {creditGoal} from '../engine/goals';
export interface RepairDef {id:'repair';actorIds:string[]}
export interface RepairRuntime {id:'repair';completedJobIds:string[]}
export type RepairBot=Extract<CampaignActor,{kind:'repair'}>;
/** Other infrastructure validators share only authored, ledger-backed openings. */
export function completedRepairCells(state:Pick<CampaignState,'level'|'mechanics'>):Set<string>{
 const completed=new Set(state.mechanics.find(m=>m.id==='repair')?.completedJobIds??[]);
 return new Set(state.level.actors.flatMap(actor=>actor.kind==='repair'?actor.jobs.filter(job=>completed.has(job.id)).map(job=>cellKey(job.cell)):[]));
}
export function repairJob(_state:unknown,actor:RepairBot){return actor.jobs[actor.nextJob]??null;}
export function repairStep(state:Pick<CampaignState,'geometry'>,actor:RepairBot){return state.geometry.routes.find(r=>r.id===actor.routeId)?.cells[actor.routeIndex+1]??null;}
export function validateRepair(level:CampaignLevel):ValidationIssue[]{
 const actors=level.actors.filter((a):a is RepairBot=>a.kind==='repair'),issues:ValidationIssue[]=[],owned=new Set<string>(level.fixtures.flatMap(f=>f.kind==='bridge'||f.kind==='gate'?f.cells.map(cellKey):[]));
 const add=(id:string,message:string)=>issues.push({code:'repair-jobs',levelId:level.id,entityId:id,message});
 for(const actor of actors){const route=level.geometry.routes.find(r=>r.id===actor.routeId),kits=level.pieces.filter(p=>p.kind==='cargo'&&p.cargoKind==='kit'&&p.destinationId===actor.id);
  if(actor.nextJob!==0||actor.kitId!==null||actor.routeIndex!==0||!route||route.loop||route.cells.some((p,i)=>i>0&&Math.abs(p.r-route.cells[i-1]!.r)+Math.abs(p.c-route.cells[i-1]!.c)!==1))add(actor.id,'Repair bot must start empty at the beginning of a connected nonloop route');
  if(kits.length!==1)add(actor.id,'Repair bot requires one exact authored repair kit');
  for(const job of actor.jobs){const key=cellKey(job.cell);if(owned.has(key)||activeCell(level.geometry,job.cell)||!route?.cells.some(p=>Math.abs(p.r-job.cell.r)+Math.abs(p.c-job.cell.c)===1))add(actor.id,'Repair jobs must uniquely own inactive cells beside their bot route');owned.add(key);}
 }
 try{validateGravityCoverage(level);}catch(error){if(actors.length)add(actors[0]!.id,`Repair refill coverage: ${String(error)}`);}
 return issues;
}
export function repairStateError(state:CampaignState):string|null{
 const actors=state.level.actors.filter((a):a is RepairBot=>a.kind==='repair');if(!actors.length)return null;
 const runtime=state.mechanics.find(m=>m.id==='repair');if(!runtime)return 'missing repair job ledger';
 const repaired=new Set<string>();
 for(const source of actors){const actor=state.actors.find(a=>a.id===source.id),route=state.geometry.routes.find(r=>r.id===source.routeId),kit=state.level.pieces.find(p=>p.kind==='cargo'&&p.cargoKind==='kit'&&p.destinationId===source.id)!;
  if(actor?.kind!=='repair'||actor.routeId!==source.routeId||JSON.stringify(actor.jobs)!==JSON.stringify(source.jobs)||JSON.stringify(route)!==JSON.stringify(state.level.geometry.routes.find(r=>r.id===source.routeId)))return 'repair identity, jobs or route changed';
  const liveKit=state.pieces.find(p=>p.id===kit.id);
  if(actor.kitId!==null&&actor.kitId!==kit.id||!!liveKit!==(actor.kitId===null)||liveKit&&JSON.stringify({...liveKit,at:kit.at})!==JSON.stringify(kit))return 'repair exact kit identity, ownership and consumed cargo disagree';
  if(actor.nextJob>0&&actor.kitId===null)return 'repair jobs completed without a kit';
  for(const [index,job] of source.jobs.entries()){const done=index<actor.nextJob;if(runtime.completedJobIds.includes(job.id)!==done||activeCell(state.geometry,job.cell)!==done)return 'repair ordered job, geometry and ledger disagree';if(done)repaired.add(cellKey(job.cell));for(const goal of state.level.goals.filter(g=>g.type==='restoreInfrastructure')){const ids=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;if(ids.includes(job.id)&&state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.includes(job.id)!==done)return 'repair goal disagrees with completed job';}}
 }
 const opened=state.fixtures.flatMap(f=>f.kind==='gate'&&f.open||f.kind==='bridge'&&f.active?'cells'in f?f.cells.map(cellKey):[]:[]),expected=state.level.geometry.inactiveCells.filter(p=>!repaired.has(cellKey(p))&&!opened.includes(cellKey(p)));
 if(JSON.stringify(state.geometry.inactiveCells)!==JSON.stringify(expected))return 'repair changed unrelated terrain activation';
 const openLinks=new Set(state.fixtures.flatMap(f=>f.kind==='gate'&&f.open||f.kind==='bridge'&&f.active?'connectionIds'in f?f.connectionIds:[]:[]));
 if(JSON.stringify(state.geometry.connections)!==JSON.stringify(state.level.geometry.connections.map(link=>openLinks.has(link.id)?{...link,active:true}:link)))return 'repair changed unrelated connection topology';
 for(const source of state.level.geometry.gravitySegments)if(JSON.stringify(state.geometry.gravitySegments.find(s=>s.id===source.id))!==JSON.stringify(source)&&!state.level.mechanics.some(m=>m.id==='gravity'))return 'repair refill topology changed';
 if(JSON.stringify(state.geometry.refillSources)!==JSON.stringify(state.level.geometry.refillSources)&&!state.level.mechanics.some(m=>m.id==='gravity'))return 'repair refill sources changed';
 return null;
}
export const repair:MechanicModule={id:'repair',validate:validateRepair,stepActor(context,id){const actor=context.state.actors.find(a=>a.id===id);if(actor?.kind!=='repair'||actor.nextJob===actor.jobs.length)return;const to=repairStep(context.state,actor);if(!actor.kitId||!to||!moveActor(context,id,to))emit(context,{type:'repair',actorId:id,phase:'waiting',jobId:actor.jobs[actor.nextJob]!.id,kitId:actor.kitId,at:actor.at});},settle(context){
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='repair');if(!runtime)return false;let changed=false;
 for(const actor of stableIds(state.actors.filter((a):a is RepairBot=>a.kind==='repair'))){
  if(!actor.kitId){const kit=state.pieces.find(p=>p.kind==='cargo'&&p.cargoKind==='kit'&&p.destinationId===actor.id&&Math.abs(p.at.r-actor.at.r)+Math.abs(p.at.c-actor.at.c)===1);if(!kit)continue;const before=structuredClone(actor);actor.kitId=kit.id;state.pieces=state.pieces.filter(p=>p.id!==kit.id);emit(context,{type:'remove',piece:kit,reason:'consumed'});emit(context,{type:'actor',actorId:actor.id,before,after:actor});emit(context,{type:'repair',actorId:actor.id,phase:'collected',jobId:null,kitId:kit.id,at:actor.at});changed=true;}
  const job=repairJob(state,actor);if(!job||Math.abs(job.cell.r-actor.at.r)+Math.abs(job.cell.c-actor.at.c)!==1)continue;
  const group=context.events.length,before=structuredClone(actor),geometry=structuredClone(state.geometry),ledger=structuredClone(runtime);actor.nextJob++;state.geometry.inactiveCells=state.geometry.inactiveCells.filter(p=>!sameCell(p,job.cell));runtime.completedJobIds.push(job.id);runtime.completedJobIds.sort();
  emit(context,{type:'actor',actorId:actor.id,before,after:actor},group);emit(context,{type:'geometry',before:geometry,after:state.geometry},group);emit(context,{type:'mechanic',before:ledger,after:runtime},group);emit(context,{type:'repair',actorId:actor.id,phase:'repaired',jobId:job.id,kitId:actor.kitId,at:job.cell},group);
  for(const goal of state.level.goals)if(goal.type==='restoreInfrastructure')creditGoal(context,goal.id,job.id);changed=true;
 }
 return changed;
}};
