import {expect,it} from 'vitest';
import proofs from '../../validation/campaign/generated/proofs.json';
import {getCampaignLevel} from '../../src/campaign/catalog';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import type {CampaignAction} from '../../src/campaign/types';
import {CAMPAIGN_VIP_MISSIONS,campaignVip} from '../../src/meta/campaignVips';
import {STATIONS} from '../../src/meta/roster';
import {buildModule,emptyStation,recordWin} from '../../src/meta/station';
import {rescuedOutcome} from '../../src/session/campaignRewards';

it('real winning VIP missions award the entire existing roster and allow both homes to finish',async()=>{
 let station=emptyStation();
 for(const id of CAMPAIGN_VIP_MISSIONS){
  const level=await getCampaignLevel(id);let state=loadCampaignLevel(level);
  const proof=proofs.find(p=>p.levelId===id)!;
  for(const action of proof.actions){const next=transition(state,action as CampaignAction);expect(next.accepted).toBe(true);state=next.state;}
  expect(state.status).toBe('won');const outcome=rescuedOutcome(state);
  expect(outcome.vips).toEqual([campaignVip(id,'botanist')]);station=recordWin(station,outcome.vips,outcome.count);
 }
 expect(new Set(station.collectedVips)).toEqual(new Set(STATIONS.flatMap(s=>s.vips.map(v=>v.id))));
 // The campaign's remaining ordinary rescues supply construction thresholds.
 station=recordWin(station,[],60);
 for(const definition of STATIONS){
  for(const room of definition.modules)station=buildModule(station,room.id).state;
  if(station.stationsCompleted===1)station=recordWin(station,[],30);
 }
 expect(station.stationsCompleted).toBe(2);expect(station.archives).toHaveLength(2);
});
