import { expect,it } from 'vitest';
import { CampaignSession,createCampaignSave } from '../../src/session/campaignSession';
import { migrateRun } from '../../src/session/migrate';
import { loadSave,parseSaveV2,SAVE_KEY } from '../../src/session/storage';
import { openExecutor } from '../../src/session/adapter';
import { baseLevel,mergeSwap } from '../campaign/fixtures/base';
import { loadCampaignLevel } from '../../src/campaign/engine/load';
import { getAuthoredLessonLevel } from '../../src/campaign/lessons';
import { MemoryStorage,legacyRun } from './fixtures/legacy';
function setup(winning=false){const store=new MemoryStorage(),save=migrateRun(legacyRun()),level=baseLevel();if(winning)level.crew[0]!.at={r:3,c:1};save.active={kind:'campaign',state:loadCampaignLevel(level),events:[]};return {store,session:new CampaignSession(save,store)};}
const win={type:'swap' as const,from:{r:3,c:3},to:{r:3,c:2}};
it('commits state, points and presentation before returning; reload never repeats action',()=>{
 const {store,session}=setup();const before=session.save.wallet.coins,result=session.dispatch(mergeSwap)!;expect(result.accepted).toBe(true);expect(session.locked).toBe(true);
 const saved=loadSave(store)!;expect(saved.active).toEqual({kind:'campaign',state:result.state,events:result.events});expect(saved.wallet.coins).toBe(before+result.state.points);
 expect(session.dispatch(mergeSwap)).toBeNull();expect(loadSave(store)).toEqual(saved);
 const restored=openExecutor(saved,store);if(restored.kind!=='campaign')throw Error();expect(restored.session.locked).toBe(false);expect(restored.session.save).toEqual(saved);
 restored.session.finishPresentation();expect(restored.session.save.wallet.coins).toBe(saved.wallet.coins);
});
it('charges accepted boosters once without ticking a turn and preserves rejected inventory',()=>{
 const {session}=setup();expect(session.dispatch({type:'booster',kind:'demo',at:{r:3,c:3}})?.accepted).toBe(false);expect(session.save.wallet.inventory.demo).toBe(7);
 expect(session.dispatch({type:'booster',kind:'demo',at:{r:0,c:3}})?.accepted).toBe(true);expect(session.save.wallet.inventory.demo).toBe(6);
 expect(session.dispatch({type:'booster',kind:'demo',at:{r:0,c:3}})).toBeNull();if(session.save.active.kind==='campaign')expect(session.save.active.state.turn).toBe(0);
});
it('banked victory remains exactly once across reload and presentation completion',()=>{
 const {store,session}=setup(true);expect(session.dispatch(win)?.state.status).toBe('won');expect(session.save.completedCampaignIds).toEqual([1]);expect(session.save.rewardLedger).toHaveLength(1);
 const saved=structuredClone(session.save),reloaded=new CampaignSession(loadSave(store)!,store);reloaded.finishPresentation();expect(reloaded.dispatch(win)).toBeNull();expect(reloaded.save).toEqual(saved);
});
it('quota failure keeps committed in-memory victory locked and exposes retryable warning',()=>{
 const {store,session}=setup(true);store.failKey=SAVE_KEY;expect(session.dispatch(win)?.state.status).toBe('won');expect(session.saveError).toBeTruthy();expect(session.locked).toBe(true);
 session.finishPresentation();expect(session.dispatch(win)).toBeNull();expect(session.save.rewardLedger).toHaveLength(1);store.failKey=null;expect(session.persist().ok).toBe(true);expect(session.saveError).toBeNull();expect(loadSave(store)).toEqual(session.save);
});
it('records failed attempts and assisted victories separately',()=>{
 const {session}=setup();if(session.save.active.kind!=='campaign')throw Error();session.save.active.state.level.moveLimit=1;session.save.active.state.movesRemaining=1;
 expect(session.dispatch(mergeSwap)?.state.status).toBe('lost');expect(session.save.attempts['1']?.failed).toBe(1);session.finishPresentation();session.restart();expect(session.save.attempts['1']?.started).toBe(2);
 expect(session.save.assistedCompletions).toEqual([]);
 const {session:assist}=setup(true);assist.markAssisted();assist.dispatch(win);expect(assist.save.assistedCompletions).toEqual([1]);expect(parseSaveV2(assist.save)).toEqual(assist.save);
});
it('fresh accounts have no fabricated legacy evidence and retain authored no-failure policy',()=>{
 const level=getAuthoredLessonLevel(4)!,save=createCampaignSave(level);expect(save.migrationEntitlements.legacyLevel).toBeNull();expect(save.wallet.coins).toBe(300);expect(save.attempts['4']).toEqual({started:1,failed:0});
 const store=new MemoryStorage(),session=new CampaignSession(save,store);expect(session.persist().ok).toBe(true);
 const loaded=loadSave(store)!;if(loaded.active.kind!=='campaign')throw Error();expect(loaded.active.state.level.metadata.failurePolicy).toBe('no-failure');expect(loaded.activeAssisted).toBe(false);
});
it('rejects an unowned booster and commits purchases without double spending during animation',()=>{
 const {session}=setup();session.save.wallet.inventory.demo=0;const before=structuredClone(session.save);
 expect(session.dispatch({type:'booster',kind:'demo',at:{r:0,c:3}})?.accepted).toBe(false);expect(session.save).toEqual(before);
 expect(session.purchase('demo')).toBe(true);expect(session.save.wallet.coins).toBe(8465);expect(session.save.wallet.inventory.demo).toBe(1);
 session.dispatch(mergeSwap);expect(session.purchase('demo')).toBe(false);session.finishPresentation();session.save.wallet.coins=0;expect(session.purchase('demo')).toBe(false);
});
it('a replayed victory does not add a second completion reward claim',()=>{
 const {session}=setup(true);session.dispatch(win);session.finishPresentation();session.restart();session.dispatch(win);
 expect(session.save.completedCampaignIds).toEqual([1]);expect(session.save.rewardLedger).toHaveLength(1);
});
