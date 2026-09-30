import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,sameCell} from '../engine/geometry';
import {creditGoal} from '../engine/goals';
import {touches} from './wear';

export interface SolarDef {id:'solar';fixtureIds:string[]}
export interface SolarRuntime {id:'solar';activatedIds:string[]}
export type SolarCollector=Extract<CampaignFixture,{kind:'solar'}>;

export function validateSolar(level:CampaignLevel):ValidationIssue[]{
 const issues:ValidationIssue[]=[];
 for(const collector of level.fixtures.filter((f):f is SolarCollector=>f.kind==='solar')){
  const endpoint=level.geometry.endpoints.find(e=>e.id===collector.endpointId);
  const add=(message:string)=>issues.push({code:'solar-endpoint',levelId:level.id,entityId:collector.id,message});
  if(collector.charge!==0)add('Collector must start uncharged');
  if(!endpoint||endpoint.kind!=='station'||endpoint.active||!activeCell(level.geometry,endpoint.at))add('Collector must own an inactive station endpoint on active terrain');
  if(level.fixtures.some(f=>f.id!==collector.id&&f.kind==='solar'&&f.endpointId===collector.endpointId))add('Collector endpoints must have one owner');
  if(endpoint&&Math.abs(endpoint.at.r-collector.at.r)+Math.abs(endpoint.at.c-collector.at.c)>1)add('Collector entrance must be at or beside the collector');
 }
 return issues;
}

export function solarStateError(state:CampaignState):string|null {
 const runtime=state.mechanics.find(m=>m.id==='solar');
 const authored=state.level.fixtures.filter((f):f is SolarCollector=>f.kind==='solar');
 if(!authored.length)return null;
 if(runtime?.id!=='solar')return 'missing activation ledger';
 for(const source of authored){
  const live=state.fixtures.find(f=>f.id===source.id),endpoint=state.geometry.endpoints.find(e=>e.id===source.endpointId);
  if(live?.kind!=='solar'||!sameCell(live.at,source.at)||live.tier!==source.tier||live.quota!==source.quota||live.endpointId!==source.endpointId)return 'authored collector identity changed';
  const active=live.charge===live.quota;
  if(endpoint?.kind!=='station'||!sameCell(endpoint.at,state.level.geometry.endpoints.find(e=>e.id===source.endpointId)!.at)||endpoint.active!==active||runtime.activatedIds.includes(source.id)!==active)return 'charge, endpoint and activation ledger disagree';
  for(const goal of state.level.goals.filter(g=>g.type==='restoreInfrastructure')){
   const ids=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;
   if(ids.includes(source.id)&&state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.includes(source.id)!==active)return 'restoration credit disagrees with collector';
  }
 }
 return null;
}

export const solar:MechanicModule={id:'solar',validate:validateSolar,onMerge(context,event){
 if(context.processedMergeIds.has(`solar:${event.mergeId}`))return;
 context.processedMergeIds.add(`solar:${event.mergeId}`);
 const {state}=context;
 for(const collector of stableIds(state.fixtures.filter((f):f is SolarCollector=>f.kind==='solar'))){
  if(collector.charge>=collector.quota||event.before!==collector.tier||!touches([collector.at],event))continue;
  const group=context.events.length,before=structuredClone(collector);
  collector.charge++;
  emit(context,{type:'fixture',fixtureId:collector.id,before,after:collector},group);
  const active=collector.charge===collector.quota;
  emit(context,{type:'solar',collectorId:collector.id,mergeId:event.mergeId,phase:active?'activated':'charged',charge:collector.charge,quota:collector.quota},group);
  if(!active)continue;
  const geometry=structuredClone(state.geometry),endpoint=state.geometry.endpoints.find(e=>e.id===collector.endpointId)!;
  endpoint.active=true;emit(context,{type:'geometry',before:geometry,after:state.geometry},group);
  const runtime=state.mechanics.find(m=>m.id==='solar')!;const previous=structuredClone(runtime);
  runtime.activatedIds.push(collector.id);runtime.activatedIds.sort();emit(context,{type:'mechanic',before:previous,after:runtime},group);
  for(const goal of state.level.goals)if(goal.type==='restoreInfrastructure')creditGoal(context,goal.id,collector.id);
 }
}};
