import {it,expect,vi} from 'vitest';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {CampaignAnimator,eventDuration} from '../../src/render/campaign/animator';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {lessonSolutionTraces} from '../../src/campaign/content/lesson-solutions.dev';
import {futureWaveCopy} from '../../src/ui/campaignCoach';
it('renders every foundation/mechanic winning event sequence to its canonical entity positions',()=>{
 for(const trace of lessonSolutionTraces){let state=loadCampaignLevel(getAuthoredLessonLevel(trace.levelId)!);let scene=makeScene(state);
  for(const action of trace.actions){const result=transition(state,action);expect(result.accepted).toBe(true);scene=applySceneEvents(scene,result.events);expect(scene.entityPositions).toEqual(makeScene(result.state).entityPositions);state=result.state;}
 }
});
it('cancels pending presentation, resolves it and cannot overwrite a newer scene',async()=>{
 vi.useFakeTimers();
 const state=loadCampaignLevel(getAuthoredLessonLevel(2)!);const result=transition(state,lessonSolutionTraces[1]!.actions[0]!);
 let rendered=makeScene(state);const target={get scene(){return rendered;},sync:(scene:typeof rendered)=>{rendered=scene;},interpolate:()=>{}};
 const animator=new CampaignAnimator(target,()=>false);const pending=animator.play(result.events,makeScene(result.state));animator.cancel();await pending;
 expect(rendered.entityPositions).toEqual(makeScene(result.state).entityPositions);
 const second=transition(result.state,lessonSolutionTraces[1]!.actions[1]!);const next=animator.play(second.events,makeScene(second.state));await vi.runAllTimersAsync();await next;
 expect(rendered.entityPositions).toEqual(makeScene(second.state).entityPositions);vi.useRealTimers();
});
it('uses brief accessible motion ranges',()=>{
 expect(eventDuration('swap',false)).toBe(160);expect(eventDuration('merge',false)).toBe(320);expect(eventDuration('transport',false)).toBe(240);expect(eventDuration('rescue',false)).toBe(500);expect(eventDuration('swap',true)).toBe(70);
});
it('previews only pending waves and distinguishes due arrivals without ticking the model',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(1)!);state.turn=5;
 state.arrivals=[{id:'later',turn:8,entry:{r:0,c:1},crew:[{...state.crew[0]!,id:'future'}],status:'pending'}];
 expect(futureWaveCopy(state)).toBe('Next wave: 1 crew · 3 moves · row 1, column 2');state.turn=9;expect(futureWaveCopy(state)).toContain('0 moves');expect(state.arrivals[0]!.status).toBe('pending');state.arrivals[0]!.status='admitted';expect(futureWaveCopy(state)).toBeNull();
});
