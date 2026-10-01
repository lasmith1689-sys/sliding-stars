import {campaignHint,hintPositionKey} from '../../src/campaign/hints';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {legalActions} from '../../src/campaign/engine/actions';
import {transition} from '../../src/campaign/engine/turn';
import {hashState} from '../../src/campaign/engine/hash';
import {replayTrace} from '../../src/campaign/validator';
import type {CampaignAction,CampaignLevel,CampaignState,SolutionTrace} from '../../src/campaign/types';

export const QC_SAMPLE_IDS=[1,4,9,16,31,50,56,81,100,111,146,175,186,225,231,275,276,325,326,375,425,426,471,500,516,550,561,600,611,650,661,700,711,750,756,801,825,850,900,950,1000];
const completed=(state:CampaignState)=>state.goalProgress.reduce((sum,goal)=>sum+goal.completedIds.length,0);
// Exclude clocks/RNG so a tile moved back and forth is recognizable despite time passing.
const layout=(state:CampaignState)=>JSON.stringify({
 pieces:state.pieces.map(p=>({at:p.at,kind:p.kind,tier:p.kind==='tile'?p.tier:null,facing:p.kind==='station'?p.facing:null})).sort((a,b)=>a.at.r-b.at.r||a.at.c-b.at.c),
 crew:state.crew.map(c=>({at:c.at,status:c.status,carrier:c.carrierId})),
 actors:state.actors,fixtures:state.fixtures,goals:state.goalProgress,
});
export function auditHintPlay(level:CampaignLevel,proof:SolutionTrace,maxMoves=12,routes:Readonly<Record<string,CampaignAction>>={}){
 const before=replayTrace(level,proof),definitionBefore=JSON.stringify(level);
 let state=loadCampaignLevel(level),hintNull=false,illegal=false,mutatedState=false,repeatLayouts=0;
 const adviceVisited=new Set([hintPositionKey(state)]);
 const initialLegalActions=legalActions(state).length,seen=new Set([layout(state)]),steps=[];
 for(let move=0;move<maxMoves&&state.status==='playing';move++){
  const start=performance.now(),hash=hashState(state),route=routes[hash];
  const verifiedRoute=route&&transition(state,route).accepted?route:null;
  const hint=verifiedRoute??campaignHint(state,adviceVisited),hintMs=performance.now()-start;
  mutatedState ||= hash!==hashState(state);
  if(!hint){
   hintNull=true;const actions=legalActions(state),nonLosing=actions.filter(action=>{const next=transition(state,action);return next.accepted&&next.state.status!=='lost';}).length;
   steps.push({turn:state.turn,hintMs,action:null,legalActions:actions.length,nonLosingActions:nonLosing});break;
  }
  const next=transition(state,hint);
  steps.push({turn:state.turn,hintMs,action:hint,source:verifiedRoute?'verified-route':'heuristic',accepted:next.accepted,status:next.state.status,goalsAdded:completed(next.state)-completed(state)});
  if(!next.accepted){illegal=true;break;}
  state=next.state;adviceVisited.add(hintPositionKey(state));const key=layout(state);if(seen.has(key))repeatLayouts++;seen.add(key);
 }
 const after=replayTrace(level,proof);
 return {id:level.id,mechanics:level.mechanics.map(m=>m.id),proofMoves:proof.actions.length,
  proofBefore:before,proofAfter:after,definitionUnchanged:definitionBefore===JSON.stringify(level),initialLegalActions,
  outcome:state.status==='playing'?'still-playing':state.status,moves:steps.filter(step=>step.action!==null).length,
  hintNull,illegal,mutatedState,repeatLayouts,completedGoals:completed(state),
  initialHintMs:steps[0]?.hintMs??null,maxHintMs:Math.max(0,...steps.map(step=>step.hintMs)),steps};
}
