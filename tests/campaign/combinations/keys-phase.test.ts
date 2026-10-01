import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignState} from '../../../src/campaign/schema';
import {validatePhase} from '../../../src/campaign/mechanics/phase';

it('a key opens its permanent gate while a guest holds the phase passage until departure',()=>{
 const level=getAuthoredLessonLevel(805)!;
 expect(validatePhase(level)).toEqual([]);
 let state=loadCampaignLevel(level);
 const phases:string[]=[],keyEvents:string[]=[];
 for(const action of lessonTeachingActions[805]!){
  const result=transition(state,action);expect(result.accepted).toBe(true);
  phases.push(...result.events.filter(e=>e.type==='phase').map(e=>e.phase));
  keyEvents.push(...result.events.filter(e=>e.type==='key').map(e=>e.phase));
  state=parseCampaignState(JSON.parse(JSON.stringify(result.state)));
 }
 expect(phases).toEqual(['pending','closed']);
 expect(state.fixtures.find(f=>f.kind==='phase-door')).toMatchObject({open:false,closingPending:false});
 expect(keyEvents).toContain('opened');
 expect(state.status).toBe('won');
 expect(state.fixtures.find(f=>f.kind==='gate')).toMatchObject({open:true});
});
