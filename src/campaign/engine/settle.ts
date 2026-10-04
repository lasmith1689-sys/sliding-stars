import { findJunctions } from '../../core/match';
import { chooseFacing } from '../../core/dome';
import { createRng } from '../../core/rng';
import { POINTS } from '../../core/game';
import type { Pos,Tier } from '../../core/types';
import type { CampaignPiece,MechanicModule,TurnContext } from '../types';
import { allocateId,awardPoints,CampaignContentError,emit,stableIds } from './context';
import { activeMask,gravitySegments,sameCell } from './geometry';
import { blocksMatch,pieceAt,pieceRiders } from './occupancy';
import { canMovePiece,movePiece } from './transport';
import { terrainMatches } from './matches';
import { resolveCrewSafety } from './needs';

export function resolveTerrainMatches(context:TurnContext,movedCell:Pos|null,modules:readonly MechanicModule[]):boolean {
  const {state}=context;
  const matches=terrainMatches(state);
  const junctions=findJunctions(matches,movedCell);
  let changed=false;

  const merge=(cells:Pos[],tier:Tier,pivot:Pos|null,junction:boolean)=>{
    const pieces=cells.flatMap(at=>{
      const p=pieceAt(state,at);
      return p?.kind==='tile'&&p.tier===tier?[p]:[];
    });
    if(pieces.length<(junction?5:3))return;

    const at=pivot??(movedCell&&pieces.some(p=>sameCell(p.at,movedCell))?movedCell:pieces[Math.floor(pieces.length/2)]!.at);
    const station=tier===5||(tier>=4&&(junction||pieces.length>=4));
    const pod=!station&&(junction||pieces.length>=4);
    const id=allocateId(state);
    let piece:CampaignPiece;
    if(station){
      const rng=createRng(state.rngState);
      piece={
        id,at:{...at},kind:'station',
        facing:chooseFacing(
          activeMask(state.geometry),state.geometry.rows,state.geometry.cols,
          at.r,at.c,rng.next(),(r,c)=>blocksMatch(state,{r,c}),
        ),
      };
      state.rngState=rng.state();
    }else{
      piece=pod
        ?{id,at:{...at},kind:'pod',passengerIds:[]}
        :{id,at:{...at},kind:'tile',tier:(tier+1) as Tier};
    }

    const riders=stableIds(pieces.flatMap(p=>pieceRiders(state,p.id)));
    const ids=new Set(pieces.map(p=>p.id));
    const mergeEvent={
      type:'merge' as const,mergeId:`merge-${state.turn}-${id}`,
      pieceIds:pieces.map(p=>p.id),cells:pieces.map(p=>p.at),at,before:tier,
      after:piece.kind==='tile'?piece.tier:piece.kind,
    };
    emit(context,mergeEvent);
    for(const removed of pieces){
      emit(context,{type:'remove',piece:removed,reason:'merge'});
    }
    state.pieces=state.pieces.filter(p=>!ids.has(p.id));
    state.pieces.push(piece);
    emit(context,{type:'spawn',piece});
    for(const crew of riders){
      const from={...crew.at};
      crew.at={...at};
      if(!sameCell(from,at)){
        emit(context,{type:'move',entityId:crew.id,from,to:at,passengerIds:[]});
      }
    }

    const resultTier=station?5:(tier+1);
    awardPoints(context,POINTS.merge*resultTier+(pieces.length>=4?POINTS.bigMerge:0)+(pod?POINTS.pod:station?POINTS.shuttle:0));
    const event=context.events.find(e=>e.type==='merge'&&e.mergeId===mergeEvent.mergeId)!;
    if(event.type==='merge'&&!context.processedMergeIds.has(event.mergeId)){
      context.processedMergeIds.add(event.mergeId);
      for(const module of modules){
        module.onMerge?.(context,event);
      }
    }
    changed=true;
  };
  for(const junction of junctions)merge(junction.cells,junction.tier,junction.pivot,true);
  for(const match of matches)merge(match.cells,match.tier,null,false);
  return changed;
}

