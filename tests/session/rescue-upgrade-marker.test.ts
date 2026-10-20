import {expect,it} from 'vitest';
import {upgradeRescueShuttles} from '../../src/session/rescueUpgrade';
import {createCampaignSave} from '../../src/session/campaignSession';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {migrateRun} from '../../src/session/migrate';
import {baseLevel} from '../campaign/fixtures/base';
import {legacyRun} from './fixtures/legacy';
import type {SaveV2} from '../../src/session/types';

// upgradeRescueShuttles: a save lacking the rescue-shuttles-v2 marker restarts
// the unfinished board once; a save carrying the marker is left untouched.
const marker='rescue-shuttles-v2';
function midBoard(levelId=5):SaveV2 {
 const save=createCampaignSave({...baseLevel(),id:levelId});
 if(save.active.kind!=='campaign')throw Error('fixture');
 const state=save.active.state;state.turn=9;state.points=420;state.crew[0]!.at={r:1,c:1};
 state.pieces=state.pieces.filter(p=>p.id!=='piece-0-0');
 save.activeAssisted=true;save.revision=17;save.seenTips=['pod'];
 save.wallet.coins=321;save.completedCampaignIds=[1,2,3];
 return save;
}

it('restarts an unmarked mid-board campaign save from the provider level and stamps the marker once',async()=>{
 const save=midBoard(),frozen=structuredClone(save);const requested:number[]=[];
 const result=await upgradeRescueShuttles(save,async id=>{requested.push(id);return {...baseLevel(),id};});
 expect(requested).toEqual([5]);
 expect(result).not.toBe(save);
 expect(result.active).toEqual({kind:'campaign',state:loadCampaignLevel({...baseLevel(),id:5}),events:[]});
 expect(result.activeAssisted).toBe(false);
 expect(result.seenTips).toEqual(['pod',marker]);
 expect(result.revision).toBe(18);
 expect(result.wallet).toEqual(frozen.wallet);expect(result.completedCampaignIds).toEqual([1,2,3]);
 expect(result.station).toEqual(frozen.station);expect(result.attempts).toEqual(frozen.attempts);
 expect(save).toEqual(frozen);
});

it('leaves a marked mid-board campaign save alone without consulting the provider',async()=>{
 const save=midBoard();save.seenTips.push(marker);const frozen=structuredClone(save);
 const result=await upgradeRescueShuttles(save,async()=>{throw Error('must not load')});
 expect(result).toBe(save);expect(save).toEqual(frozen);
});

it('leaves a marked in-progress legacy save alone without consulting the provider',async()=>{
 const save=migrateRun(legacyRun());save.seenTips.push(marker);const frozen=structuredClone(save);
 expect(save.active.kind).toBe('legacy');
 const result=await upgradeRescueShuttles(save,async()=>{throw Error('must not load')});
 expect(result).toBe(save);expect(save).toEqual(frozen);
});

it('moves an unmarked in-progress legacy save onto the next campaign board',async()=>{
 const save=migrateRun(legacyRun(3));save.activeAssisted=true;const frozen=structuredClone(save);let requested=0;
 if(save.active.kind!=='legacy'||save.active.run.board.status!=='playing')throw Error('fixture');
 const result=await upgradeRescueShuttles(save,async id=>{requested=id;return {...baseLevel(),id};});
 expect(requested).toBe(3);
 expect(result.active).toEqual({kind:'campaign',state:loadCampaignLevel({...baseLevel(),id:3}),events:[]});
 expect(result.activeAssisted).toBe(false);expect(result.seenTips).toContain(marker);expect(result.revision).toBe(frozen.revision+1);
 expect(result.wallet).toEqual(frozen.wallet);expect(save).toEqual(frozen);
});

it('stamps an unmarked lost campaign save without restarting its board',async()=>{
 const save=midBoard();if(save.active.kind!=='campaign')throw Error('fixture');save.active.state.status='lost';
 const result=await upgradeRescueShuttles(save,async()=>{throw Error('must not load')});
 expect(result.active).toEqual(save.active);expect(result.activeAssisted).toBe(true);
 expect(result.seenTips).toEqual(['pod',marker]);expect(result.revision).toBe(18);
});

it('a second upgrade of the restarted save is a no-op',async()=>{
 const once=await upgradeRescueShuttles(midBoard(),async id=>({...baseLevel(),id}));
 expect(await upgradeRescueShuttles(once,async()=>{throw Error('must not reload')})).toBe(once);
 expect(once.seenTips.filter(t=>t===marker)).toHaveLength(1);
});
