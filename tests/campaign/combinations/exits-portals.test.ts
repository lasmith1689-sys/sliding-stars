import {expect,it} from 'vitest';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {parseCampaignState} from '../../../src/campaign/schema';
it('capsule waits for the unsourced remote exit, then transports its passenger before departure and final move expiry',()=>{
 const l=getAuthoredLessonLevel(380)!;l.moveLimit=2;let s=loadCampaignLevel(l);
 const first=transition(s,lessonTeachingActions[380]![0]!);s=first.state;
 expect(s.status).toBe('playing');expect(s.crew[0]).toMatchObject({status:'active',carrierId:'capsule-0',at:{r:1,c:0}});
 expect(first.events).toContainEqual(expect.objectContaining({type:'portal',phase:'waiting',pieceId:'capsule-0'}));
 const r=transition(parseCampaignState(JSON.parse(JSON.stringify(s))),lessonTeachingActions[380]![1]!);
 const moved=r.events.findIndex(e=>e.type==='portal'&&e.phase==='transferred'&&e.pieceId==='capsule-0'),departed=r.events.findIndex(e=>e.type==='remove'&&e.reason==='departure');
 expect(moved).toBeGreaterThan(-1);expect(moved).toBeLessThan(departed);expect(r.state.status).toBe('won');expect(r.state.movesRemaining).toBe(0);expect(r.state.crew[0]!.status).toBe('evacuated');
 expect(r.state.mechanics).toContainEqual({id:'exits',departedIds:['capsule-0']});expect(parseCampaignState(JSON.parse(JSON.stringify(r.state)))).toEqual(r.state);
});
