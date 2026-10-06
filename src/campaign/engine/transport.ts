import type { Pos } from '../../core/types';
import type { CampaignState,TurnContext } from '../types';
import { activeCell,sameCell } from './geometry';
import { actorAt,actorFootprint,blocksActor,blocksTerrain,crewAt,pieceAt,pieceRiders } from './occupancy';
import { emit,stableIds } from './context';

export function canMoveActor(state:Pick<CampaignState,'geometry'|'pieces'|'crew'|'actors'|'fixtures'>,actorId:string,to:Pos):boolean {
  const actor=state.actors.find(a=>a.id===actorId);if(!actor)return false;
  const passengers='passengerIds'in actor?actor.passengerIds:[];
  return actorFootprint(actor,to).every(at=>{
    const terrain=pieceAt(state,at),occupant=actorAt(state,at);
    return activeCell(state.geometry,at)&&!blocksActor(state,at)&&terrain?.kind==='tile'&&
      (!occupant||occupant.id===actorId)&&crewAt(state,at).every(c=>passengers.includes(c.id));
  });
}
/** Actor transport never changes the terrain below its footprint. */
export function moveActor(context:TurnContext,actorId:string,to:Pos):boolean {
  const {state}=context,actor=state.actors.find(a=>a.id===actorId);if(!actor||sameCell(actor.at,to)||!canMoveActor(state,actorId,to))return false;
  let routeIndex:number|undefined;
  if('routeId'in actor&&actor.routeId!==null){
    routeIndex=state.geometry.routes.find(r=>r.id===actor.routeId)?.cells.findIndex(p=>sameCell(p,to));
    if(routeIndex===undefined||routeIndex<0)return false;
  }
  const from={...actor.at},dr=to.r-from.r,dc=to.c-from.c,passengerIds='passengerIds'in actor?[...actor.passengerIds]:[];
  actor.at={...to};if(routeIndex!==undefined&&'routeIndex'in actor)actor.routeIndex=routeIndex;
  const group=context.events.length;emit(context,{type:'move',entityId:actor.id,from,to,passengerIds},group);
  for(const crew of stableIds(state.crew.filter(c=>passengerIds.includes(c.id)))){
    const from={...crew.at};crew.at={r:from.r+dr,c:from.c+dc};emit(context,{type:'move',entityId:crew.id,from,to:crew.at,passengerIds:[]},group);
  }
  return true;
}
type PieceLayers=Pick<CampaignState,'geometry'|'pieces'|'crew'|'actors'|'fixtures'>;
export function canMovePieces(state:PieceLayers,moves:readonly {id:string;to:Pos}[]):boolean {
  const ids=new Set(moves.map(m=>m.id));
  if(ids.size!==moves.length||new Set(moves.map(m=>`${m.to.r},${m.to.c}`)).size!==moves.length)return false;
  const entries=moves.map(m=>({piece:state.pieces.find(p=>p.id===m.id),to:m.to,riders:pieceRiders(state,m.id)}));
  const riderIds=new Set(entries.flatMap(e=>e.riders.map(c=>c.id)));
  if(entries.some(({piece,to,riders})=>!piece||piece.kind==='station'||!activeCell(state.geometry,to)||blocksTerrain(state,to)||
    (pieceAt(state,to)&&!ids.has(pieceAt(state,to)!.id))||crewAt(state,to).some(c=>c.carrierId===null&&!riderIds.has(c.id))||
    (actorAt(state,to)&&(piece?.kind!=='tile'||riders.length>0))))return false;
  return true;
}
export function movePieces(context:TurnContext,moves:readonly {id:string;to:Pos}[]):boolean {
  const {state}=context;if(!canMovePieces(state,moves))return false;
  const entries=moves.map(m=>({piece:state.pieces.find(p=>p.id===m.id),to:m.to,riders:pieceRiders(state,m.id)}));
  const group=context.events.length;
  for(const {piece,to,riders} of entries){
    if(!piece||sameCell(piece.at,to))continue;
    const from={...piece.at};piece.at={...to};emit(context,{type:'move',entityId:piece.id,from,to,passengerIds:riders.map(c=>c.id)},group);
    for(const crew of stableIds(riders)){const from={...crew.at};crew.at={...to};emit(context,{type:'move',entityId:crew.id,from,to,passengerIds:[]},group);}
  }
  return true;
}
export function canMovePiece(state:CampaignState,id:string,to:Pos):boolean {
  const piece=state.pieces.find(p=>p.id===id),riders=pieceRiders(state,id);
  return !!piece&&piece.kind!=='station'&&activeCell(state.geometry,to)&&!blocksTerrain(state,to)&&
    (!pieceAt(state,to)||pieceAt(state,to)!.id===id)&&
    crewAt(state,to).every(c=>c.carrierId!==null||riders.some(r=>r.id===c.id))&&
    (!actorAt(state,to)||(piece.kind==='tile'&&!riders.length));
}
export function movePiece(context:TurnContext,id:string,to:Pos):boolean {return movePieces(context,[{id,to}]);}
