import {expect,it} from 'vitest';
import {repairCampaignRewards} from '../../src/session/campaignRewards';
import {CampaignSession,createCampaignSave} from '../../src/session/campaignSession';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {emptyStation} from '../../src/meta/station';
import {MemoryStorage} from './fixtures/legacy';
import {baseLevel} from '../campaign/fixtures/base';

it('repairs an old paid completion once without replacing its active board, credits, or buildings',async()=>{
 const session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(3)!),new MemoryStorage());
 for(const action of lessonTeachingActions[3]!){session.dispatch(action);session.finishPresentation();}
 const old=structuredClone(session.save);old.station=emptyStation();old.station.builtModules=['galley'];old.wallet.coins=2260;
 old.rewardLedger=old.rewardLedger.filter(c=>!c.startsWith('home:'));
 const fixed=await repairCampaignRewards(old,async()=>{throw Error('Use committed win');});
 expect(fixed.station.totalRescued).toBe(2);expect(fixed.station.collectedVips).toEqual(['botanist']);expect(fixed.station.builtModules).toEqual(['galley']);
 expect(fixed.active).toEqual(old.active);expect(fixed.wallet).toEqual(old.wallet);expect(fixed.completedCampaignIds).toEqual(old.completedCampaignIds);
 expect(old.station.totalRescued).toBe(0);
 expect(await repairCampaignRewards(fixed,async()=>{throw Error('Already paid');})).toBe(fixed);
});
it('repairs historical rescue requirements without paying for skipped missions or inventing optional VIP rescues',async()=>{
 const old=createCampaignSave(baseLevel());old.completedCampaignIds=[3,9];old.rewardLedger=['2026.1:3:lesson-3'];
 const level=getAuthoredLessonLevel(3)!;old.rewardLedger=[`${level.campaignVersion}:3:${level.rewardId}`];
 const fixed=await repairCampaignRewards(old,async id=>{expect(id).toBe(3);return level;});
 expect(fixed.station.totalRescued).toBe(2);expect(fixed.station.collectedVips).toEqual(['botanist']);
 const quotas=baseLevel();quotas.id=146;quotas.crew=[];
 quotas.arrivals=[{id:'wave',turn:1,entry:{r:0,c:0},crew:[{id:'one',at:{r:0,c:0},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:'chef'},{id:'two',at:{r:0,c:0},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null}],status:'pending'}];
 quotas.goals=[{id:'wave-home',type:'homeCrew',eligible:{type:'sources',sourceIds:['wave'],target:1}}];
 const prior=createCampaignSave(baseLevel());prior.completedCampaignIds=[146];prior.rewardLedger=[`${quotas.campaignVersion}:146:${quotas.rewardId}`];
 const repaired=await repairCampaignRewards(prior,async()=>quotas);
 expect(repaired.station.totalRescued).toBe(1);expect(repaired.station.collectedVips).toEqual([]);
});
