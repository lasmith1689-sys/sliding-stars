import type {CampaignLevel,CampaignState,MechanicModule} from '../types';
import {emit,stableIds} from '../engine/context';
import {safeTerrain,setNeed} from '../engine/needs';
export interface ShelterDef {id:'shelter';crewIds:string[];allowance:20}
export interface ShelterRuntime {id:'shelter';startedCrewIds:string[]}
export function shelterStateError(state:CampaignState):string|null {
 const def=state.level.mechanics.find(m=>m.id==='shelter'),runtime=state.mechanics.find(m=>m.id==='shelter');
 if(!def||runtime?.id!=='shelter')return null;
 if(runtime.startedCrewIds.some(id=>!def.crewIds.includes(id)||!state.crew.some(c=>c.id===id)))return 'started request must belong to an admitted eligible guest';
 for(const crew of state.crew){
  if(!def.crewIds.includes(crew.id)){if(crew.shelterStarted||crew.shelterMoves!==null)return 'unlabeled crew cannot have a shelter request';continue;}
  if(crew.shelterStarted!==runtime.startedCrewIds.includes(crew.id))return 'shelter lifetime ledger differs from crew flag';
  if(crew.shelterMoves!==null&&crew.shelterMoves>20)return 'shelter counter exceeds its allowance';
  if(crew.status==='active'&&crew.shelterStarted&&crew.shelterMoves===null)return 'active started shelter request cannot be cleared before completion';
  if((crew.status==='housed'||crew.status==='evacuated')&&crew.shelterMoves!==null)return 'completed shelter request must be cleared';
 }
 return null;
}
export const shelter:MechanicModule={id:'shelter',validate(level:CampaignLevel){
 const def=level.mechanics.find(m=>m.id==='shelter');if(!def)return [];
 return level.crew.filter(c=>c.shelterStarted||c.shelterMoves!==null).map(c=>({code:'shelter-initial',levelId:level.id,entityId:c.id,message:'Shelter requests must begin unstarted; first safe arrival grants the allowance'}));
},settle(context){
 const def=context.state.level.mechanics.find(m=>m.id==='shelter'),runtime=context.state.mechanics.find(m=>m.id==='shelter');if(!def||runtime?.id!=='shelter')return false;
 let changed=false;
 for(const crew of stableIds(context.state.crew)){
  if(crew.status!=='active'||!def.crewIds.includes(crew.id)||crew.shelterStarted||runtime.startedCrewIds.includes(crew.id)||!safeTerrain(context.state,crew))continue;
  const before=structuredClone(crew),previous=structuredClone(runtime);crew.shelterStarted=true;runtime.startedCrewIds.push(crew.id);runtime.startedCrewIds.sort();
  setNeed(context,crew,'shelter',def.allowance);emit(context,{type:'crew',crewId:crew.id,before,after:crew});emit(context,{type:'mechanic',before:previous,after:runtime});
  emit(context,{type:'shelter',crewId:crew.id,phase:'started',allowance:20});changed=true;
 }
 return changed;
}};
