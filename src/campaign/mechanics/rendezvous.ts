import type {CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit} from '../engine/context';
import {activeCell,sameCell} from '../engine/geometry';
import {pieceAt} from '../engine/occupancy';
import {creditGoal} from '../engine/goals';
import {setNeed} from '../engine/needs';
export interface RendezvousDef {id:'rendezvous';endpointIds:[string,string];passengerIds:[string,string]}
export interface RendezvousRuntime {id:'rendezvous';departed:boolean}
export function validateRendezvous(level:CampaignLevel):ValidationIssue[]{const definition=level.mechanics.find(m=>m.id==='rendezvous');if(!definition)return [];
 const issues:ValidationIssue[]=[],add=(message:string)=>issues.push({code:'rendezvous-pair',levelId:level.id,message});
 for(const id of definition.endpointIds){const endpoint=level.geometry.endpoints.find(e=>e.id===id);if(endpoint?.kind!=='staging'||!endpoint.active||!activeCell(level.geometry,endpoint.at))add('Rendezvous requires two active staging pads');}
 for(const id of definition.passengerIds){const crew=level.crew.find(c=>c.id===id),pod=level.pieces.find(p=>p.id===crew?.carrierId);if(!crew||crew.status!=='active'||pod?.kind!=='pod'||pod.passengerIds.length!==1||pod.passengerIds[0]!==id)add('Rendezvous requires each exact passenger in its own occupied pod');}
 if(new Set(definition.passengerIds.map(id=>level.crew.find(c=>c.id===id)?.carrierId)).size!==2)add('Rendezvous passengers require separate pods');
 return issues;
}
export function rendezvousStateError(state:CampaignState):string|null{const definition=state.level.mechanics.find(m=>m.id==='rendezvous');if(!definition)return null;const runtime=state.mechanics.find(m=>m.id==='rendezvous');if(!runtime)return 'missing rendezvous departure ledger';
 for(const id of definition.endpointIds)if(JSON.stringify(state.geometry.endpoints.find(e=>e.id===id))!==JSON.stringify(state.level.geometry.endpoints.find(e=>e.id===id)))return 'rendezvous staging pad changed';
 for(const [i,id] of definition.passengerIds.entries()){const crew=state.crew.find(c=>c.id===id),source=state.level.crew.find(c=>c.id===id)!,pod=state.pieces.find(p=>p.id===source.carrierId),pad=state.geometry.endpoints.find(e=>e.id===definition.endpointIds[i])!;
  if(!crew)return 'rendezvous passenger is missing';
  if(runtime.departed?(crew.status!=='evacuated'||crew.carrierId!==null||pod!==undefined||!sameCell(crew.at,pad.at)):(crew.status!=='active'||crew.carrierId!==source.carrierId||pod?.kind!=='pod'||pod.passengerIds.length!==1||pod.passengerIds[0]!==id))return 'rendezvous paired passengers, pods and departure ledger disagree';
  for(const goal of state.level.goals.filter(g=>g.type==='simultaneousDepartures')){const ids=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;if(ids.includes(id)&&state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.includes(id)!==runtime.departed)return 'rendezvous goal disagrees with simultaneous departure';}
 }
 return null;
}
export const rendezvous:MechanicModule={id:'rendezvous',validate:validateRendezvous,finalize(context){
 const {state}=context,definition=state.level.mechanics.find(m=>m.id==='rendezvous'),runtime=state.mechanics.find(m=>m.id==='rendezvous');if(!definition||!runtime||runtime.departed)return;
 const pads=definition.endpointIds.map(id=>state.geometry.endpoints.find(e=>e.id===id)!),pods=pads.map(pad=>pieceAt(state,pad.at)),ready=pads.every((pad,i)=>{const pod=pods[i];return pad.active&&activeCell(state.geometry,pad.at)&&pod?.kind==='pod'&&pod.passengerIds.length===1&&pod.passengerIds[0]===definition.passengerIds[i]&&state.crew.some(c=>c.id===definition.passengerIds[i]&&c.status==='active'&&c.carrierId===pod.id&&sameCell(c.at,pad.at));});
 if(!ready){if(pods.some((pod,i)=>pod?.kind==='pod'&&pod.passengerIds.includes(definition.passengerIds[i]!)))emit(context,{type:'rendezvous',phase:'waiting',endpointIds:definition.endpointIds,passengerIds:definition.passengerIds});return;}
 const group=context.events.length;
 for(const [i,id] of definition.passengerIds.entries()){const crew=state.crew.find(c=>c.id===id)!,pod=pods[i]!;const before=structuredClone(crew);crew.status='evacuated';crew.carrierId=null;setNeed(context,crew,'rescue',null);setNeed(context,crew,'shelter',null);emit(context,{type:'transfer',crewId:id,fromCarrierId:pod.id,toCarrierId:null,from:pod.at,to:pads[i]!.at},group);emit(context,{type:'crew',crewId:id,before,after:crew},group);state.pieces=state.pieces.filter(p=>p.id!==pod.id);emit(context,{type:'remove',piece:pod,reason:'departure'},group);}
 const before=structuredClone(runtime);runtime.departed=true;emit(context,{type:'mechanic',before,after:runtime},group);emit(context,{type:'rendezvous',phase:'departed',endpointIds:definition.endpointIds,passengerIds:definition.passengerIds},group);
 for(const goal of state.level.goals)if(goal.type==='simultaneousDepartures')for(const id of definition.passengerIds)creditGoal(context,goal.id,id);
}};
