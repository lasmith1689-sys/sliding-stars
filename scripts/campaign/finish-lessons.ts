import {finishLessonSeeds,finishTeachingPlans} from '../../src/campaign/content/finish-seeds';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {legalActions} from '../../src/campaign/engine/actions';
import {hashState} from '../../src/campaign/engine/hash';
import {replayTrace} from '../../src/campaign/validator';
import type {CampaignAction,SolutionTrace} from '../../src/campaign/types';
export function proveFinishLessons():SolutionTrace[]{
 return finishLessonSeeds.map(level=>{
  let state=loadCampaignLevel(level),initialHash=hashState(state);const actions:CampaignAction[]=[];
  if(state.status!=='playing'||state.pieces.some(piece=>!level.pieces.some(p=>p.id===piece.id&&p.kind===piece.kind&&JSON.stringify(p.at)===JSON.stringify(piece.at))))throw Error(`Lesson ${level.id} changed at load`);
  for(const action of finishTeachingPlans[level.id]??[]){if(state.status==='won')break;const next=transition(state,action);if(!next.accepted)throw Error(`Lesson ${level.id} rejected ${JSON.stringify(action)}: ${next.rejection}`);actions.push(action);state=next.state;}
  // A repair bot needs subsequent real combinations to advance along its route.
  // Choose actual observed job/route progress; each selected action is replayed.
  while(state.status==='playing'&&level.mechanics.some(m=>m.id==='repair')&&actions.length<10){
   const next=legalActions(state).map(action=>({action,result:transition(state,action)})).filter(entry=>entry.result.accepted&&entry.result.state.status!=='lost').sort((a,b)=>{
    const score=(entry:typeof a)=>entry.result.state.status==='won'?10000:entry.result.events.reduce((n,event)=>n+(event.type==='repair'&&event.phase==='repaired'?100:event.type==='move'&&state.actors.some(actor=>actor.kind==='repair'&&actor.id===event.entityId)?10:0),0);
    return score(b)-score(a);
   })[0];
   if(!next)break;actions.push(next.action);state=next.result.state;
  }
  if(state.status!=='won')throw Error(`Lesson ${level.id} ends ${state.status}; ${JSON.stringify(actions)}`);
  const trace:SolutionTrace={levelId:level.id,campaignVersion:level.campaignVersion,rulesVersion:level.rulesVersion,initialHash,actions,finalHash:hashState(state)};
  const proof=replayTrace(level,trace);if(!proof.won)throw Error(`Lesson ${level.id} proof failed: ${JSON.stringify(proof.issues)}`);return trace;
 });
}
