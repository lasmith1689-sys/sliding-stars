import { doorCell } from '../../core/dome';
import type { Pos } from '../../core/types';
import type { MechanicModule } from '../types';
import { emit,stableIds } from '../engine/context';
import { sameCell } from '../engine/geometry';
import { canMoveActor,moveActor } from '../engine/transport';
export type RoversDef={id:'rovers';actorIds:string[]};
export type RoversRuntime={id:'rovers';arrivedIds:string[]};
export const rovers:MechanicModule={id:'rovers',validate(level){
  return level.actors.filter(a=>a.kind==='rover').flatMap(a=>{
    if(a.routeId===null)return [];
    const route=level.geometry.routes.find(r=>r.id===a.routeId)!;
    const cells=route.loop?[...route.cells,route.cells[0]!]:route.cells;
    return cells.some((p,i)=>i>0&&Math.abs(p.r-cells[i-1]!.r)+Math.abs(p.c-cells[i-1]!.c)!==1)?[{code:'rover-route',levelId:level.id,entityId:a.id,message:'Rover route steps must be orthogonally adjacent'}]:[];
  });
},transferActor(context,id){
  const actor=context.state.actors.find(a=>a.id===id);if(actor?.kind!=='rover'||actor.passengerIds.length)return;
  const crew=stableIds(context.state.crew.filter(c=>c.status==='active'&&c.carrierId===null&&sameCell(c.at,actor.at)))[0];if(!crew)return;
  const beforeActor=structuredClone(actor),beforeCrew=structuredClone(crew);actor.passengerIds.push(crew.id);crew.carrierId=actor.id;
  emit(context,{type:'actor',actorId:id,before:beforeActor,after:actor});
  emit(context,{type:'transfer',crewId:crew.id,fromCarrierId:null,toCarrierId:id,from:crew.at,to:crew.at});
  emit(context,{type:'crew',crewId:crew.id,before:beforeCrew,after:crew});
},stepActor(context,id){
  const {state}=context,actor=state.actors.find(a=>a.id===id);if(actor?.kind!=='rover'||!actor.passengerIds.length)return;
  if(actor.routeId!==null){
    const route=state.geometry.routes.find(r=>r.id===actor.routeId)!;
    const next=route.cells[actor.routeIndex+1]??(route.loop?route.cells[0]:undefined);
    if(next)moveActor(context,id,next);return;
  }
  const targets=state.pieces.flatMap(p=>p.kind==='station'?[doorCell(p.at.r,p.at.c,p.facing)]:[]);
  const queue:{at:Pos;first:Pos|null}[]=[{at:actor.at,first:null}],seen=new Set([`${actor.at.r},${actor.at.c}`]);
  for(let i=0;i<queue.length;i++){
    const {at,first}=queue[i]!;
    if(targets.some(p=>sameCell(p,at))){if(first)moveActor(context,id,first);return;}
    for(const next of [{r:at.r-1,c:at.c},{r:at.r,c:at.c+1},{r:at.r+1,c:at.c},{r:at.r,c:at.c-1}]){
      const key=`${next.r},${next.c}`;if(seen.has(key)||!canMoveActor(state,id,next))continue;
      seen.add(key);queue.push({at:next,first:first??next});
    }
  }
},settle(context){
  let changed=false;
  for(const actor of stableIds(context.state.actors.filter(a=>a.kind==='rover'))){
    if(actor.passengerIds.length||!context.state.crew.some(c=>c.status==='housed'&&sameCell(c.at,actor.at)))continue;
    context.state.actors=context.state.actors.filter(a=>a.id!==actor.id);emit(context,{type:'actor',actorId:actor.id,before:actor,after:null});
    const runtime=context.state.mechanics.find(m=>m.id==='rovers');
    if(runtime){const before=structuredClone(runtime);runtime.arrivedIds.push(actor.id);emit(context,{type:'mechanic',before,after:runtime});}changed=true;
  }
  return changed;
}};
