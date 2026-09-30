import {expect,it,vi} from 'vitest';
import {exitLevel,exitMove} from '../campaign/fixtures/exits';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {CampaignInput} from '../../src/input/campaign';
import {CampaignAnimator} from '../../src/render/campaign/animator';
import {exitVisualState} from '../../src/render/campaign/mechanics';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
it('reconstructs exit completion and passenger removal from departure events, including after reload',()=>{
 const state=loadCampaignLevel(exitLevel()),result=transition(state,exitMove),scene=applySceneEvents(makeScene(state),result.events);
 expect(scene).toEqual(makeScene(result.state));expect(scene.departedExitIds).toEqual(['exit-a']);
 expect(scene.entityPositions['capsule-a']).toBeUndefined();expect(scene.entityPositions['passenger']).toBeUndefined();
});
it('gives a passenger-free cargo departure a visible animation interval',async()=>{
 vi.useFakeTimers();
 const level=exitLevel();level.crew=[];const cargo=level.pieces[0]!;if(cargo.kind!=='cargo')throw Error();cargo.passengerIds=[];
 const state=loadCampaignLevel(level),result=transition(state,exitMove);let scene=makeScene(state),departureFrames=0;
 const animator=new CampaignAnimator({get scene(){return scene;},sync(next){scene=next;},interpolate(_from,_to,_p,events){if(events.some(e=>e.type==='remove'&&e.reason==='departure'))departureFrames++;}});
 const pending=animator.play(result.events,makeScene(result.state));await vi.runAllTimersAsync();await pending;
 expect(departureFrames).toBeGreaterThan(0);vi.useRealTimers();
});
it('maps amber waiting only to a real fixture blocking the cargo descent lane',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(115)!);expect(exitVisualState(makeScene(state),'exit-0')).toBe('waiting');
 state.fixtures=[];expect(exitVisualState(makeScene(state),'exit-0')).toBe('idle');
});
it('previews the actual departure endpoints through the shipped transition without mutating play',()=>{
 const state=loadCampaignLevel(exitLevel()),before=structuredClone(state),input=new CampaignInput(()=>state,()=>false,()=>{});
 input.start(exitMove.from);const preview=input.preview(exitMove.to);
 expect(preview?.departureExitIds).toEqual(['exit-a']);expect(preview?.message).toContain('Evacuate');expect(state).toEqual(before);
});
