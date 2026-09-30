/** Offline projection of verified winning routes into minimal player advice.
 * The runtime loads the generated maps, never this authoring module or proofs. */
import {loadCampaignLevel} from './engine/load';
import {transition} from './engine/turn';
import {hashState} from './engine/hash';
import type {CampaignAction,CampaignLevel,SolutionTrace} from './types';

export function buildHintRoutes(levels:readonly CampaignLevel[],proofs:readonly SolutionTrace[]):Record<string,CampaignAction>[] {
 const chapters=Array.from({length:20},()=>({} as Record<string,CampaignAction>));
 const byId=new Map(proofs.map(proof=>[proof.levelId,proof]));
 if(byId.size!==proofs.length)throw Error('Duplicate route proof');
 for(const level of levels){
  const proof=byId.get(level.id);if(!proof||proof.campaignVersion!==level.campaignVersion||proof.rulesVersion!==level.rulesVersion)throw Error(`Missing or incompatible route for mission ${level.id}`);
  let state=loadCampaignLevel(level);
  if(hashState(state)!==proof.initialHash)throw Error(`Initial route state mismatch for mission ${level.id}`);
  const chapter=chapters[level.chapter-1]!;
  for(const action of proof.actions){
   if(action.type==='booster'||state.status!=='playing')throw Error(`Invalid route action for mission ${level.id}`);
   const key=hashState(state),prior=chapter[key];
   if(prior&&JSON.stringify(prior)!==JSON.stringify(action))throw Error(`Conflicting route advice for state ${key}`);
   const next=transition(state,action);if(!next.accepted)throw Error(`Rejected route action for mission ${level.id}`);
   chapter[key]=structuredClone(action);state=next.state;
  }
  if(state.status!=='won'||hashState(state)!==proof.finalHash)throw Error(`Unverified route finish for mission ${level.id}`);
 }
 return chapters;
}
