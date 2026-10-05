import {expect,it} from 'vitest';
import {CampaignSession,createCampaignSave} from '../../src/session/campaignSession';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {loadSave} from '../../src/session/storage';
import {MemoryStorage} from './fixtures/legacy';
import {recordWin} from '../../src/meta/station';

it('mission 3 banks the actual rescued crew and botanist with the victory, once across reload and replay',()=>{
 const storage=new MemoryStorage(),session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(3)!),storage);
 const play=()=>{for(const action of lessonTeachingActions[3]!){expect(session.dispatch(action)?.accepted).toBe(true);session.finishPresentation();}};
 play();
 expect(session.save.station.totalRescued).toBe(2);
 expect(session.save.station.stationRescued).toBe(2);
 expect(session.save.station.collectedVips).toContain('botanist');
 const saved=loadSave(storage)!;
 expect(saved.station).toEqual(session.save.station);
 const reload=new CampaignSession(saved,storage);reload.persist();
 expect(reload.save.station.totalRescued).toBe(2);
 session.restart();play();
 expect(session.save.station.totalRescued).toBe(2);
 expect(session.save.station.collectedVips).toEqual(['botanist']);
});

it('an uncompleted rescue and a rejected move cannot bank people or VIPs',()=>{
 const session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(3)!),new MemoryStorage());
 expect(session.dispatch({type:'swap',from:{r:1,c:2},to:{r:2,c:2}})?.accepted).toBe(false);
 session.dispatch(lessonTeachingActions[3]![0]!);session.finishPresentation();
 expect(session.save.station.totalRescued).toBe(0);
 expect(session.save.station.collectedVips).toEqual([]);
});

it('home building is a durable meta transaction that cannot run during a move or charge twice',()=>{
 const storage=new MemoryStorage(),session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(3)!),storage);
 session.save.station=recordWin(session.save.station,['botanist'],3);
 const active=structuredClone(session.save.active),wallet=structuredClone(session.save.wallet);
 session.locked=true;expect(session.buildStationModule('greenhouse')).toBe(false);session.finishPresentation();
 expect(session.buildStationModule('greenhouse')).toBe(true);const revision=session.save.revision;
 expect(session.buildStationModule('greenhouse')).toBe(false);expect(session.buildStationModule('unknown')).toBe(false);
 expect(session.save.revision).toBe(revision);expect(session.save.active).toEqual(active);expect(session.save.wallet).toEqual(wallet);
 expect(loadSave(storage)!.station.builtModules).toEqual(['greenhouse']);
});
