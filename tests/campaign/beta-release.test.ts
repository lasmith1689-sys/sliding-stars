import { expect,it } from 'vitest';
import { BETA_CAMPAIGN_IDS,getCampaignLevel } from '../../src/campaign/catalog';
import { authoredLessonLevels } from '../../src/campaign/lessons';
import { lessonSolutionTraces } from '../../src/campaign/content/lesson-solutions.dev';
import { replayTrace } from '../../src/campaign/validator';
import { createCampaignSave } from '../../src/session/campaignSession';
import { advanceToCampaign,selectBetaCampaignMission } from '../../src/session/adapter';
import { nextAvailableCampaignId,nextCampaignId } from '../../src/session/migrate';
import { loadSave,saveSnapshot } from '../../src/session/storage';
import { MemoryStorage } from '../session/fixtures/legacy';

it('ships exactly the reviewed 108 boards through phase doors at their canonical IDs',async()=>{
 const reviewed=authoredLessonLevels.filter(level=>level.id<=805);
 expect(BETA_CAMPAIGN_IDS).toEqual(reviewed.map(level=>level.id));
 expect(BETA_CAMPAIGN_IDS).toHaveLength(108);
 for(const level of reviewed)expect(await getCampaignLevel(level.id)).toEqual(level);
 await expect(getCampaignLevel(9)).rejects.toThrow(/Missing campaign content/);
});

it('replays every committed booster-free proof against the exact shipped definitions',async()=>{
 for(const id of BETA_CAMPAIGN_IDS){
  const trace=lessonSolutionTraces.find(item=>item.levelId===id);
  expect(trace,`missing trace for ${id}`).toBeDefined();
  expect(replayTrace(await getCampaignLevel(id),JSON.parse(JSON.stringify(trace))),`mission ${id}`).toEqual({won:true,issues:[]});
 }
});

it('advances across release gaps without claiming the missing canonical missions',async()=>{
 const store=new MemoryStorage(),save=createCampaignSave(await getCampaignLevel(8));
 save.completedCampaignIds=[1,2,3,4,5,6,7,8];
 save.active.kind==='campaign'&&(save.active.state.status='won');
 expect(nextCampaignId(save)).toBe(9);
 expect(nextAvailableCampaignId(save,BETA_CAMPAIGN_IDS)).toBe(16);
 expect(saveSnapshot(store,save).ok).toBe(true);
 const next=await advanceToCampaign(save,store);
 expect(next.active.kind).toBe('campaign');
 if(next.active.kind==='campaign')expect(next.active.state.levelId).toBe(16);
 expect(next.completedCampaignIds).toEqual([1,2,3,4,5,6,7,8]);
 expect(next.attempts['16']).toEqual({started:1,failed:0});
 expect(loadSave(store)).toEqual(next);
});

it('selects and replays fixed missions while retaining rewards and prior progress',async()=>{
 const store=new MemoryStorage(),save=createCampaignSave(await getCampaignLevel(1));
 save.completedCampaignIds=[1];save.rewardLedger=['2026.1:1:prior-reward'];
 save.wallet.coins=75;
 expect(saveSnapshot(store,save).ok).toBe(true);
 const selected=await selectBetaCampaignMission(save,store,805);
 expect(selected.active.kind).toBe('campaign');
 if(selected.active.kind==='campaign')expect(selected.active.state.levelId).toBe(805);
 expect(selected.completedCampaignIds).toEqual([1]);
 expect(selected.rewardLedger).toEqual(save.rewardLedger);
 expect(selected.wallet.coins).toBe(75);
 const replay=await selectBetaCampaignMission(selected,store,1);
 expect(replay.attempts['1']).toEqual({started:2,failed:0});
 expect(replay.completedCampaignIds).toEqual([1]);
 expect(loadSave(store)).toEqual(replay);
 await expect(selectBetaCampaignMission(replay,store,9)).rejects.toThrow(/not in this beta/);
 expect(loadSave(store)).toEqual(replay);
});
