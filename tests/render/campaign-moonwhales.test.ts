import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {CampaignInput} from '../../src/input/campaign';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {applySceneEvents,makeScene} from '../../src/render/campaign/snapshot';
import {whaleVisualState,crewGroupLabel} from '../../src/render/campaign/mechanics';
it('keeps an urgent carried need ahead of the decorative riding label',()=>{
 const crew=loadCampaignLevel(getAuthoredLessonLevel(186)!).crew[0]!;expect(crewGroupLabel([crew],true)).toBe('RIDING');
 expect(crewGroupLabel([{...crew,shelterMoves:3,shelterStarted:true}],true)).toContain('3');expect(crewGroupLabel([{...crew,shelterMoves:3,shelterStarted:true}],true)).not.toContain('RIDING');
});
it('previews the real immediate hop and queued request without mutating play',()=>{
 for(const id of [186,187]){const s=loadCampaignLevel(getAuthoredLessonLevel(id)!),action=lessonTeachingActions[id]![0]!;if(action.type!=='swap')throw Error();const before=structuredClone(s),input=new CampaignInput(()=>s,()=>false,()=>{});input.start(action.from);expect(input.preview(action.to)?.message).toContain(id===186?'Safe whale hop':'Queue a whale hop');expect(s).toEqual(before);}
});
it.each([186,187,188,189,190])('lesson %s requires a real adjacent merge before exactly one continuous hop',id=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(id)!);let requested=false,hops=0;
 expect(s.actors.find(a=>a.kind==='moonwhale')).toMatchObject({transferRequested:false});
 for(const action of lessonTeachingActions[id]!){const result=transition(s,action);expect(result.accepted).toBe(true);
  for(const event of result.events){if(event.type==='actor'&&event.after?.kind==='moonwhale'&&event.after.transferRequested){expect(result.events.some(e=>e.type==='merge'&&e.sequenceId<event.sequenceId)).toBe(true);requested=true;}
   if(event.type==='transfer'&&event.fromCarrierId==='moonwhale'){expect(requested).toBe(true);hops++;expect(result.events.some(e=>e.type==='move'&&e.entityId===event.crewId&&e.timingGroup===event.timingGroup)).toBe(false);}}
  const projected=applySceneEvents(makeScene(s),result.events),actual=makeScene(result.state);expect(projected.entityPositions).toEqual(actual.entityPositions);expect(projected.pieces.map(p=>[p.id,'passengerIds'in p?p.passengerIds:[]]).sort()).toEqual(actual.pieces.map(p=>[p.id,'passengerIds'in p?p.passengerIds:[]]).sort());s=result.state;
 }
 expect(hops).toBe(1);expect(s.status).toBe('won');const whale=s.actors.find(a=>a.kind==='moonwhale')!;if(whale.kind!=='moonwhale')throw Error();expect(whaleVisualState(makeScene(s),whale)).toBe('complete');
});
