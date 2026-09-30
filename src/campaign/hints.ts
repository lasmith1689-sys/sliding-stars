import type {CampaignAction,CampaignState} from './types';
import {legalActions} from './engine/actions';
import {transition} from './engine/turn';
import {safeTerrain} from './engine/needs';

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
  const score=(completed(result.state)-before)*10000+(sheltered(result.state)-safeBefore)*100;
  if(score>bestScore){best=action;bestScore=score;}
 }
 return best;
}
