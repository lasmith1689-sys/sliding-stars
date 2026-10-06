import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {parseCampaignState} from '../../../src/campaign/schema';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
it('rover waits at an inactive future route cell, then enters only after activation and refill',()=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(430)!);expect(parseCampaignState(s)).toEqual(s);
 const station=structuredClone(s.pieces.find(p=>p.kind==='station')!),first=transition(s,lessonTeachingActions[430]![0]!);expect(first.accepted,first.rejection).toBe(true);s=first.state;expect(s.fixtures[0]).toMatchObject({active:false,hits:1});expect(s.actors[0]!.at).toEqual({r:3,c:0});
 const restored=parseCampaignState(JSON.parse(JSON.stringify(s))),second=transition(restored,lessonTeachingActions[430]![1]!);expect(second.accepted,second.rejection).toBe(true);expect(second).toEqual(transition(s,lessonTeachingActions[430]![1]!));
 expect(second.state.actors[0]!.at).toEqual({r:3,c:1});expect(second.state.crew[0]).toMatchObject({at:{r:3,c:1},carrierId:'rover'});
 const opening=second.events.find(e=>e.type==='geometry')!,moving=second.events.find(e=>e.type==='move'&&e.entityId==='rover')!;
 expect(opening.sequenceId).toBeLessThan(moving.sequenceId);expect(second.events.some(e=>((e.type==='spawn'&&e.piece.at.r===3&&e.piece.at.c===1)||(e.type==='move'&&e.to.r===3&&e.to.c===1&&e.entityId!=='rover'))&&e.sequenceId<moving.sequenceId)).toBe(true);
 s=parseCampaignState(second.state);for(const action of lessonTeachingActions[430]!.slice(2)){const next=transition(s,action);expect(next.accepted,next.rejection).toBe(true);s=next.state;}expect(s.status).toBe('won');expect(s.crew[0]!.status).toBe('housed');expect(s.actors).toEqual([]);expect(s.pieces.find(p=>p.id===station.id)).toEqual(station);
});
