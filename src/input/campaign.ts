import type {Pos} from '../core/types';
import type {CampaignAction,CampaignState} from '../campaign/types';
import {legalActions} from '../campaign/engine/actions';
import {transition} from '../campaign/engine/turn';
const same=(a:Pos,b:Pos)=>a.r===b.r&&a.c===b.c;
export function directionHint(action:CampaignAction):{word:string;arrow:string} {
 const dr=action.type==='swap'?action.to.r-action.from.r:action.type==='translate'?action.dr:0,dc=action.type==='swap'?action.to.c-action.from.c:action.type==='translate'?action.dc:0;
 return dc>0?{word:'RIGHT',arrow:'→'}:dc<0?{word:'LEFT',arrow:'←'}:dr>0?{word:'DOWN',arrow:'↓'}:dr<0?{word:'UP',arrow:'↑'}:{word:'HERE',arrow:'◎'};
}
export function actionBetween(state:CampaignState,from:Pos,to:Pos):CampaignAction|null {
 const actor=state.actors.find(a=>a.kind==='tether'&&same(a.at,from));
 const candidate:CampaignAction=actor?{type:'translate',actorId:actor.id,dr:to.r-from.r,dc:to.c-from.c}:{type:'swap',from,to};
 const legal=legalActions(state).some(a=>a.type==='swap'&&candidate.type==='swap'&&same(a.from,from)&&same(a.to,to)||a.type==='translate'&&candidate.type==='translate'&&a.actorId===candidate.actorId&&a.dr===candidate.dr&&a.dc===candidate.dc);
 return legal?candidate:null;
}
/** One gesture owns one release; interruption invalidates it before any resize/recovery. */
export class CampaignInput {
 private from:Pos|null=null;private selected:Pos|null=null;
 constructor(private state:()=>CampaignState|undefined,private locked:()=>boolean,private dispatch:(action:CampaignAction)=>void){}
 start(at:Pos):void {if(!this.locked()&&this.state()?.status==='playing')this.from={...at};}
 cancel():void {this.from=null;this.selected=null;}
 preview(to:Pos):{action:CampaignAction;message:string;departureExitIds:string[]}|null {
  const state=this.state(),from=this.from??this.selected;if(!state||!from||this.locked())return null;
  const action=actionBetween(state,from,to);if(!action)return null;
  const result=transition(state,action);if(!result.accepted)return null;
  const departureExitIds=[...new Set(result.events.flatMap(e=>e.type==='remove'&&e.reason==='departure'&&e.piece.kind==='cargo'?[e.piece.destinationId]:[]))];
  const whaleHop=result.events.some(e=>e.type==='transfer'&&state.actors.some(a=>a.kind==='moonwhale'&&a.id===e.fromCarrierId));
  const whaleRequest=result.events.some(e=>e.type==='actor'&&e.after?.kind==='moonwhale'&&e.after.transferRequested&&e.before?.kind==='moonwhale'&&!e.before.transferRequested);
  const pupArrival=result.events.some(e=>e.type==='actor'&&e.before?.kind==='pup'&&e.after===null),pupStep=result.events.some(e=>e.type==='move'&&state.actors.some(a=>a.kind==='pup'&&a.id===e.entityId)),hasPup=state.actors.some(a=>a.kind==='pup');
  const droneEvents=result.events.filter(e=>e.type==='pirate'),droneCopy=droneEvents.some(e=>e.phase==='dock-reached')?'Drone reaches dock · mission lost':droneEvents.some(e=>e.phase==='returned')?'Return the parcel':droneEvents.some(e=>e.phase==='distracted')?'One distraction point cleared':droneEvents.some(e=>e.phase==='practice-paused')?'Practice drone pauses before dock':droneEvents.some(e=>e.phase==='waiting')?'Drone waits at blocked route':state.actors.some(a=>a.kind==='pirate')?'Drone advances one route stop':null;
  const bridgeCopy=result.events.some(e=>e.type==='bridge'&&e.phase==='opened')?'Unfold the marked bridge cells':result.events.some(e=>e.type==='bridge'&&e.phase==='charged')?'Light one bridge lamp':null;
  const solarCopy=result.events.some(e=>e.type==='solar'&&e.phase==='activated')?'Open the sunny rescue entrance':result.events.some(e=>e.type==='solar'&&e.phase==='charged')?'Add one collector charge':null;
  const portalCopy=result.events.some(e=>e.type==='portal'&&e.phase==='transferred')?'Portal crossing with riders':result.events.some(e=>e.type==='portal'&&e.phase==='waiting')?'Portal waits for clear OUT':null;
  const gravityEvents=result.events.filter(e=>e.type==='gravity'),gravityCopy=gravityEvents.length?`Gravity next: ${gravityEvents.map(e=>e.after.toUpperCase()).join(' then ')} · refill from ${gravityEvents.at(-1)!.after==='left'?'RIGHT':'TOP'}`:null;
  return {action,departureExitIds,message:`Slide ${directionHint(action).word} ${directionHint(action).arrow} · ${solarCopy??gravityCopy??bridgeCopy??droneCopy??portalCopy??(pupArrival?'Pup reaches nursery':pupStep?'One safe paw step':hasPup?'Pup waits for safe path':whaleHop?'Safe whale hop':whaleRequest?'Queue a whale hop':departureExitIds.length?'Evacuate safely':result.events.some(e=>e.type==='crew'&&e.after?.status==='housed')?'Bring crew home':result.events.some(e=>e.type==='merge')?'Merge terrain':'Move into position')}`};
 }
 end(to:Pos|null):void {
  const from=this.from;this.from=null;if(!from||!to||this.locked())return;
  const state=this.state();if(!state)return;
  if(same(from,to)){if(this.selected&&!same(this.selected,to)){const action=actionBetween(state,this.selected,to);this.selected=null;if(action)this.dispatch(action);}else this.selected={...to};return;}
  this.selected=null;const action=actionBetween(state,from,to);if(action)this.dispatch(action);
 }
}
