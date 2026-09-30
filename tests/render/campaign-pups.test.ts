import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {CampaignInput} from '../../src/input/campaign';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {applySceneEvents,makeScene} from '../../src/render/campaign/snapshot';
import {pupVisualState,pupSceneStep} from '../../src/render/campaign/mechanics';
import {pupCoachCopy} from '../../src/ui/campaignCoach';
it('previews a real safe paw step without modifying authoritative play',()=>{
 const s=loadCampaignLevel(getAuthoredLessonLevel(231)!),a=lessonTeachingActions[231]![0]!;if(a.type!=='swap')throw Error();const before=structuredClone(s),input=new CampaignInput(()=>s,()=>false,()=>{});input.start(a.from);expect(input.preview(a.to)?.message).toContain('One safe paw step');expect(s).toEqual(before);expect(pupCoachCopy(s)).toContain('DOWN');
});
it('waiting feedback uses an explicit route decision and text rather than a face alone',()=>{
 const s=loadCampaignLevel(getAuthoredLessonLevel(231)!),pup=s.actors[0]!;if(pup.kind!=='pup')throw Error();for(const p of s.pieces)if(p.kind==='tile'&&p.at.r===2&&p.at.c===1)p.tier=3;
 expect(pupSceneStep(makeScene(s),pup)).toBeNull();expect(pupVisualState(makeScene(s),pup)).toBe('waiting');expect(pupCoachCopy(s)).toContain('Pup waiting');
});
it.each([231,232,233,234,235])('lesson %s projects each real step, waiting state and persistent happy nursery',id=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(id)!);let arrivals=0;
 for(const a of lessonTeachingActions[id]!){const r=transition(s,a);expect(r.accepted).toBe(true);const projected=applySceneEvents(makeScene(s),r.events),actual=makeScene(r.state);expect(projected.entityPositions).toEqual(actual.entityPositions);expect(projected.arrivedNurseryIds).toEqual(actual.arrivedNurseryIds);expect(r.events.filter(e=>e.type==='move'&&e.entityId==='pup-0').length).toBeLessThanOrEqual(1);arrivals+=r.events.filter(e=>e.type==='actor'&&e.before?.kind==='pup'&&e.after===null).length;s=r.state;}
 expect(arrivals).toBe(1);expect(makeScene(s).arrivedNurseryIds).toEqual(['nursery-0']);expect(pupCoachCopy(s)).toContain('Happy paws');
});
