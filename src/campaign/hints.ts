import type {CampaignAction,CampaignState,CampaignEvent} from './types';
import {legalActions} from './engine/actions';
import {transition} from './engine/turn';
import {safeTerrain} from './engine/needs';
import {doorCell} from '../core/dome';
import {activeCell} from './engine/geometry';
import {blocksTerrain} from './engine/occupancy';

/** A tie-breaker for positioning moves, not a proof of reachability. */
function rescueDistance(state:CampaignState):number {
 const doors=state.pieces.flatMap(p=>p.kind==='station'?[doorCell(p.at.r,p.at.c,p.facing)]:[]).filter(at=>activeCell(state.geometry,at));
 if(!doors.length)return 0;
 return state.crew.filter(c=>c.status==='active'&&!state.actors.some(a=>a.id===c.carrierId)&&!state.pieces.some(p=>p.kind==='cargo'&&p.id===c.carrierId))
  .reduce((sum,c)=>sum+Math.min(...doors.map(at=>Math.abs(at.r-c.at.r)+Math.abs(at.c-c.at.c))),0);
}

/** Count irreversible steps toward a mechanism, never animation or raw points. */
export function mechanismProgress(events:readonly CampaignEvent[]):number {
 return events.reduce((sum,event)=>{
  if(event.type==='fixture'&&event.before&&'hp'in event.before){
   const after=event.after&&'hp'in event.after?event.after.hp:0;
   return sum+Math.max(0,event.before.hp-after);
  }
  if(event.type==='bridge'&&event.phase==='charged'||event.type==='bridge'&&event.phase==='opened'||
     event.type==='garden'&&event.phase==='grown'||event.type==='garden'&&event.phase==='harvested'||
     event.type==='solar'||event.type==='key'&&event.phase==='opened'||
     event.type==='pirate'&&event.phase==='distracted'||event.type==='jelly'&&event.phase==='cleared'||
     event.type==='magnet'&&event.phase!=='waiting'||event.type==='relay'&&event.phase==='activated'||
     event.type==='tether'&&event.phase==='released'||event.type==='repair'&&event.phase!=='waiting'||
     event.type==='rendezvous'&&event.phase==='departed')return sum+1;
  return sum;
 },0);
}

/** A bounded, one-turn suggestion, not a solver. Never mutate the live board.
 * Prefer actual rescue progress over the first matching pair or raw points. */
export function hintPositionKey(state:CampaignState):string {
 return JSON.stringify({pieces:state.pieces,crew:state.crew.map(c=>({id:c.id,at:c.at,status:c.status,carrierId:c.carrierId})),actors:state.actors,fixtures:state.fixtures,goals:state.goalProgress,geometry:state.geometry});
}
function pairedDistance(state:CampaignState):number {
 let distance=0;
 for(const actor of state.actors.filter(a=>a.kind==='tether')){
  const targets=state.pieces.filter(p=>p.kind==='tile'&&p.tier>=4).filter(p=>state.pieces.some(q=>q.kind==='tile'&&q.tier>=4&&q.at.r===p.at.r+actor.offset.r&&q.at.c===p.at.c+actor.offset.c));
  if(targets.length)distance+=Math.min(...targets.map(p=>Math.abs(p.at.r-actor.at.r)+Math.abs(p.at.c-actor.at.c)));
 }
 const rendezvous=state.level.mechanics.find(m=>m.id==='rendezvous');
 if(rendezvous)for(const [i,id] of rendezvous.passengerIds.entries()){const crew=state.crew.find(c=>c.id===id),pad=state.geometry.endpoints.find(e=>e.id===rendezvous.endpointIds[i]);if(crew?.status==='active'&&pad)distance+=Math.abs(crew.at.r-pad.at.r)+Math.abs(crew.at.c-pad.at.c);}
 return distance;
}
/** Shared ordering for a direct hint and bounded detour search; never proves reachability. */
export function campaignHintScore(before:CampaignState,after:CampaignState,events:readonly CampaignEvent[]):number {
 if(after.status==='won')return 1e9;if(after.status==='lost')return -Infinity;
 const completed=(state:CampaignState)=>state.goalProgress.reduce((n,g)=>n+g.completedIds.length,0);
 const sheltered=(state:CampaignState)=>state.crew.filter(c=>c.status==='active'&&safeTerrain(state,c)).length;
 const repairedSteps=events.filter(event=>event.type==='move'&&before.actors.some(actor=>actor.kind==='repair'&&actor.id===event.entityId)).length;
 // A blocked creature needs terrain formation before a station can help.
 // Prefer those preparatory matches only while a creature remains trapped.
 const trapped=before.crew.some(crew=>crew.status==='active'&&crew.carrierId===null&&blocksTerrain(before,crew.at));
 const preparation=trapped?Math.min(4,events.filter(event=>event.type==='merge').length)*0.02:0;
 return (completed(after)-completed(before))*10000+(sheltered(after)-sheltered(before))*100+mechanismProgress(events)*10+repairedSteps*2+(pairedDistance(before)-pairedDistance(after))*2+preparation+
  Math.max(-1,Math.min(1,(rescueDistance(before)-rescueDistance(after))/100));
}
export function campaignHint(state:CampaignState,visited:ReadonlySet<string>=new Set()):CampaignAction|null {
 let best:CampaignAction|null=null,bestScore=-Infinity;
 for(const action of legalActions(state).slice(0,96)){
  const result=transition(state,action);
  if(!result.accepted||result.state.status==='lost')continue;
  if(result.state.status==='won')return action;
  if(visited.has(hintPositionKey(result.state)))continue;
  const score=campaignHintScore(state,result.state,result.events);
  if(score>bestScore){best=action;bestScore=score;}
 }
 return best;
}
