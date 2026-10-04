import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit} from '../engine/context';
import {activeCell,sameCell} from '../engine/geometry';
import {creditGoal} from '../engine/goals';
import {touches} from './wear';
export interface RelaysDef {id:'relays';fixtureIds:string[]}
export interface RelaysRuntime {id:'relays';nextNode:number}
export type Relay=Extract<CampaignFixture,{kind:'relay'}>;
export function validateRelays(level:CampaignLevel):ValidationIssue[]{
 const nodes=level.fixtures.filter((f):f is Relay=>f.kind==='relay').sort((a,b)=>a.order-b.order);if(!nodes.length)return [];
 const issues:ValidationIssue[]=[],add=(message:string)=>issues.push({code:'relay-chain',levelId:level.id,message});
 if(nodes.length>6||nodes.some((node,i)=>node.order!==i+1||node.active))add('Relay chain must start inactive with consecutive orders 1 through at most 6');
 if(new Set(nodes.map(n=>n.endpointId)).size!==1)add('Relay chain must share one station entrance');
 const endpoint=level.geometry.endpoints.find(e=>e.id===nodes[0]!.endpointId);
 if(endpoint?.kind!=='station'||endpoint.active||!activeCell(level.geometry,endpoint.at))add('Relay station entrance must start inactive on active terrain');
 if(level.fixtures.some(f=>f.kind==='solar'&&f.endpointId===endpoint?.id))add('Relay station entrance must have one owner');
 return issues;
}
export function relayStateError(state:CampaignState):string|null {
 const original=state.level.fixtures.filter((f):f is Relay=>f.kind==='relay');if(!original.length)return null;
 const runtime=state.mechanics.find(m=>m.id==='relays');if(!runtime)return 'missing relay chain';
 for(const source of original){const live=state.fixtures.find(f=>f.id===source.id);if(live?.kind!=='relay'||JSON.stringify({...live,active:false})!==JSON.stringify(source)||live.active!==(source.order<runtime.nextNode))return 'relay identity, ordered activation and next node disagree';
  for(const goal of state.level.goals.filter(g=>g.type==='restoreInfrastructure')){const ids=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;if(ids.includes(source.id)&&state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.includes(source.id)!==live.active)return 'relay goal disagrees with activation';}}
 const source=state.level.geometry.endpoints.find(e=>e.id===original[0]!.endpointId)!,live=state.geometry.endpoints.find(e=>e.id===source.id);
 if(!live||JSON.stringify({...live,active:source.active})!==JSON.stringify(source)||live.active!==(runtime.nextNode===original.length+1))return 'relay entrance differs from completed chain';
 return null;
}
export const relays:MechanicModule={id:'relays',validate:validateRelays,onMerge(context,event){
 if(context.processedMergeIds.has(`relays:${event.mergeId}`))return;context.processedMergeIds.add(`relays:${event.mergeId}`);
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='relays');if(!runtime)return;
 const nodes=state.fixtures.filter((f):f is Relay=>f.kind==='relay'),next=nodes.find(n=>n.order===runtime.nextNode);
 if(!next)return;
 if(!touches([next.at],event)){for(const node of nodes.filter(n=>!n.active&&touches([n.at],event)))emit(context,{type:'relay',relayId:node.id,order:node.order,phase:'waiting',mergeId:event.mergeId});return;}
 const group=context.events.length,before=structuredClone(next),ledger=structuredClone(runtime);next.active=true;runtime.nextNode++;
 emit(context,{type:'fixture',fixtureId:next.id,before,after:next},group);emit(context,{type:'mechanic',before:ledger,after:runtime},group);emit(context,{type:'relay',relayId:next.id,order:next.order,phase:'activated',mergeId:event.mergeId},group);
 for(const goal of state.level.goals)if(goal.type==='restoreInfrastructure')creditGoal(context,goal.id,next.id);
 if(runtime.nextNode===nodes.length+1){const geometry=structuredClone(state.geometry);state.geometry.endpoints.find(e=>e.id===next.endpointId)!.active=true;emit(context,{type:'geometry',before:geometry,after:state.geometry},group);}
}};
