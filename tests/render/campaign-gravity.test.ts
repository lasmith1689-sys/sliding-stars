import {expect,it,vi} from 'vitest';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {CampaignInput} from '../../src/input/campaign';
import {CampaignAnimator} from '../../src/render/campaign/animator';
import {makeScene} from '../../src/render/campaign/snapshot';
import {transition} from '../../src/campaign/engine/turn';
import {parseCampaignState} from '../../src/campaign/schema';
import {gravityCoachCopy} from '../../src/ui/campaignCoach';
it('previews the next direction while the saved board still describes current gravity',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(611)!),input=new CampaignInput(()=>state,()=>false,()=>{}),action=lessonTeachingActions[611]![0]!;
 if(action.type!=='swap')throw Error('swap');input.start(action.from);expect(input.preview(action.to)?.message).toContain('Gravity next: LEFT · refill from RIGHT');expect(state.fixtures[0]).toMatchObject({direction:'down'});
 expect(gravityCoachCopy(loadCampaignLevel(getAuthoredLessonLevel(614)!))).toContain('Gravity NOW: LEFT');
});
it.each([false,true])('interrupted/reduced=%s presentation restores final topology and arrows once',async reduced=>{
 vi.useFakeTimers();const state=loadCampaignLevel(getAuthoredLessonLevel(612)!),result=transition(state,lessonTeachingActions[612]![0]!);let scene=makeScene(state);
 const animator=new CampaignAnimator({get scene(){return scene;},sync:s=>{scene=s;},interpolate:()=>{}},()=>reduced);
 const play=animator.play(result.events,makeScene(result.state));await vi.advanceTimersByTimeAsync(200);animator.cancel();await play;
 expect(scene.fixtures).toEqual(makeScene(result.state).fixtures);expect(scene.geometry).toEqual(result.state.geometry);expect(scene.fixtures[0]).toMatchObject({direction:'left'});
 const saved=parseCampaignState(JSON.parse(JSON.stringify(result.state)));expect(saved.mechanics.find(m=>m.id==='gravity')!.toggleCount).toBe(1);expect(transition(saved,lessonTeachingActions[612]![1]!)).toEqual(transition(result.state,lessonTeachingActions[612]![1]!));vi.useRealTimers();
});
