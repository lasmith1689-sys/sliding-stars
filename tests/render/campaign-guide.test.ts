import {expect,it} from 'vitest';
import {campaignGuideTopics} from '../../src/ui/campaignGuide';
import {getCampaignLevel} from '../../src/campaign/catalog';
import beta from '../../src/campaign/content/beta-levels.json';

it('keeps future mechanics out of the opening and crate guides',async()=>{
 expect(campaignGuideTopics({level:await getCampaignLevel(1)})).toEqual([]);
 expect(campaignGuideTopics({level:await getCampaignLevel(4)}).map(t=>t.id)).toEqual(['crates']);
});
it('has help for every mechanic actually present in the released authored boards',async()=>{
 for(const seed of beta){
  const level=await getCampaignLevel(seed.id),topics=campaignGuideTopics({level});
  expect(topics.map(t=>t.id),`mission ${seed.id}`).toEqual(level.mechanics.map(m=>m.id));
  expect(topics.every(t=>t.body.length<350)).toBe(true);
 }
});
