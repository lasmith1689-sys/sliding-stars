import type {Pos} from '../../core/types';
import type {CampaignActor,CampaignState,MechanicModule} from '../types';
import {activeCell,sameCell} from '../engine/geometry';
import {actorAt,blocksActor,crewAt,pieceAt} from '../engine/occupancy';
import {moveActor} from '../engine/transport';
import {emit} from '../engine/context';
import {creditGoal} from '../engine/goals';
export interface PupsDef {id:'pups';actorIds:string[]}
export interface PupsRuntime {id:'pups';arrivedIds:string[]}
type Pup=Extract<CampaignActor,{kind:'pup'}>;
type PupTerrain=Pick<CampaignState,'geometry'|'pieces'|'actors'|'crew'|'fixtures'>;
function safeEntry(state:PupTerrain,pup:Pup,at:Pos):boolean {
 const piece=pieceAt(state,at),occupant=actorAt(state,at);
 return activeCell(state.geometry,at)&&piece?.kind==='tile'&&piece.tier>=4&&!blocksActor(state,at)&&(!occupant||occupant.id===pup.id)&&crewAt(state,at).length===0;
}
/** The origin may have become unsafe; every entered cell must be ordinary safe terrain. */
export function pupNextStep(state:PupTerrain,pup:Pup):Pos|null {
 const nursery=state.geometry.endpoints.find(e=>e.id===pup.nurseryId&&e.kind==='nursery'&&e.active);
 if(!nursery)return null;
 const queue:{at:Pos;first:Pos|null}[]=[{at:pup.at,first:null}],seen=new Set([`${pup.at.r},${pup.at.c}`]);
 for(let i=0;i<queue.length;i++){
  const {at,first}=queue[i]!;if(sameCell(at,nursery.at))return first;
  const neighbors=[{r:at.r-1,c:at.c},{r:at.r,c:at.c-1},{r:at.r,c:at.c+1},{r:at.r+1,c:at.c}].sort((a,b)=>a.r-b.r||a.c-b.c);
  for(const next of neighbors){const key=`${next.r},${next.c}`;
   if(seen.has(key)||!safeEntry(state,pup,next))continue;
   seen.add(key);queue.push({at:next,first:first??next});
  }
 }
 return null;
}
export const pups:MechanicModule={id:'pups',validate(level){
 return level.actors.filter(a=>a.kind==='pup').flatMap(a=>level.geometry.endpoints.some(e=>e.id===a.nurseryId&&e.kind==='nursery'&&e.active)?[]:[{code:'pup-nursery',levelId:level.id,entityId:a.id,message:'Pups require an active nursery endpoint'}]);
},stepActor(context,id){
 const {state}=context,pup=state.actors.find(a=>a.id===id);if(pup?.kind!=='pup')return;
 const next=pupNextStep(state,pup);if(next)moveActor(context,id,next);
 const nursery=state.geometry.endpoints.find(e=>e.id===pup.nurseryId&&e.kind==='nursery'&&e.active);
 if(!nursery||!sameCell(pup.at,nursery.at)||!safeEntry(state,pup,nursery.at))return;
 const runtime=state.mechanics.find(m=>m.id==='pups');if(!runtime)return;
 const before=structuredClone(runtime);if(!runtime.arrivedIds.includes(id))runtime.arrivedIds.push(id);runtime.arrivedIds.sort();
 state.actors=state.actors.filter(a=>a.id!==id);emit(context,{type:'actor',actorId:id,before:pup,after:null});emit(context,{type:'mechanic',before,after:runtime});
 for(const goal of state.level.goals)if(goal.type==='guideCreatures')creditGoal(context,goal.id,id);
}};
