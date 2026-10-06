import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {recoverPracticeMoves} from '../../src/session/campaignRecovery';
import {createCampaignSave} from '../../src/session/campaignSession';
import {parseCampaignState} from '../../src/campaign/schema';
import {legalActions} from '../../src/campaign/engine/actions';
import {terrainMatches} from '../../src/campaign/engine/matches';
import {loadSave,saveSnapshot} from '../../src/session/storage';
import {MemoryStorage} from './fixtures/legacy';

const trapped=()=>{
 const raw=JSON.parse(readFileSync(new URL('../../validation/campaign/receipts/jelly/fix1-original-711-trapped-state.json',import.meta.url),'utf8'));
 return parseCampaignState(raw.state);
};
it('restores a blocked historical practice save with minimal coating removal and no crew, station or account movement',()=>{
 const state=trapped(),save=createCampaignSave(state.level),store=new MemoryStorage();
 save.active={kind:'campaign',state,events:[]};save.revision=24;save.wallet.coins=3660;
 expect(legalActions(state)).toEqual([]);const before=structuredClone(save);
 const recovered=recoverPracticeMoves(save);
 expect(save).toEqual(before);expect(recovered.revision).toBe(25);
 if(recovered.active.kind!=='campaign')throw Error('Expected campaign');
 expect(legalActions(recovered.active.state).length).toBeGreaterThan(0);
 const oldJelly=state.fixtures.find(f=>f.kind==='jelly')!,newJelly=recovered.active.state.fixtures.find(f=>f.kind==='jelly')!;
 expect(oldJelly.coatedCells.length-newJelly.coatedCells.length).toBe(8);
 expect({...recovered.active.state,fixtures:state.fixtures}).toEqual(state);
 expect({...recovered,active:save.active,revision:save.revision}).toEqual(save);
 expect(terrainMatches(recovered.active.state)).toEqual([]);
 expect(parseCampaignState(JSON.parse(JSON.stringify(recovered.active.state)))).toEqual(recovered.active.state);
 expect(saveSnapshot(store,recovered).ok).toBe(true);expect(loadSave(store)).toEqual(recovered);
 expect(recoverPracticeMoves(recovered)).toBe(recovered);
});
it('keeps ordinary puzzles and already playable practice saves unchanged',()=>{
 const state=trapped(),ordinary=structuredClone(state);delete ordinary.level.metadata.failurePolicy;
 const save=createCampaignSave(state.level);save.active={kind:'campaign',state:ordinary,events:[]};
 expect(recoverPracticeMoves(save)).toBe(save);
 const playable=createCampaignSave(state.level);expect(legalActions(playable.active.kind==='campaign'?playable.active.state:state).length).toBeGreaterThan(0);
 expect(recoverPracticeMoves(playable)).toBe(playable);
});
