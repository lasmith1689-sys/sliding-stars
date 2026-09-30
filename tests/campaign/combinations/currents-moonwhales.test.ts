import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignState} from '../../../src/campaign/schema';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {makeScene,applySceneEvents} from '../../../src/render/campaign/snapshot';
it('the shipped pairing moves actors first, prepares the actual landing, then waits atomically for the player station',()=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(280)!);const first=transition(s,lessonTeachingActions[280]![0]!);
 const actor=first.events.findIndex(e=>e.type==='move'&&e.entityId==='moonwhale'),current=first.events.findIndex(e=>e.type==='current');expect(actor).toBeGreaterThan(-1);expect(current).toBeGreaterThan(actor);
 expect(first.state.crew[0]).toMatchObject({carrierId:'moonwhale',at:{r:1,c:1}});expect(first.state.pieces.find(p=>p.at.r===2&&p.at.c===0)).toMatchObject({tier:4});
 s=first.state;for(const action of lessonTeachingActions[280]!.slice(1)){const r=transition(s,action);s=r.state;expect(parseCampaignState(JSON.parse(JSON.stringify(s)))).toEqual(s);}
 expect(s.status).toBe('won');expect(s.crew[0]!.status).toBe('housed');expect(s.mechanics).toContainEqual({id:'moonwhales',transferredIds:['whale-guest']});
});
it.each(['tile','pod'] as const)('a newly transferred %s passenger joins the same-turn current after the whale steps',kind=>{
 const l=getAuthoredLessonLevel(280)!;l.pieces=l.pieces.map(p=>p.at.r===2&&p.at.c===0?kind==='tile'?{id:p.id,at:p.at,kind:'tile',tier:4}:{id:p.id,at:p.at,kind:'pod',passengerIds:[]}:p);
 const s=loadCampaignLevel(l),whale=s.actors.find(a=>a.kind==='moonwhale')!;if(whale.kind!=='moonwhale')throw Error();whale.transferRequested=true;
 const r=transition(s,lessonTeachingActions[280]![0]!),hop=r.events.findIndex(e=>e.type==='transfer'),step=r.events.findIndex(e=>e.type==='move'&&e.entityId==='moonwhale'),shift=r.events.find(e=>e.type==='current'&&e.phase==='shifted')!;
 expect(hop).toBeGreaterThan(-1);expect(step).toBeGreaterThan(hop);expect(shift.sequenceId).toBeGreaterThan(step);
 expect(r.events).toContainEqual(expect.objectContaining({type:'move',entityId:'whale-guest',from:{r:2,c:0},to:{r:2,c:1},timingGroup:shift.timingGroup}));
 expect(r.state.crew[0]!.status).toBe('housed');expect(r.state.actors.find(a=>a.kind==='moonwhale')).toMatchObject({passengerIds:[],at:{r:1,c:1}});
 const scene=applySceneEvents(makeScene(s),r.events),final=makeScene(r.state);expect(scene.crew).toEqual(final.crew);expect(scene.pieces.slice().sort((a,b)=>a.id.localeCompare(b.id))).toEqual(final.pieces.slice().sort((a,b)=>a.id.localeCompare(b.id)));expect(scene.arrivedNurseryIds).toEqual(final.arrivedNurseryIds);
});
