import { expect,it } from 'vitest';
import { migrateRun,nextCampaignId } from '../../src/session/migrate';
import { openExecutor,advanceToCampaign } from '../../src/session/adapter';
import { loadSave,saveSnapshot,SAVE_KEY } from '../../src/session/storage';
import { RUN_KEY } from '../../src/meta/run';
import { baseLevel } from '../campaign/fixtures/base';
import { MemoryStorage,legacyRun } from './fixtures/legacy';
it.each([1,1000,1207])('preserves every legacy possession and exact board at level %s',level=>{
 const run=legacyRun(level),save=migrateRun(run);
 expect(save.active).toEqual({kind:'legacy',rulesVersion:'legacy-1',run});
 expect(save.wallet).toEqual(run.wallet);expect(save.station).toEqual(run.station);expect(save.preferences).toEqual(run.preferences);expect(save.seenTips).toEqual(run.seenTips);
 expect(save.completedCampaignIds).toEqual([]);expect(save.rewardLedger).toEqual([]);expect(save.migrationEntitlements.legacyLevel).toBe(level);
 expect(migrateRun(run)).toEqual(save);save.wallet.coins=1;expect(run.wallet.coins).toBe(8765);
});
it('reads V1 without writing it and preserves V2 canonical run on executor open',()=>{
 const store=new MemoryStorage(),old=legacyRun(1),canonical=legacyRun(1000);store.setItem(RUN_KEY,JSON.stringify(old));
 expect(loadSave(store)?.active).toEqual(migrateRun(old).active);
 const save=migrateRun(canonical);expect(saveSnapshot(store,save).ok).toBe(true);
 const executor=openExecutor(loadSave(store)!,store);expect(executor.kind).toBe('legacy');if(executor.kind!=='legacy')throw Error();
 expect(executor.session.data).toEqual(canonical);expect(store.getItem(RUN_KEY)).toBe(JSON.stringify(old));
});
it('finishes the legacy board once while retaining newer canonical wallet and layouts',async()=>{
 const store=new MemoryStorage(),save=migrateRun(legacyRun(1000)),opened=openExecutor(save,store);if(opened.kind!=='legacy')throw Error();
 opened.session.save.wallet.coins=9999;opened.session.save.station.theme='starlight';
 expect(opened.session.swap({r:2,c:0},{r:2,c:1})?.state.status).toBe('won');
 const final=opened.session.save;expect(final.wallet.coins).toBeGreaterThan(9999);expect(final.station.theme).toBe('starlight');expect(final.station.totalRescued).toBe(43);
 expect(final.completedCampaignIds).toEqual([]);expect(final.rewardLedger).toEqual([]);
 const next=await advanceToCampaign(final,store,async id=>({...baseLevel(),id,chapter:Math.ceil(id/50)}));
 expect(next.active.kind).toBe('campaign');if(next.active.kind==='campaign')expect(next.active.state.levelId).toBe(1);
 expect(next.station.totalRescued).toBe(43);expect(store.getItem(RUN_KEY)).toBeNull();
});
it('distinguishes current and already-paid legacy boundaries without inventing campaign wins',async()=>{
 const current=migrateRun(legacyRun(99));expect(nextCampaignId(current)).toBe(99);
 await expect(advanceToCampaign(current,new MemoryStorage(),async()=>baseLevel())).rejects.toThrow(/legacy/i);
 const won=legacyRun(99);won.board.status='won';won.claimed=true;
 const save=migrateRun(won);expect(nextCampaignId(save)).toBe(100);expect(save.completedCampaignIds).toEqual([]);
 const next=await advanceToCampaign(save,new MemoryStorage(),async id=>({...baseLevel(),id,chapter:Math.ceil(id/50)}));expect(next.station).toEqual(won.station);
 expect(nextCampaignId(migrateRun(legacyRun(1207)))).toBe(1);
});
it('missing release content leaves the finished legacy snapshot intact',async()=>{
 const run=legacyRun();run.board.status='won';run.claimed=true;const save=migrateRun(run),before=structuredClone(save);
 await expect(advanceToCampaign(save,new MemoryStorage(),async()=>{throw Error('Missing campaign content');})).rejects.toThrow('Missing campaign content');expect(save).toEqual(before);
});
it('legacy quota failure retains claimed win, rejects duplicate reward and can persist later',()=>{
 const store=new MemoryStorage(),opened=openExecutor(migrateRun(legacyRun()),store);if(opened.kind!=='legacy')throw Error();
 store.failKey=SAVE_KEY;opened.session.swap({r:2,c:0},{r:2,c:1});expect(opened.session.saveError).toBe(true);expect(opened.session.saveWarning).toBeTruthy();
 opened.session.finishAnimation();expect(opened.session.swap({r:2,c:0},{r:2,c:1})).toBeNull();expect(opened.session.save.station.totalRescued).toBe(43);
 store.failKey=null;opened.session.persist();expect(opened.session.saveError).toBe(false);expect(loadSave(store)).toEqual(opened.session.save);
});
it('a failed campaign-start save keeps the paid legacy win available and preserves its possessions',async()=>{
 const store=new MemoryStorage(),run=legacyRun(10);run.board.status='won';run.claimed=true;const save=migrateRun(run),before=structuredClone(save);store.failKey=SAVE_KEY;
 await expect(advanceToCampaign(save,store,async id=>({...baseLevel(),id,chapter:1}))).rejects.toThrow(/quota/i);expect(save).toEqual(before);
});
it('canonical newer meta wins conflicts while direct legacy preference edits persist',()=>{
 const store=new MemoryStorage(),save=migrateRun(legacyRun()),opened=openExecutor(save,store);if(opened.kind!=='legacy')throw Error();
 opened.session.save.wallet.coins=10000;opened.session.data.preferences.hints=true;opened.session.persist();
 expect(opened.session.save.wallet.coins).toBe(10000);expect(loadSave(store)?.preferences.hints).toBe(true);
});
it('a paid legacy board cannot be restarted to collect its station reward again',()=>{
 const store=new MemoryStorage(),opened=openExecutor(migrateRun(legacyRun()),store);if(opened.kind!=='legacy')throw Error();
 opened.session.swap({r:2,c:0},{r:2,c:1});opened.session.finishAnimation();const paid=structuredClone(opened.session.save);
 opened.session.restart();expect(opened.session.swap({r:2,c:0},{r:2,c:1})).toBeNull();expect(opened.session.save).toEqual(paid);
});
