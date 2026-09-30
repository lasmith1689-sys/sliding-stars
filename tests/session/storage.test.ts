import { expect,it } from 'vitest';
import { loadSave,readSave,saveSnapshot,SAVE_KEY,BACKUP_KEY,parseSaveV2 } from '../../src/session/storage';
import { migrateRun } from '../../src/session/migrate';
import { RUN_KEY } from '../../src/meta/run';
import { MemoryStorage,legacyRun } from './fixtures/legacy';
import { loadCampaignLevel } from '../../src/campaign/engine/load';
import { baseLevel } from '../campaign/fixtures/base';
import {priorJellyWarningState} from '../campaign/fixtures/jelly-prior-warning';
it('selects the highest valid revision regardless of slot, tolerating truncated primary',()=>{
 const store=new MemoryStorage(),older=migrateRun(legacyRun()),newer=structuredClone(older);newer.revision=8;newer.wallet.coins=12345;
 store.setItem(SAVE_KEY,JSON.stringify(older));store.setItem(BACKUP_KEY,JSON.stringify(newer));expect(loadSave(store)).toEqual(newer);
 store.setItem(SAVE_KEY,'{"schemaVersion":2,');expect(loadSave(store)).toEqual(newer);
});
it('a primary write failure retains last valid backup and old V1',()=>{
 const store=new MemoryStorage(),save=migrateRun(legacyRun());store.setItem(RUN_KEY,'untouched');expect(saveSnapshot(store,save).ok).toBe(true);
 const newer={...save,revision:1,wallet:{...save.wallet,coins:99}};store.failKey=SAVE_KEY;
 expect(saveSnapshot(store,newer).ok).toBe(false);expect(loadSave(store)).toEqual(save);expect(store.getItem(RUN_KEY)).toBe('untouched');
});
it.each([SAVE_KEY,BACKUP_KEY])('refuses to overwrite unknown future schema in %s',key=>{
 const store=new MemoryStorage(),future=JSON.stringify({schemaVersion:3,revision:99,unknown:'keep me'});store.setItem(key,future);
 expect(readSave(store).status).toBe('unsupported');expect(loadSave(store)).toBeNull();expect(saveSnapshot(store,migrateRun(legacyRun())).ok).toBe(false);expect(store.getItem(key)).toBe(future);
});
it('does not silently reset corrupt V2 to older V1',()=>{
 const store=new MemoryStorage();store.setItem(RUN_KEY,JSON.stringify(legacyRun()));store.setItem(SAVE_KEY,'{');expect(readSave(store).status).toBe('corrupt');expect(loadSave(store)).toBeNull();
});
it('loads and rewrites an exact prior jelly warning through the V2 save boundary',()=>{
 const store=new MemoryStorage(),save=migrateRun(legacyRun());
 save.active={kind:'campaign',state:priorJellyWarningState(),events:[]};
 const raw=JSON.stringify(save);store.setItem(SAVE_KEY,raw);
 const restored=loadSave(store)!;
 expect(readSave(store).status).toBe('loaded');
 expect(store.getItem(SAVE_KEY)).toBe(raw);
 if(restored.active.kind!=='campaign')throw Error('Expected campaign save');
 expect(restored.active.state.fixtures.find(f=>f.kind==='jelly')?.preview).toBeNull();
 restored.revision++;
 expect(saveSnapshot(store,restored).ok).toBe(true);
 expect(loadSave(store)?.active).toEqual(restored.active);
});
it('reports denied storage and rejects stale writers',()=>{
 const store=new MemoryStorage(),save=migrateRun(legacyRun());store.denied=true;expect(readSave(store).status).toBe('unavailable');expect(saveSnapshot(store,save).ok).toBe(false);
 store.denied=false;save.revision=10;expect(saveSnapshot(store,save).ok).toBe(true);expect(saveSnapshot(store,{...save,revision:9}).ok).toBe(false);
});
it('validates nested metadata and legacy rule identifiers',()=>{
 const save=migrateRun(legacyRun());expect(parseSaveV2(save)).toEqual(save);
 expect(()=>parseSaveV2({...save,wallet:{...save.wallet,coins:-1}})).toThrow();expect(()=>parseSaveV2({...save,completedCampaignIds:[1001]})).toThrow();expect(()=>parseSaveV2({...save,active:{...save.active,rulesVersion:'future'}})).toThrow();
});
it('backup write denial does not modify the primary snapshot',()=>{
 const store=new MemoryStorage(),save=migrateRun(legacyRun());saveSnapshot(store,save);const original=store.getItem(SAVE_KEY);store.failKey=BACKUP_KEY;
 expect(saveSnapshot(store,{...save,revision:1}).ok).toBe(false);expect(store.getItem(SAVE_KEY)).toBe(original);
});
it.each(['rulesVersion','campaignVersion'])('preserves future campaign %s without overwriting either slot',version=>{
 const store=new MemoryStorage(),save=migrateRun(legacyRun());save.active={kind:'campaign',state:loadCampaignLevel(baseLevel()),events:[]};
 const future=JSON.parse(JSON.stringify(save));future.active.state[version]='future';const raw=JSON.stringify(future);store.setItem(SAVE_KEY,raw);
 expect(readSave(store).status).toBe('unsupported');expect(saveSnapshot(store,save).ok).toBe(false);expect(store.getItem(SAVE_KEY)).toBe(raw);expect(store.getItem(BACKUP_KEY)).toBeNull();
});
const futurePayloadCases=[SAVE_KEY,BACKUP_KEY].flatMap(futureKey=>['rulesVersion','campaignVersion'].flatMap(version=>[
 {shape:'absent',level:undefined},{shape:'null',level:null},{shape:'changed representation',level:'future-level-reference:1'},
].map(payload=>({futureKey,version,...payload}))));
it.each(futurePayloadCases)('preserves future $version with $shape level in $futureKey despite a valid other slot',({futureKey,version,level})=>{
 const store=new MemoryStorage(),supported=migrateRun(legacyRun()),otherKey=futureKey===SAVE_KEY?BACKUP_KEY:SAVE_KEY;
 const futureRaw=JSON.stringify({schemaVersion:2,revision:99,active:{kind:'campaign',state:{rulesVersion:'campaign-1',campaignVersion:'2026.1',[version]:'future',level},events:[]}});
 const supportedRaw=JSON.stringify(supported);store.setItem(futureKey,futureRaw);store.setItem(otherKey,supportedRaw);
 const primaryBefore=store.getItem(SAVE_KEY),backupBefore=store.getItem(BACKUP_KEY);
 expect.soft(readSave(store).status).toBe('unsupported');expect.soft(loadSave(store)).toBeNull();
 expect.soft(saveSnapshot(store,{...supported,revision:1}).ok).toBe(false);
 expect.soft(store.getItem(SAVE_KEY)).toBe(primaryBefore);expect.soft(store.getItem(BACKUP_KEY)).toBe(backupBefore);
});
it('rejects mismatched authored/state level IDs and malformed events at the V2 boundary',()=>{
 const save=migrateRun(legacyRun());save.active={kind:'campaign',state:loadCampaignLevel(baseLevel()),events:[]};
 const wrong=structuredClone(save);if(wrong.active.kind!=='campaign')throw Error();wrong.active.state.levelId=2;expect(()=>parseSaveV2(wrong)).toThrow();
 expect(()=>parseSaveV2({...save,active:{...save.active,events:[{type:'points',sequenceId:0,timingGroup:0,before:0,after:-1}]}})).toThrow();
});
