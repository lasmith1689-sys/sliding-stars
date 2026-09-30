import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,gravitySegments,sameCell,validateGravityCoverage} from '../engine/geometry';
import {actorAt,crewAt,pieceAt} from '../engine/occupancy';

export interface PhaseDef {id:'phase';fixtureIds:string[]}
export interface PhaseRuntime {id:'phase';waitingDoorIds:string[]}
export type PhaseDoor=Extract<CampaignFixture,{kind:'phase-door'}>;

/** A plain tile supports the passage. Only a rider or a special entity uses it. */
export function phasePassageOccupied(state:Pick<CampaignState,'pieces'|'crew'|'actors'>,door:PhaseDoor):boolean {
 const piece=pieceAt(state,door.at);
 return (piece!==undefined&&piece.kind!=='tile')||crewAt(state,door.at).length>0||actorAt(state,door.at)!==undefined;
}

function unsafeRuns(state:Pick<CampaignState,'geometry'|'fixtures'|'pieces'>):boolean {
 try{validateGravityCoverage(state);}
 catch{return true;}
 return gravitySegments(state).some(run=>!run.refill&&!state.fixtures.some(f=>f.kind==='portal'&&f.segmentId===run.segmentId));
}

export function validatePhase(level:CampaignLevel):ValidationIssue[] {
 const issues:ValidationIssue[]=[],add=(id:string,message:string)=>issues.push({code:'phase-topology',levelId:level.id,entityId:id,message});
 const doors=level.fixtures.filter((f):f is PhaseDoor=>f.kind==='phase-door');
 const definition=level.mechanics.find(m=>m.id==='phase');
 if(!definition)return [];
 if(!doors.length||doors.length!==definition.fixtureIds.length)add('phase','Every declared phase door needs one fixed doorway');
 for(const door of doors){
  if(!activeCell(level.geometry,door.at))add(door.id,'Door requires an active terrain cell');
  if(door.closingPending)add(door.id,'Initial door cannot already be pending');
  if(!door.open&&phasePassageOccupied(level,door))add(door.id,'An initially closed passage cannot contain traffic');
 }
 // Keys already require independently fed partial footprints. A phase blocker
 // preserves source ownership, so check the two door states at the authored,
 // each single-gate, and fully open gate boundaries without exponential subsets.
 const gates=level.fixtures.filter(f=>f.kind==='gate');
 for(const opened of [[],...gates.map(g=>[g]),gates]){
  const geometry=structuredClone(level.geometry);
  for(const gate of opened)geometry.inactiveCells=geometry.inactiveCells.filter(p=>!gate.cells.some(q=>sameCell(p,q)));
  for(const closed of [false,true]){
   const fixtures=level.fixtures.map(f=>f.kind==='phase-door'?{...f,open:!closed,closingPending:false}:f);
   if(unsafeRuns({geometry,fixtures,pieces:level.pieces})){
    add(doors[0]?.id??'phase',`Door/gate partial state ${opened.map(g=>g.id).join(',')||'initial'} with doors ${closed?'closed':'open'} leaves terrain without a refill route`);
   }
  }
 }
 return issues;
}

export function phaseStateError(state:CampaignState):string|null {
 const original=state.level.fixtures.filter((f):f is PhaseDoor=>f.kind==='phase-door');
 if(!original.length)return null;
 const runtime=state.mechanics.find(m=>m.id==='phase');
 if(!runtime)return 'missing phase runtime';
 const waiting:string[]=[];
 for(const authored of original){
  const live=state.fixtures.find(f=>f.id===authored.id);
  if(live?.kind!=='phase-door'||!sameCell(live.at,authored.at))return 'authored doorway identity or position changed';
  if(live.closingPending&&!live.open)return 'pending closure cannot be blocked';
  if(!live.open&&phasePassageOccupied(state,live))return 'closed passage contains traffic';
  if(live.closingPending)waiting.push(live.id);
 }
 if(JSON.stringify(runtime.waitingDoorIds)!==JSON.stringify(waiting.sort()))return 'pending closure ledger differs from doors';
 if(unsafeRuns(state))return 'doorway changed refill coverage';
 return null;
}

export const phase:MechanicModule={id:'phase',validate:validatePhase,finalize(context){
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='phase');if(!runtime)return;
 for(const door of stableIds(state.fixtures.filter((f):f is PhaseDoor=>f.kind==='phase-door'))){
  const before=structuredClone(door),ledger=structuredClone(runtime);
  let cue:'opened'|'closed'|'pending'|null=null;
  if(!door.open){door.open=true;door.closingPending=false;cue='opened';}
  else if(phasePassageOccupied(state,door)){
   if(!door.closingPending){door.closingPending=true;cue='pending';}
  }else {door.open=false;door.closingPending=false;cue='closed';}
  if(!cue)continue;
  const group=context.events.length;
  emit(context,{type:'fixture',fixtureId:door.id,before,after:door},group);
  runtime.waitingDoorIds=stableIds(state.fixtures.filter((f):f is PhaseDoor=>f.kind==='phase-door'&&f.closingPending)).map(f=>f.id);
  if(JSON.stringify(ledger)!==JSON.stringify(runtime))emit(context,{type:'mechanic',before:ledger,after:runtime},group);
  emit(context,{type:'phase',doorId:door.id,at:door.at,phase:cue,open:door.open,closingPending:door.closingPending},group);
 }
}};
