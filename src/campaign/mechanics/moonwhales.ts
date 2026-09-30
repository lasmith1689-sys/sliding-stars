import type {CampaignActor,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {activeCell,sameCell} from '../engine/geometry';
import {actorAt,crewAt,pieceAt} from '../engine/occupancy';
import {emit,stableIds} from '../engine/context';
import {moveActor} from '../engine/transport';
import {creditGoal} from '../engine/goals';
export interface MoonwhalesDef {id:'moonwhales';actorIds:string[]}
export interface MoonwhalesRuntime {id:'moonwhales';transferredIds:string[]}
type Whale=Extract<CampaignActor,{kind:'moonwhale'}>;
const adjacent=(a:{r:number;c:number},b:{r:number;c:number})=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;
/** Actual landing occupancy, independent of the carried crew's paused rescue need. */
export function whaleLandingSafe(state:Pick<CampaignState,'geometry'|'pieces'|'crew'|'actors'|'fixtures'>,whale:Whale):boolean {
 const at=whale.landing,piece=pieceAt(state,at);
 return adjacent(whale.at,at)&&activeCell(state.geometry,at)&&!!piece&&(piece.kind==='tile'&&piece.tier>=4||piece.kind==='pod'&&piece.passengerIds.length===0)&&
  !actorAt(state,at)&&crewAt(state,at).length===0&&!state.fixtures.some(f=>[f.at,...('cells'in f?f.cells:f.kind==='portal'?[f.receiver]:f.kind==='jelly'?f.coatedCells:[])].some(p=>sameCell(p,at)));
}
export const moonwhales:MechanicModule={id:'moonwhales',validate(level){
 const issues:ValidationIssue[]=[];
 for(const whale of level.actors){if(whale.kind!=='moonwhale')continue;const route=level.geometry.routes.find(r=>r.id===whale.routeId);
  if(!route||!route.loop||route.cells.some((p,i)=>!adjacent(p,route.cells[(i+1)%route.cells.length]!)))issues.push({code:'moonwhale-loop',levelId:level.id,entityId:whale.id,message:'Moonwhales need a closed orthogonally adjacent loop'});
  if(!route?.cells.some(p=>adjacent(p,whale.landing)))issues.push({code:'moonwhale-landing',levelId:level.id,entityId:whale.id,message:'The marked landing must be reachable beside a loop stop'});
 }
 return issues;
},onMerge(context,event){
 for(const whale of stableIds(context.state.actors)){if(whale.kind!=='moonwhale'||!whale.passengerIds.length||whale.transferRequested||!event.cells.some(p=>adjacent(p,whale.at)))continue;
  const before=structuredClone(whale);whale.transferRequested=true;emit(context,{type:'actor',actorId:whale.id,before,after:whale});
 }
},transferActor(context,id){
 const {state}=context,whale=state.actors.find(a=>a.id===id),runtime=state.mechanics.find(m=>m.id==='moonwhales');
 if(whale?.kind!=='moonwhale'||!runtime||!whale.transferRequested||!whale.passengerIds.length||!whaleLandingSafe(state,whale))return;
 const landing=pieceAt(state,whale.landing)!,beforeActor=structuredClone(whale),beforeRuntime=structuredClone(runtime),group=context.events.length;
 for(const crew of stableIds(state.crew.filter(c=>whale.passengerIds.includes(c.id)))){
  const before=structuredClone(crew),from={...crew.at};crew.at={...whale.landing};crew.carrierId=landing.kind==='pod'?landing.id:null;
  if(landing.kind==='pod')landing.passengerIds.push(crew.id);
  emit(context,{type:'transfer',crewId:crew.id,fromCarrierId:whale.id,toCarrierId:crew.carrierId,from,to:crew.at},group);
  emit(context,{type:'crew',crewId:crew.id,before,after:crew},group);
  if(!runtime.transferredIds.includes(crew.id))runtime.transferredIds.push(crew.id);
 }
 whale.passengerIds=[];whale.transferRequested=false;runtime.transferredIds.sort();
 emit(context,{type:'actor',actorId:id,before:beforeActor,after:whale},group);emit(context,{type:'mechanic',before:beforeRuntime,after:runtime},group);
 for(const goal of state.level.goals)if(goal.type==='transferCreatures')for(const crewId of beforeActor.passengerIds)creditGoal(context,goal.id,crewId);
},stepActor(context,id){
 const whale=context.state.actors.find(a=>a.id===id);if(whale?.kind!=='moonwhale')return;
 const route=context.state.geometry.routes.find(r=>r.id===whale.routeId)!;
 moveActor(context,id,route.cells[(whale.routeIndex+1)%route.cells.length]!);
}};
