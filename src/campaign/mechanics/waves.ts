import type {CampaignArrival,CampaignLevel,CampaignState,CampaignFixture,MechanicModule,ValidationIssue} from '../types';
import type {Pos} from '../../core/types';
import {emit} from '../engine/context';
import {activeCell,sameCell} from '../engine/geometry';
import {actorAt,crewAt,pieceAt} from '../engine/occupancy';
export interface WavesDef {id:'waves';arrivalIds:string[]}
export interface WavesRuntime {id:'waves';admittedIds:string[]}
/** The HUD and engine share exactly one queue order; never sort authored arrays in place. */
export function pendingWaves(arrivals:readonly CampaignArrival[]):CampaignArrival[]{
 return arrivals.filter(a=>a.status==='pending').sort((a,b)=>a.turn-b.turn||(a.id<b.id?-1:a.id>b.id?1:0));
}
/** Wave entries require the entire fixture layer to be clear, even passable trigger cells. */
function fixtureFootprint(f:CampaignFixture):Pos[]{
 const remote='cells'in f?f.cells:f.kind==='portal'?[f.receiver]:f.kind==='jelly'?f.coatedCells:[];
 return [f.at,...remote];
}
export function waveBlocked(state:Pick<CampaignState,'geometry'|'crew'|'actors'|'fixtures'|'pieces'>,wave:CampaignArrival,cap=6):boolean {
 const at=wave.entry,piece=pieceAt(state,at);
 return !activeCell(state.geometry,at)||crewAt(state,at).length>0||!!actorAt(state,at)||
  state.fixtures.some(f=>fixtureFootprint(f).some(p=>sameCell(p,at)))||!!piece&&piece.kind!=='tile'||
  state.crew.filter(c=>c.status==='active').length+wave.crew.length>cap;
}
export function validateWaves(level:CampaignLevel):ValidationIssue[]{
 const cap=level.metadata.capOverride?.activeCrew??6;
 return level.arrivals.flatMap(wave=>wave.crew.length>cap||wave.crew.some(c=>c.status!=='active'||c.carrierId!==null||!sameCell(c.at,wave.entry)||c.shelterStarted||c.shelterMoves!==null)?[{code:'wave-crew',levelId:level.id,entityId:wave.id,message:'Wave crew must be active, unattached, at their entry, without a started shelter request, and fit the active cap'}]:[]);
}
export const waves:MechanicModule={id:'waves',validate:validateWaves,admit(context){
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='waves');if(!runtime)return;
 for(const wave of pendingWaves(state.arrivals)){
  if(wave.turn>state.turn||waveBlocked(state,wave,state.level.metadata.capOverride?.activeCrew??6))break;
  const group=context.events.length;
  for(const source of wave.crew){
   const crew={...structuredClone(source),at:{...wave.entry},rescueMoves:state.level.needMoves,shelterMoves:null,shelterStarted:false};
   state.crew.push(crew);emit(context,{type:'crew',crewId:crew.id,before:null,after:crew},group);
  }
  wave.status='admitted';emit(context,{type:'arrival',arrivalId:wave.id,before:'pending',after:'admitted',crewIds:wave.crew.map(c=>c.id)},group);
  const before=structuredClone(runtime);runtime.admittedIds.push(wave.id);runtime.admittedIds.sort();emit(context,{type:'mechanic',before,after:runtime},group);
 }
}};
