import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignState} from '../../../src/campaign/schema';

it('the reactor fuse and collector charges share real merge turns without duplicate restoration or losing the entrance',()=>{
 const level=getAuthoredLessonLevel(665)!;
 let state=loadCampaignLevel(level),reactorTouched=false,solarCharged=false;
 for(const action of lessonTeachingActions[665]!){
  const result=transition(state,action);expect(result.accepted).toBe(true);
  const merges=result.events.filter(e=>e.type==='merge');
  const reactor=result.events.filter(e=>e.type==='fixture'&&e.fixtureId==='solar-reactor');
  const solar=result.events.filter(e=>e.type==='solar');
  if(reactor.some(e=>e.type==='fixture'&&(e.after===null||e.after?.kind==='reactor'&&e.after.hp<1)))reactorTouched=true;
  if(solar.length)solarCharged=true;
  expect(solar.every(e=>merges.some(m=>m.mergeId===e.mergeId))).toBe(true);
  expect(result.events.filter(e=>e.type==='solar'&&e.phase==='activated')).toHaveLength(solar.some(e=>e.phase==='activated')?1:0);
  state=parseCampaignState(JSON.parse(JSON.stringify(result.state)));
 }
 expect(reactorTouched).toBe(true);expect(solarCharged).toBe(true);
 expect(state.status).toBe('won');
 expect(state.fixtures.find(f=>f.kind==='solar')).toMatchObject({charge:2});
 expect(state.geometry.endpoints.find(e=>e.id==='solar-home')?.active).toBe(true);
 expect(state.goalProgress.find(g=>g.goalId==='restore')?.completedIds).toEqual(['solar-0']);
});
