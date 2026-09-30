import {readFileSync} from 'node:fs';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignLevel} from '../../../src/campaign/schema';
import type {CampaignState} from '../../../src/campaign/types';

/** Exact connected turn-13 prior-rule forecast reconstructed from the saved prefix. */
export function priorJellyWarningState():CampaignState {
 const saved=JSON.parse(readFileSync(new URL('../../../validation/campaign/receipts/jelly/fix1-reauthored-711-adverse-state.json',import.meta.url),'utf8'));
 let state=loadCampaignLevel(parseCampaignLevel(saved.level));
 for(const action of saved.prefixActions.slice(0,13)){
  const next=transition(state,action);
  if(!next.accepted)throw Error(`Historical prefix action rejected at turn ${state.turn+1}`);
  state=next.state;
 }
 const jelly=state.fixtures.find(f=>f.kind==='jelly');
 if(!jelly)throw Error('Historical prefix lost its jelly');
 jelly.preview={r:1,c:0};
 return state;
}
