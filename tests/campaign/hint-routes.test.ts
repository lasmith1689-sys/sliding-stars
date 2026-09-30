import {expect,it} from 'vitest';
import {getRouteHint} from '../../src/campaign/hintRoutes';
import {getCampaignLevel} from '../../src/campaign/catalog';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {hashState} from '../../src/campaign/engine/hash';

it.each([1,16,56,471,516,561,600,801,900,1000])('route hints finish mission %s without the previous greedy cycles',async id=>{
 let state=loadCampaignLevel(await getCampaignLevel(id));
 for(let step=0;step<12&&state.status==='playing';step++){
  const before=hashState(state),hint=await getRouteHint(state);
  expect(hashState(state)).toBe(before);expect(hint,`mission ${id}, step ${step}`).not.toBeNull();
  const next=transition(state,hint!);expect(next.accepted).toBe(true);state=next.state;
 }
 expect(state.status).toBe('won');expect(await getRouteHint(state)).toBeNull();
});
it('does not apply a saved route to a different or older board definition',async()=>{
 const state=loadCampaignLevel(await getCampaignLevel(1));state.level.seed++;
 expect(await getRouteHint(state)).toBeNull();
});
