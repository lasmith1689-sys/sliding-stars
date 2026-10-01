import type {CampaignAction,CampaignState,CampaignEvent} from './types';
import {legalActions} from './engine/actions';
import {transition} from './engine/turn';
import {safeTerrain} from './engine/needs';
import {doorCell} from '../core/dome';
import {activeCell} from './engine/geometry';

/** A tie-breaker for positioning moves, not a proof of reachability. */
function rescueDistance(state:CampaignState):number {
 const doors=state.pieces.flatMap(p=>p.kind==='station'?[doorCell(p.at.r,p.at.c,p.facing)]:[]).filter(at=>activeCell(state.geometry,at));
 if(!doors.length)return 0;
 return state.crew.filter(c=>c.status==='active'&&!state.actors.some(a=>a.id===c.carrierId)&&!state.pieces.some(p=>p.kind==='cargo'&&p.id===c.carrierId))
  .reduce((sum,c)=>sum+Math.min(...doors.map(at=>Math.abs(at.r-c.at.r)+Math.abs(at.c-c.at.c))),0);
}

/** Count irreversible steps toward a mechanism, never animation or raw points. */
function mechanismProgress(events:readonly CampaignEvent[]):number {
 return events.reduce((sum,event)=>{
  if(event.type==='fixture'&&event.before&&'hp'in event.before){
   const after=event.after&&'hp'in event.after?event.after.hp:0;
   return sum+Math.max(0,event.before.hp-after);
  }
  if(event.type==='bridge'&&event.phase==='charged'||event.type==='bridge'&&event.phase==='opened'||
     event.type==='garden'&&event.phase==='grown'||event.type==='garden'&&event.phase==='harvested'||
     event.type==='solar'||event.type==='key'&&event.phase==='opened'||
     event.type==='pirate'&&event.phase==='distracted'||event.type==='jelly'&&event.phase==='cleared')return sum+1;
  return sum;
 },0);
}

/** A bounded, one-turn suggestion, not a solver. Never mutate the live board.
 * Prefer actual rescue progress over the first matching pair or raw points. */
export function hintPositionKey(state:CampaignState):string {
 return JSON.stringify({pieces:state.pieces,crew:state.crew.map(c=>({id:c.id,at:c.at,status:c.status,carrierId:c.carrierId})),actors:state.actors,fixtures:state.fixtures,goals:state.goalProgress,geometry:state.geometry});
}
export function campaignHint(state:CampaignState,visited:ReadonlySet<string>=new Set()):CampaignAction|null {
 let best:CampaignAction|null=null,bestScore=-Infinity;
 const completed=(s:CampaignState)=>s.goalProgress.reduce((n,g)=>n+g.completedIds.length,0);
 const sheltered=(s:CampaignState)=>s.crew.filter(c=>c.status==='active'&&safeTerrain(s,c)).length;
 const before=completed(state),safeBefore=sheltered(state),distanceBefore=rescueDistance(state);
 for(const action of legalActions(state).slice(0,96)){
  const result=transition(state,action);
  if(!result.accepted||result.state.status==='lost')continue;
  if(result.state.status==='won')return action;
  if(visited.has(hintPositionKey(result.state)))continue;
  const score=(completed(result.state)-before)*10000+(sheltered(result.state)-safeBefore)*100+mechanismProgress(result.events)*10+
   Math.max(-1,Math.min(1,(distanceBefore-rescueDistance(result.state))/100));
  if(score>bestScore){best=action;bestScore=score;}
 }
 return best;
}
