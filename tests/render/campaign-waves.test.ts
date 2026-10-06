import {expect,it,vi} from 'vitest';
import {getAuthoredLessonLevel,campaignLessons} from '../../src/campaign/lessons';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {legalActions} from '../../src/campaign/engine/actions';
import {makeScene,applySceneEvents} from '../../src/render/campaign/snapshot';
import {parseCampaignEvents} from '../../src/campaign/schema';
import {futureWaveCopy} from '../../src/ui/campaignCoach';
import {CampaignAnimator} from '../../src/render/campaign/animator';
import {crewGroupLabel,waveVisualState} from '../../src/render/campaign/mechanics';
it.each([146,147,148,149,150])('provides real authored wave lesson %s and copy',id=>{
 const l=getAuthoredLessonLevel(id);expect(l).toBeDefined();expect(campaignLessons.find(l=>l.levelId===id)?.mechanicId).toBe('waves');
 expect(loadCampaignLevel(l!).status).toBe('playing');expect(l!.arrivals.length).toBeGreaterThan(0);
});
it('shows the most urgent independent need beside a compact stacked crew count',()=>{
 const l=getAuthoredLessonLevel(147)!,crew=l.arrivals[0]!.crew;crew[0]!.rescueMoves=20;crew[1]!.rescueMoves=null;crew[1]!.shelterStarted=true;crew[1]!.shelterMoves=4;
 expect(crewGroupLabel(crew)).toBe('2 crew · ⌂ 4');
});
it('shows the same waiting head in scene and HUD after a blocked wave turn',()=>{
 const s=loadCampaignLevel(getAuthoredLessonLevel(149)!);s.turn=2;s.crew.push({...s.arrivals[0]!.crew[0]!,id:'waiting-guest'});
 expect(waveVisualState(makeScene(s))).toBe('waiting');expect(futureWaveCopy(s)).toContain('Waiting');
});
it('makes the independent149 lesson wait after its first terrain match, then frees the queued guest for fixed-station delivery',()=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(149)!);const actions=lessonTeachingActions[149]!;
 const first=transition(s,actions[0]!);expect(first.accepted,first.rejection).toBe(true);s=first.state;
 expect(s.status).toBe('playing');expect(s.arrivals.map(a=>a.status)).toEqual(['admitted','pending']);expect(waveVisualState(makeScene(s))).toBe('waiting');expect(futureWaveCopy(s)).toContain('Waiting');
 let secondAdmission:ReturnType<typeof transition>|undefined;
 for(const action of actions.slice(1)){
  const result=transition(s,action);expect(result.accepted,result.rejection).toBe(true);
  if(result.events.some(event=>event.type==='arrival'&&event.arrivalId==='wave-b'))secondAdmission=result;
  s=result.state;expect(s.pieces.find(piece=>piece.id==='tile-3-3')).toMatchObject({kind:'station',at:{r:3,c:3}});
 }
 expect(secondAdmission).toBeDefined();expect(secondAdmission!.state.arrivals.map(a=>a.status)).toEqual(['admitted','admitted']);expect(secondAdmission!.state.status).toBe('playing');
 expect(secondAdmission!.state.crew[0]).toMatchObject({id:'wave-a-crew-0',at:{r:3,c:2},status:'housed'});
 expect(s.status).toBe('won');expect(s.crew).toHaveLength(2);expect(s.crew.every(crew=>crew.status==='housed'&&crew.at.r===3&&crew.at.c===2)).toBe(true);
});
it('projects queue advancement and arriving crew exactly from typed events, including turn bookkeeping',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(147)!),result=transition(state,legalActions(state)[0]!);
 expect(result.events).toContainEqual(expect.objectContaining({type:'turn',before:0,after:1}));
 expect(parseCampaignEvents(JSON.parse(JSON.stringify(result.events)))).toEqual(result.events);
 expect(applySceneEvents(makeScene(state),result.events)).toEqual(makeScene(result.state));
});
it('uses code-unit ordering in the one-based HUD and explains due blocked entries',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(149)!);state.turn=2;state.arrivals.reverse();state.crew.push({...state.arrivals[0]!.crew[0]!,id:'blocker'});
 expect(futureWaveCopy(state)).toContain('Waiting');expect(futureWaveCopy(state)).toContain('row 4, column 1');
});
it('animates arrival and reconstructs the same final scene with reduced motion',async()=>{
 vi.useFakeTimers();const state=loadCampaignLevel(getAuthoredLessonLevel(147)!),result=transition(state,legalActions(state)[0]!);let scene=makeScene(state),frames=0;
 const animator=new CampaignAnimator({get scene(){return scene;},sync(next){scene=next;},interpolate(_a,_b,_p,events){if(events.some(e=>e.type==='arrival'))frames++;}},()=>true);
 const played=animator.play(result.events,makeScene(result.state));await vi.runAllTimersAsync();await played;expect(frames).toBeGreaterThan(0);expect(scene).toEqual(makeScene(result.state));vi.useRealTimers();
});
