import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,sameCell} from '../engine/geometry';
import {actorAt,blocksTerrain,crewAt,pieceAt} from '../engine/occupancy';
export interface GardensDef {id:'gardens';fixtureIds:string[]}
export interface GardensRuntime {id:'gardens';harvestedIds:string[]}
export type Garden=Extract<CampaignFixture,{kind:'garden'}>;
export function validateGardens(level:CampaignLevel):ValidationIssue[]{
 const issues:ValidationIssue[]=[],exits=level.mechanics.find(m=>m.id==='exits');
 for(const plot of level.fixtures.filter(f=>f.kind==='garden')){
  const add=(message:string)=>issues.push({code:'garden-output',levelId:level.id,entityId:plot.id,message});
  if(plot.stage!==0)add('Garden must start at growth zero');
  if(!activeCell(level.geometry,plot.outputAt))add('Harvest output must be an active authored cell');
  if(!exits?.endpointIds.includes(plot.exitId))add('Garden requires a declared evacuation exit');
 }
 return issues;
}
export function gardenStateError(state:CampaignState):string|null{
 const runtime=state.mechanics.find(m=>m.id==='gardens');
 for(const original of state.level.fixtures.filter(f=>f.kind==='garden')){
  const plot=state.fixtures.find(f=>f.id===original.id);
  if(plot?.kind!=='garden'||!sameCell(plot.at,original.at)||!sameCell(plot.outputAt,original.outputAt)||plot.harvestId!==original.harvestId||plot.exitId!==original.exitId)return 'authored garden identity or output changed';
  const yielded=runtime?.id==='gardens'&&runtime.harvestedIds.includes(plot.harvestId),piece=state.pieces.find(p=>p.id===plot.harvestId),departed=state.mechanics.find(m=>m.id==='exits')?.departedIds.includes(plot.harvestId)??false;
  if(yielded&&plot.stage!==3||yielded!==!!(piece||departed)||piece&&departed)return 'maturity, harvest presence and departure ledger disagree';
 }
 return null;
}
export const gardens:MechanicModule={id:'gardens',validate:validateGardens,onMerge(context,event){
 for(const plot of stableIds(context.state.fixtures.filter(f=>f.kind==='garden'))){
  if(plot.stage===3||!event.cells.some(p=>sameCell(p,plot.at))||context.events.some(e=>e.type==='garden'&&e.gardenId===plot.id&&e.mergeId===event.mergeId))continue;
  const before=structuredClone(plot);plot.stage++;
  emit(context,{type:'fixture',fixtureId:plot.id,before,after:plot});
  emit(context,{type:'garden',gardenId:plot.id,mergeId:event.mergeId,phase:'grown',stage:plot.stage,outputAt:plot.outputAt,harvestId:plot.harvestId});
 }
},beforeRefill(context){
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='gardens');if(!runtime)return false;let changed=false;
 for(const plot of stableIds(state.fixtures.filter(f=>f.kind==='garden'))){
  if(plot.stage!==3||runtime.harvestedIds.includes(plot.harvestId))continue;
  const blocked=!activeCell(state.geometry,plot.outputAt)||pieceAt(state,plot.outputAt)||blocksTerrain(state,plot.outputAt)||actorAt(state,plot.outputAt)||crewAt(state,plot.outputAt).length;
  if(blocked){if(!context.events.some(e=>e.type==='garden'&&e.gardenId===plot.id&&e.phase==='waiting'))emit(context,{type:'garden',gardenId:plot.id,mergeId:null,phase:'waiting',stage:3,outputAt:plot.outputAt,harvestId:plot.harvestId});continue;}
  const piece={id:plot.harvestId,kind:'cargo' as const,cargoKind:'harvest' as const,at:{...plot.outputAt},destinationId:plot.exitId,passengerIds:[]};state.pieces.push(piece);emit(context,{type:'spawn',piece});
  const before=structuredClone(runtime);runtime.harvestedIds.push(plot.harvestId);runtime.harvestedIds.sort();emit(context,{type:'mechanic',before,after:runtime});
  emit(context,{type:'garden',gardenId:plot.id,mergeId:null,phase:'harvested',stage:3,outputAt:plot.outputAt,harvestId:plot.harvestId});changed=true;
 }
 return changed;
}};
