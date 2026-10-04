import { expect,it } from 'vitest';
import { BETA_CAMPAIGN_IDS,AUTHORED_CAMPAIGN_IDS,RETIRED_BETA_CAMPAIGN_IDS,getCampaignLevel } from '../../src/campaign/catalog';
import { authoredLessonLevels } from '../../src/campaign/lessons';
import { lessonSolutionTraces } from '../../src/campaign/content/lesson-solutions.dev';
import { replayTrace } from '../../src/campaign/validator';
import { createCampaignSave } from '../../src/session/campaignSession';
import { advanceToCampaign,migrateRetiredBetaMission,selectBetaCampaignMission } from '../../src/session/adapter';
import { nextAvailableCampaignId,nextCampaignId } from '../../src/session/migrate';
import { loadSave,SAVE_KEY,saveSnapshot } from '../../src/session/storage';
import { MemoryStorage } from '../session/fixtures/legacy';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {safeTerrain} from '../../src/campaign/engine/needs';
import {transition} from '../../src/campaign/engine/turn';
import {retiredPortalLessonSeeds} from '../../src/campaign/content/lesson-seeds';

it('ships 1000 missions with 127 authored teaching boards covering 25 nonportal mechanics',async()=>{
 const reviewed=authoredLessonLevels.filter(level=>!level.mechanics.some(m=>m.id==='portals'));
 expect(AUTHORED_CAMPAIGN_IDS).toEqual(reviewed.map(level=>level.id));
 expect(BETA_CAMPAIGN_IDS).toEqual(Array.from({length:1000},(_,i)=>i+1));
 for(const level of reviewed)expect(await getCampaignLevel(level.id)).toEqual(level);
 for(const id of RETIRED_BETA_CAMPAIGN_IDS)expect((await getCampaignLevel(id)).mechanics.some(m=>m.id==='portals')).toBe(false);
 expect((await getCampaignLevel(1000)).id).toBe(1000);
});

it.each([1,2,3])('opening mission %s starts with every explorer still needing rescue',async id=>{
 const level=await getCampaignLevel(id),state=loadCampaignLevel(level);
 expect(state.status).toBe('playing');expect(state.points).toBe(0);
 expect(state.crew.length).toBeGreaterThan(0);
 for(const crew of state.crew){expect(crew.status).toBe('active');expect(safeTerrain(state,crew)).toBe(false);expect(crew.rescueMoves).toBeGreaterThan(0);}
 expect(state.goalProgress.every(goal=>goal.completedIds.length===0)).toBe(true);
});

it.each(RETIRED_BETA_CAMPAIGN_IDS)('moves saved portal mission %s to a playable board without losing account progress',async id=>{
 const store=new MemoryStorage(),level=retiredPortalLessonSeeds.find(level=>level.id===id)!,save=createCampaignSave(level);
 save.wallet.coins=812;save.completedCampaignIds=[1,2,376];save.rewardLedger=['2026.1:376:prior-reward'];save.preferences.sound=true;save.seenTips=['rescue'];
 const original=structuredClone(save);expect(saveSnapshot(store,save).ok).toBe(true);
 const migrated=await migrateRetiredBetaMission(save,store);
 expect(save).toEqual(original);expect(migrated.active.kind).toBe('campaign');
 if(migrated.active.kind==='campaign'){
  expect(migrated.active.state.levelId).toBe(id+1);
  expect(migrated.active.state.level.mechanics.some(m=>m.id==='portals')).toBe(false);
  expect(migrated.active.events).toEqual([]);
 }
 for(const field of ['wallet','station','preferences','seenTips','completedCampaignIds','rewardLedger','assistedCompletions','learnedMechanics','migrationEntitlements'] as const)expect(migrated[field]).toEqual(original[field]);
 expect(migrated.attempts[String(id)]).toEqual(original.attempts[String(id)]);
 expect(loadSave(store)).toEqual(migrated);
 expect(await migrateRetiredBetaMission(migrated,store)).toBe(migrated);
});

it.each([1,2,3])('refreshes an untouched old opening mission %s without counting another attempt',async id=>{
 const store=new MemoryStorage(),old=await getCampaignLevel(id);
 old.crew[0]!.at=id===1?{r:0,c:0}:{r:5,c:1};
 const save=createCampaignSave(old);save.wallet.coins=412;const attempts=structuredClone(save.attempts);
 const migrated=await migrateRetiredBetaMission(save,store);
 expect(migrated.active.kind).toBe('campaign');
 if(migrated.active.kind==='campaign')for(const crew of migrated.active.state.crew)expect(safeTerrain(migrated.active.state,crew)).toBe(false);
 expect(migrated.wallet).toEqual(save.wallet);expect(migrated.attempts).toEqual(attempts);
 expect(await migrateRetiredBetaMission(migrated,store)).toBe(migrated);
});

it('preserves an opening mission already in progress and never overwrites a failed migration save',async()=>{
 const store=new MemoryStorage(),old=await getCampaignLevel(3);old.crew[0]!.at={r:5,c:1};
 const save=createCampaignSave(old);
 if(save.active.kind!=='campaign')throw Error('Expected campaign');
 const action=lessonSolutionTraces.find(trace=>trace.levelId===3)!.actions[0]!;
 save.active.state=transition(save.active.state,action).state;
 expect(save.active.state.turn).toBe(1);expect(await migrateRetiredBetaMission(save,store)).toBe(save);
 const retired=createCampaignSave(retiredPortalLessonSeeds.find(level=>level.id===376)!);
 expect(saveSnapshot(store,retired).ok).toBe(true);store.failKey=SAVE_KEY;
 await expect(migrateRetiredBetaMission(retired,store)).rejects.toThrow();
 expect(loadSave(store)).toEqual(retired);
});

it('replays every committed booster-free proof against the exact shipped definitions',async()=>{
 for(const id of AUTHORED_CAMPAIGN_IDS){
  const trace=lessonSolutionTraces.find(item=>item.levelId===id);
  expect(trace,`missing trace for ${id}`).toBeDefined();
  expect(replayTrace(await getCampaignLevel(id),JSON.parse(JSON.stringify(trace))),`mission ${id}`).toEqual({won:true,issues:[]});
 }
});

it('advances into generated missions without skipping canonical numbers',async()=>{
 const store=new MemoryStorage(),save=createCampaignSave(await getCampaignLevel(8));
 save.completedCampaignIds=[1,2,3,4,5,6,7,8];
 save.active.kind==='campaign'&&(save.active.state.status='won');
 expect(nextCampaignId(save)).toBe(9);
 expect(nextAvailableCampaignId(save,BETA_CAMPAIGN_IDS)).toBe(9);
 expect(saveSnapshot(store,save).ok).toBe(true);
 const next=await advanceToCampaign(save,store);
 expect(next.active.kind).toBe('campaign');
 if(next.active.kind==='campaign')expect(next.active.state.levelId).toBe(9);
 expect(next.completedCampaignIds).toEqual([1,2,3,4,5,6,7,8]);
 expect(next.attempts['9']).toEqual({started:1,failed:0});
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
 await expect(selectBetaCampaignMission(replay,store,1001)).rejects.toThrow(/not in this beta/);
 expect(loadSave(store)).toEqual(replay);
});

it.each(RETIRED_BETA_CAMPAIGN_IDS)('does not migrate the new nonportal mission %s',async id=>{
 const store=new MemoryStorage(),save=createCampaignSave(await getCampaignLevel(id));
 expect(await migrateRetiredBetaMission(save,store)).toBe(save);
});
