import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition,createCampaignEngine} from '../../src/campaign/engine/turn';
import {campaignModules} from '../../src/campaign/mechanics/registry';
import {CampaignSession,createCampaignSave} from '../../src/session/campaignSession';
import {loadSave} from '../../src/session/storage';
import {MemoryStorage} from '../session/fixtures/legacy';
it.each([276,277,278,279,280])('lesson %i wins with its current but the same actual trace cannot win without its transport',id=>{
 const l=getAuthoredLessonLevel(id)!,disabled=createCampaignEngine(campaignModules.map(m=>m.id==='currents'?{...m,environment:()=>{}}:m));let s=loadCampaignLevel(l),off=loadCampaignLevel(l),shifts=0;
 for(const action of lessonTeachingActions[id]!){const r=transition(s,action);expect(r.accepted).toBe(true);shifts+=r.events.filter(e=>e.type==='current'&&e.phase==='shifted').length;s=r.state;off=disabled.transition(off,action).state;}
 expect(shifts).toBeGreaterThan(0);expect(s.status).toBe('won');expect(off.status).not.toBe('won');
});
it('saves and reloads a waiting cycle without changing the next whale/current decisions',()=>{
 const store=new MemoryStorage(),session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(280)!),store),actions=lessonTeachingActions[280]!;
 for(const action of actions.slice(0,2)){expect(session.dispatch(action)!.accepted).toBe(true);session.finishPresentation();}
 const reload=new CampaignSession(loadSave(store)!,store);reload.finishPresentation();
 for(const action of actions.slice(2)){expect(reload.dispatch(action)).toEqual(session.dispatch(action));session.finishPresentation();reload.finishPresentation();}
 if(reload.save.active.kind!=='campaign')throw Error();expect(reload.save.active.state.status).toBe('won');
});
