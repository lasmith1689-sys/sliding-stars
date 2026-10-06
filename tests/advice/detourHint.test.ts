import {expect,it} from 'vitest';
import {detourHint} from '../../src/advice/detourHint';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {getCampaignLevel} from '../../src/campaign/catalog';
import {transition} from '../../src/campaign/engine/turn';
it('finds an opening rescue without spending supplies or mutating live state',async()=>{
 const state=loadCampaignLevel(await getCampaignLevel(1)),before=JSON.stringify(state);
 const action=await detourHint(state,new Set());expect(action).not.toBeNull();
 expect(action?.type).not.toBe('booster');expect(JSON.stringify(state)).toBe(before);
 expect(transition(state,action!).state.status).toBe('won');
});
it('returns no stale advice after input cancels the request',async()=>{
 const state=loadCampaignLevel(await getCampaignLevel(1));
 expect(await detourHint(state,new Set(),()=>true)).toBeNull();
});
it.each([{maxTransitions:0,maxMilliseconds:180},{maxTransitions:128,maxMilliseconds:0}])('returns no advice when its bounded budget is exhausted (%j)',async limits=>{
 const state=loadCampaignLevel(await getCampaignLevel(3)),before=JSON.stringify(state);
 expect(await detourHint(state,new Set(),()=>false,limits)).toBeNull();
 expect(JSON.stringify(state)).toBe(before);
});