export function fallPieces(context:TurnContext):boolean {
  let changed=false;
  for(const run of gravitySegments(context.state)){
    for(let index=run.cells.length-2;index>=0;index--){
      const piece=pieceAt(context.state,run.cells[index]!);if(!piece)continue;
      // A winch holds its own supply capsule; only a real adjacent merge can
      // pull it along the authored lane. Ordinary gravity cannot skip a stop.
      if(context.state.fixtures.some(f=>f.kind==='magnet'&&f.cargoId===piece.id))continue;
      if(piece.kind==='cargo'&&piece.cargoKind==='key'&&context.state.fixtures.some(f=>f.kind==='lock'&&f.id===piece.destinationId&&f.keyId===piece.id&&sameCell(f.at,piece.at)))continue;
      let destination=index;
      for(let next=index+1;next<run.cells.length;next++){
        const at=run.cells[next]!;
        if(!canMovePiece(context.state,piece.id,at))break;
        // Actor-riders stay over their terrain; an ordinary tile may fall beneath them.
        destination=next;
        // Key delivery is an arrival along the fall, not a chance to skip over
        // its lock when several cells clear in the same combination.
        if(piece.kind==='cargo'&&piece.cargoKind==='key'&&context.state.fixtures.some(f=>f.kind==='lock'&&f.id===piece.destinationId&&f.keyId===piece.id&&sameCell(f.at,at)))break;
      }
      if(destination!==index)changed=movePiece(context,piece.id,run.cells[destination]!)||changed;
    }
  }
  return changed;
}
export function refillPieces(context:TurnContext):boolean {
  let changed=false;const {state}=context,rng=createRng(state.rngState);
  for(const run of gravitySegments(state))for(const at of [...run.cells].reverse()){
    if(pieceAt(state,at))continue;
    if(!run.refill){
      if(state.fixtures.some(f=>f.kind==='portal'&&f.segmentId===run.segmentId))continue;
      throw new CampaignContentError(`no refill source reaches ${at.r},${at.c}`);
    }
    const segment=state.geometry.gravitySegments.find(s=>s.id===run.segmentId)!;
    const switched=state.fixtures.some(f=>f.kind==='gravity-switch'&&f.chamberId===segment.chamberId);
    if(switched&&run.cells.slice(0,run.cells.findIndex(p=>sameCell(p,at))).some(p=>pieceAt(state,p)))continue;
    let tier:Tier=rng.next()<0.75?1:2;
    const piece:CampaignPiece={id:allocateId(state),kind:'tile',at:{...at},tier};state.pieces.push(piece);
    const clashes=()=>terrainMatches(state).some(m=>m.cells.some(p=>sameCell(p,at)));
    if(clashes())piece.tier=tier===1?2:1;
    if(clashes())piece.tier=3;
    if(switched){
      // Spawn at the live upstream edge, then travel through the cleared run.
      // Existing station/blocker splits retain the kernel's independently fed runs.
      const head=run.cells[0]!,source=state.geometry.refillSources.find(s=>s.segmentId===run.segmentId)!;
      const destination={...at};piece.at={...head};const group=context.events.length;
      emit(context,{type:'spawn',piece},group);
      emit(context,{type:'refill',pieceId:piece.id,sourceId:source.id,segmentId:segment.id,from:segment.direction==='down'?{r:head.r-1,c:head.c}:{r:head.r,c:head.c+1},to:head,direction:segment.direction},group);
      if(!sameCell(head,destination))movePiece(context,piece.id,destination);
    }else emit(context,{type:'spawn',piece});changed=true;
  }
  state.rngState=rng.state();return changed;
}

/** Only immediate effects. No actor/environment/arrival/need clocks run here. */
export function settle(context:TurnContext,modules:readonly MechanicModule[],movedCell:Pos|null=null):void {
  const limit=context.state.geometry.rows*context.state.geometry.cols*64;
  for(let pass=0;pass<limit;pass++){
    let changed=resolveTerrainMatches(context,movedCell,modules);movedCell=null;
    changed=fallPieces(context)||changed;
    // A transfer must stabilize with gravity before ordinary sources get to fill holes.
    let transferred=false;for(const module of modules)transferred=(module.beforeRefill?.(context)??false)||transferred;
    if(transferred)continue;
    changed=refillPieces(context)||changed;
    for(const module of modules)changed=(module.settle?.(context)??false)||changed;
    changed=resolveCrewSafety(context)||changed;
    if(!changed)return;
  }
  throw new CampaignContentError(`settle did not converge after ${limit} passes`);
}
