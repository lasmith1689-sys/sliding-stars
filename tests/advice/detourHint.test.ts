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
