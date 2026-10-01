import {it,expect} from 'vitest';
import {upgradeRescueShuttles} from '../../src/session/rescueUpgrade';
import {createCampaignSave} from '../../src/session/campaignSession';
import {baseLevel} from '../campaign/fixtures/base';
it('refreshes only an unfinished mission once while preserving earned progress',async()=>{
 const save=createCampaignSave(baseLevel());save.wallet.coins=123;save.completedCampaignIds=[2];save.seenTips=['old-tip'];
 if(save.active.kind!=='campaign')throw Error('fixture');save.active.state.turn=7;
 const result=await upgradeRescueShuttles(save,async()=>baseLevel());
 expect(result.active.kind==='campaign'&&result.active.state.turn).toBe(0);
 expect(result.wallet).toEqual(save.wallet);expect(result.completedCampaignIds).toEqual([2]);expect(result.attempts).toEqual(save.attempts);
 expect(save.active.state.turn).toBe(7);expect(await upgradeRescueShuttles(result,async()=>{throw Error('must not reload')})).toBe(result);
});
it('does not erase a won mission waiting for automatic advancement',async()=>{
 const save=createCampaignSave(baseLevel());if(save.active.kind!=='campaign')throw Error('fixture');save.active.state.status='won';
 const result=await upgradeRescueShuttles(save,async()=>{throw Error('must not load')});expect(result.active).toEqual(save.active);
});
