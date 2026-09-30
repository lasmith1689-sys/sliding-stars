import {expect,it} from 'vitest';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {parseCampaignState,parseCampaignLevel} from '../../../src/campaign/schema';
it('the authored familiar match cools a reactor and distracts its neighboring drone before either scheduled clock',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(330)!),r=transition(state,{type:'swap',from:{r:1,c:3},to:{r:2,c:3}});
 expect(r.accepted).toBe(true);expect(r.state.fixtures.some(f=>f.id==='cool-reactor')).toBe(false);expect(r.events).toContainEqual(expect.objectContaining({type:'pirate',phase:'distracted'}));
 const cooled=r.events.findIndex(e=>e.type==='fixture'&&e.fixtureId==='cool-reactor'&&e.after===null),distracted=r.events.findIndex(e=>e.type==='pirate'&&e.phase==='distracted'),stepped=r.events.findIndex(e=>e.type==='move'&&e.entityId==='pirate-0');expect(cooled).toBeLessThan(stepped);expect(distracted).toBeLessThan(stepped);
 const saved=parseCampaignState(JSON.parse(JSON.stringify(r.state)));expect(transition(saved,lessonTeachingActions[330]![1]!)).toEqual(transition(r.state,lessonTeachingActions[330]![1]!));
});
it('rejects a portal receiver overlapping the pirate route',()=>{const l=getAuthoredLessonLevel(330)!;l.id=376;l.chapter=8;l.geometry.gravitySegments=l.geometry.gravitySegments.filter(s=>s.id!=='column-4-0');l.geometry.refillSources=l.geometry.refillSources.filter(s=>s.segmentId!=='column-4-0');l.fixtures.push({id:'portal',kind:'portal',at:{r:0,c:0},receiver:{r:3,c:4},segmentId:'column-0-0'});l.mechanics.push({id:'portals',fixtureIds:['portal']});expect(()=>parseCampaignLevel(l)).toThrow(/Portals cannot overlap/);});
