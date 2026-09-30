import type {CampaignAction,CampaignState,CampaignEvent} from './types';
import {legalActions} from './engine/actions';
import {transition} from './engine/turn';
import {safeTerrain} from './engine/needs';

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
export function campaignHint(state:CampaignState):CampaignAction|null {
 let best:CampaignAction|null=null,bestScore=-Infinity;
 const completed=(s:CampaignState)=>s.goalProgress.reduce((n,g)=>n+g.completedIds.length,0);
 const sheltered=(s:CampaignState)=>s.crew.filter(c=>c.status==='active'&&safeTerrain(s,c)).length;
 const before=completed(state),safeBefore=sheltered(state);
 for(const action of legalActions(state).slice(0,96)){
  const result=transition(state,action);
  if(!result.accepted||result.state.status==='lost')continue;
  if(result.state.status==='won')return action;
  const score=(completed(result.state)-before)*10000+(sheltered(result.state)-safeBefore)*100+mechanismProgress(result.events)*10;
  if(score>bestScore){best=action;bestScore=score;}
 }
 return best;
}
