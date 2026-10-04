import { doorCell } from '../../core/dome';
import { POINTS } from '../../core/game';
import type { CampaignCrew,CampaignState,TurnContext } from '../types';
import { activeCell,sameCell } from './geometry';
import { pieceAt } from './occupancy';
import { awardPoints,emit,stableIds } from './context';

export function safeTerrain(state:CampaignState,crew:CampaignCrew):boolean {
  if(crew.carrierId!==null)return true;
  const piece=pieceAt(state,crew.at);
  return !!piece&&(piece.kind==='pod'||piece.kind==='station'||(piece.kind==='tile'&&piece.tier>=4));
}
export function setNeed(context:TurnContext,crew:CampaignCrew,need:'rescue'|'shelter',after:number|null):void {
  const key=need==='rescue'?'rescueMoves':'shelterMoves',before=crew[key];if(before===after)return;
  crew[key]=after;emit(context,{type:'need',crewId:crew.id,need,before,after});
}
/** Immediate safety and door rescue; does not advance individual clocks. */
export function resolveCrewSafety(context:TurnContext):boolean {
  const {state}=context;
  let changed=false;
  const stations=state.pieces.filter(p=>p.kind==='station');
  for(const crew of stableIds(state.crew)){
    if(crew.status!=='active')continue;

    // Pods and rovers deliver to stations. Cargo and other actors own their destinations.
    const actor=state.actors.find(a=>a.id===crew.carrierId);
    const cargo=state.pieces.find(p=>p.id===crew.carrierId&&p.kind==='cargo');
    const solarHome=state.fixtures.some(f=>f.kind==='solar'&&f.charge===f.quota&&state.geometry.endpoints.some(e=>e.id===f.endpointId&&e.active&&sameCell(e.at,crew.at)));
    const relayHome=state.fixtures.some(f=>f.kind==='relay'&&f.active&&state.geometry.endpoints.some(e=>e.id===f.endpointId&&e.active&&sameCell(e.at,crew.at)));
    const home=!cargo&&(!actor||actor.kind==='rover')&&(solarHome||relayHome||stations.some(s=>sameCell(s.at,crew.at)||sameCell(doorCell(s.at.r,s.at.c,s.facing),crew.at)));
    if(home&&activeCell(state.geometry,crew.at)){
      const before=structuredClone(crew);
      const carrier=[...state.pieces,...state.actors].find(c=>c.id===crew.carrierId);
      if(carrier&&'passengerIds'in carrier&&carrier.kind!=='tether'){
        const snapshot=structuredClone(carrier);
        carrier.passengerIds=carrier.passengerIds.filter(id=>id!==crew.id);
        if(state.actors.some(a=>a.id===carrier.id)){
          emit(context,{
            type:'actor',actorId:carrier.id,
            before:snapshot as typeof state.actors[number],
            after:carrier as typeof state.actors[number],
          });
        }
      }
      crew.status='housed';
      crew.carrierId=null;
      setNeed(context,crew,'rescue',null);
      setNeed(context,crew,'shelter',null);
      emit(context,{type:'crew',crewId:crew.id,before,after:crew});
      awardPoints(context,POINTS.rescued);
      changed=true;
    }else if(safeTerrain(state,crew)){
      if(crew.rescueMoves!==null){
        setNeed(context,crew,'rescue',null);
        awardPoints(context,POINTS.grounded);
        changed=true;
      }
      const piece=pieceAt(state,crew.at);
      if(crew.carrierId===null&&piece?.kind==='pod'){
        const before=structuredClone(crew);
        crew.carrierId=piece.id;
        piece.passengerIds.push(crew.id);
        emit(context,{type:'transfer',crewId:crew.id,fromCarrierId:null,toCarrierId:piece.id,from:crew.at,to:crew.at});
        emit(context,{type:'crew',crewId:crew.id,before,after:crew});
        changed=true;
      }
    }else if(crew.rescueMoves===null){
      setNeed(context,crew,'rescue',state.level.needMoves);
      changed=true;
    }
  }
  return changed;
}
export function tickNeeds(context:TurnContext):void {
  if(context.state.level.metadata.failurePolicy==='no-failure')return;
  for(const crew of stableIds(context.state.crew)){
    if(crew.status!=='active')continue;
    for(const need of ['rescue','shelter'] as const){
      const count=need==='rescue'?crew.rescueMoves:crew.shelterMoves;
      // Only this transition's first safe arrival grants twenty subsequent moves.
      const activated=need==='shelter'&&context.events.some(e=>e.type==='shelter'&&e.crewId===crew.id&&e.phase==='started');
      if(count!==null&&!activated)setNeed(context,crew,need,Math.max(0,count-1));
    }
    if(crew.rescueMoves===0||crew.shelterMoves===0){
      const before=structuredClone(crew);crew.status='lost';
      // Carrier mechanisms with independent shelter clocks must detach before failure snapshots.
      const carrier=[...context.state.pieces,...context.state.actors].find(p=>p.id===crew.carrierId);
      if(carrier&&'passengerIds'in carrier&&carrier.kind!=='tether')carrier.passengerIds=carrier.passengerIds.filter(id=>id!==crew.id);
      crew.carrierId=null;emit(context,{type:'crew',crewId:crew.id,before,after:crew});
    }
  }
}
