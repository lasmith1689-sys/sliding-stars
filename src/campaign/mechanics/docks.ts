import {POINTS} from '../../core/game';
import type {Pos} from '../../core/types';
import type {CampaignActor,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {activeCell,sameCell} from '../engine/geometry';
import {actorAt,blocksActor,isRendezvousPassenger,pieceAt} from '../engine/occupancy';
import {canMoveActor,moveActor} from '../engine/transport';
import {safeTerrain,setNeed} from '../engine/needs';
import {awardPoints,emit,stableIds} from '../engine/context';

export interface DocksDef {id:'docks';actorIds:string[]}
export interface DocksRuntime {id:'docks';boardedIds:string[]}
export type Dock=Extract<CampaignActor,{kind:'dock'}>;
const add=(a:Pos,b:Pos):Pos=>({r:a.r+b.r,c:a.c+b.c});
const subtract=(a:Pos,b:Pos):Pos=>({r:a.r-b.r,c:a.c-b.c});
const adjacent=(a:Pos,b:Pos)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;
const issue=(levelId:number,entityId:string,message:string):ValidationIssue=>({code:'dock-route',levelId,entityId,message});

export function validateDocks(level:CampaignLevel):ValidationIssue[] {
 const issues:ValidationIssue[]=[],owners=new Set<string>();
 for(const dock of level.actors.filter((a):a is Dock=>a.kind==='dock')){
  const route=level.geometry.routes.find(r=>r.id===dock.routeId),endpoint=level.geometry.endpoints.find(e=>e.id===dock.endpointId);
  if(owners.has(dock.endpointId))issues.push(issue(level.id,dock.id,'Dock endpoint must have exactly one moving owner'));
  owners.add(dock.endpointId);
  if(!route||!route.cells.length||route.cells.some((at,i)=>!activeCell(level.geometry,at)||i>0&&!adjacent(route.cells[i-1]!,at))||
    route.loop&&route.cells.length>1&&!adjacent(route.cells.at(-1)!,route.cells[0]!))issues.push(issue(level.id,dock.id,'Dock track must contain active orthogonal steps'));
  if(!adjacent(dock.at,dock.entrance)||!endpoint||endpoint.kind!=='station'||!endpoint.active||!sameCell(endpoint.at,dock.entrance))
   issues.push(issue(level.id,dock.id,'Dock must own an active station endpoint at its absolute adjacent entrance'));
  if(route){const offset=subtract(dock.entrance,dock.at);for(const at of route.cells){
   if(!activeCell(level.geometry,add(at,offset)))issues.push(issue(level.id,dock.id,'Every dock stop needs an active entrance cell'));
  }}
  if(level.fixtures.some(f=>f.kind==='solar'&&f.endpointId===dock.endpointId||f.kind==='relay'&&f.endpointId===dock.endpointId))
   issues.push(issue(level.id,dock.id,'Dock endpoint cannot be owned by another mechanic'));
 }
 return issues;
}
export function dockStateError(state:CampaignState):string|null {
 const runtime=state.mechanics.find(m=>m.id==='docks');
 for(const authored of state.level.actors.filter((a):a is Dock=>a.kind==='dock')){
  const dock=state.actors.find(a=>a.id===authored.id),endpoint=state.geometry.endpoints.find(e=>e.id===authored.endpointId);
  const route=state.geometry.routes.find(r=>r.id===authored.routeId),original=state.level.geometry.routes.find(r=>r.id===authored.routeId);
  if(dock?.kind!=='dock'||!endpoint||endpoint.kind!=='station'||!endpoint.active||!route||!original||
    JSON.stringify(route)!==JSON.stringify(original)||dock.routeId!==authored.routeId||dock.endpointId!==authored.endpointId||
    !sameCell(dock.entrance,add(dock.at,subtract(authored.entrance,authored.at)))||!sameCell(endpoint.at,dock.entrance))
   return 'dock route, entrance and endpoint must retain their authored relationship';
 }
 if(runtime?.id==='docks'&&runtime.boardedIds.some(id=>state.crew.find(c=>c.id===id)?.status!=='housed'))return 'boarded dock guest must remain housed';
 return null;
}
export function dockNextStep(state:Pick<CampaignState,'geometry'>,dock:Dock):Pos|null {
 const route=state.geometry.routes.find(r=>r.id===dock.routeId);
 return route?.cells[dock.routeIndex+1]??(route?.loop?route.cells[0]??null:null);
}
export function dockCanStep(state:Pick<CampaignState,'geometry'|'pieces'|'crew'|'actors'|'fixtures'>,dock:Dock,next:Pos):boolean {
 const entrance=add(next,subtract(dock.entrance,dock.at));
 return canMoveActor(state,dock.id,next)&&activeCell(state.geometry,entrance)&&!blocksActor(state,entrance)&&
  (!actorAt(state,entrance)||actorAt(state,entrance)?.id===dock.id);
}
export function dockCanBoard(state:Pick<CampaignState,'geometry'|'pieces'|'crew'|'actors'|'fixtures'>,dock:Dock):boolean {
 const endpoint=state.geometry.endpoints.find(e=>e.id===dock.endpointId);
 return !!endpoint&&endpoint.active&&sameCell(endpoint.at,dock.entrance)&&activeCell(state.geometry,dock.entrance)&&
  !blocksActor(state,dock.entrance)&&(!actorAt(state,dock.entrance)||actorAt(state,dock.entrance)?.id===dock.id);
}
export const docks:MechanicModule={id:'docks',validate:validateDocks,stepActor(context,id){
 const {state}=context,dock=state.actors.find(a=>a.id===id);if(dock?.kind!=='dock')return;
 const next=dockNextStep(state,dock);
 if(!next||!dockCanStep(state,dock,next)){emit(context,{type:'dock',actorId:id,phase:'waiting',at:dock.at,entrance:dock.entrance});return;}
 const beforeActor=structuredClone(dock),beforeGeometry=structuredClone(state.geometry),offset=subtract(dock.entrance,dock.at);
 if(!moveActor(context,id,next))return;
 dock.entrance=add(next,offset);
 const endpoint=state.geometry.endpoints.find(e=>e.id===dock.endpointId)!;endpoint.at={...dock.entrance};
 const group=context.events.length;
 emit(context,{type:'actor',actorId:id,before:beforeActor,after:dock},group);
 emit(context,{type:'geometry',before:beforeGeometry,after:state.geometry},group);
 emit(context,{type:'dock',actorId:id,phase:'moving',at:dock.at,entrance:dock.entrance},group);
},settle(context){
 let changed=false;const {state}=context,runtime=state.mechanics.find(m=>m.id==='docks');if(runtime?.id!=='docks')return false;
 for(const dock of stableIds(state.actors.filter((a):a is Dock=>a.kind==='dock'))){
  if(!dockCanBoard(state,dock))continue;
  for(const crew of stableIds(state.crew.filter(c=>c.status==='active'&&sameCell(c.at,dock.entrance)))){
   if(runtime.boardedIds.includes(crew.id)||isRendezvousPassenger(state,crew.id)||!safeTerrain(state,crew))continue;
   const carrier=crew.carrierId===null?null:state.pieces.find(p=>p.id===crew.carrierId&&p.kind==='pod');
   if(crew.carrierId!==null&&!carrier)continue;
   const before=structuredClone(crew),beforeRuntime=structuredClone(runtime),group=context.events.length;
   if(carrier?.kind==='pod'){
    carrier.passengerIds=carrier.passengerIds.filter(id=>id!==crew.id);
    emit(context,{type:'transfer',crewId:crew.id,fromCarrierId:carrier.id,toCarrierId:null,from:crew.at,to:crew.at},group);
   }
   crew.carrierId=null;crew.status='housed';setNeed(context,crew,'rescue',null);setNeed(context,crew,'shelter',null);
   runtime.boardedIds.push(crew.id);runtime.boardedIds.sort();
   emit(context,{type:'crew',crewId:crew.id,before,after:crew},group);
   emit(context,{type:'mechanic',before:beforeRuntime,after:runtime},group);
   emit(context,{type:'dock',actorId:dock.id,phase:'boarded',at:dock.at,entrance:dock.entrance,crewId:crew.id},group);
   awardPoints(context,POINTS.rescued);changed=true;
  }
 }
 return changed;
}};
