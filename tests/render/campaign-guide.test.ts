import {expect,it} from 'vitest';
import {campaignGuideTopics,crewOxygenDescription} from '../../src/ui/campaignGuide';
import {getCampaignLevel} from '../../src/campaign/catalog';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import beta from '../../src/campaign/content/beta-levels.json';

it('keeps future mechanics out of the opening and crate guides',async()=>{
 expect(campaignGuideTopics({level:await getCampaignLevel(1)})).toEqual([]);
 expect(campaignGuideTopics({level:await getCampaignLevel(4)}).map(t=>t.id)).toEqual(['crates']);
});
it.each([376,841,881,921,961])('explains only mission %s mechanics with compact instructions',id=>{
 const level=getAuthoredLessonLevel(id)!,topics=campaignGuideTopics({level});
 expect(topics.map(t=>t.id)).toEqual(level.mechanics.map(m=>m.id));
 expect(topics.every(t=>t.body.length<350)).toBe(true);
 expect(topics.some(t=>/portal/i.test(t.title+' '+t.body))).toBe(false);
});
it('distinguishes actual ground, occupied transport and a missing clock in crew details',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(1)!),crew=state.crew[0]!;
 expect(crewOxygenDescription(state,crew)).toMatch(/^\d+ moves$/);
 const missingClock={...crew,rescueMoves:null};
 expect(crewOxygenDescription(state,missingClock)).toBe('no countdown');
 const tile=state.pieces.find(p=>p.at.r===crew.at.r&&p.at.c===crew.at.c)!;
 if(tile.kind!=='tile')throw Error('Expected terrain');tile.tier=4;
 expect(crewOxygenDescription(state,missingClock)).toBe('on safe ground');
 const flight=loadCampaignLevel(getAuthoredLessonLevel(961)!);
 expect(crewOxygenDescription(flight,flight.crew[0]!)).toBe('safe aboard');
 const tether=loadCampaignLevel(getAuthoredLessonLevel(881)!);
 expect(crewOxygenDescription(tether,tether.crew[0]!)).toBe('no countdown');
});
it('has help for every mechanic actually present in the released authored boards',async()=>{
 for(const seed of beta){
  const level=await getCampaignLevel(seed.id),topics=campaignGuideTopics({level});
  expect(topics.map(t=>t.id),`mission ${seed.id}`).toEqual(level.mechanics.map(m=>m.id));
  expect(topics.every(t=>t.body.length<350)).toBe(true);
 }
});
