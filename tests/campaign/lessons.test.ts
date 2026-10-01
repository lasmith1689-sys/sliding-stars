import { expect,it } from 'vitest';
import { authoredLessonLevels,campaignLessons,getAuthoredLessonLevel } from '../../src/campaign/lessons';
import { parseCampaignChapter,parseCampaignLevel,parseCampaignState } from '../../src/campaign/schema';
import { teachingAt } from '../../src/campaign/schedule';
import { lessonTeachingActions,lessonSolutionTraces } from '../../src/campaign/content/lesson-solutions.dev';
import { loadCampaignLevel } from '../../src/campaign/engine/load';
import { transition } from '../../src/campaign/engine/turn';
import { hashState } from '../../src/campaign/engine/hash';
import { legalActions } from '../../src/campaign/engine/actions';
import {eligibleIds} from '../../src/campaign/references';
const obstacleLessons=[16,17,18,19,20,56,57,58,59,60,81,82,83,84,85];
it.each(obstacleLessons)('lesson %s cannot rescue through the old two-slide bypass',id=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(id)!);
 for(const [from,to] of [[{r:3,c:3},{r:3,c:2}],[{r:3,c:2},{r:3,c:1}]]){
  const result=transition(state,{type:'swap',from:from!,to:to!});if(result.accepted)state=result.state;
 }
 expect(state.crew.every(c=>c.status==='active')).toBe(true);
});
it.each(obstacleLessons)('lesson %s has no station-slide rescue path while its taught fixture encloses the crew',id=>{
 const initial=loadCampaignLevel(getAuthoredLessonLevel(id)!);
 // These authored alcoves are a structural invariant for any number of turns:
 // the frozen crew cannot move/merge, and there is no playable station-door neighbor.
 for(const crew of initial.crew){
  expect(initial.fixtures.some(f=>(f.kind==='comet'?f.cells:[f.at]).some(p=>p.r===crew.at.r&&p.c===crew.at.c))).toBe(true);
  expect(initial.geometry.mask[crew.at.r]?.[crew.at.c-1]??false).toBe(false);
  expect(initial.geometry.mask[crew.at.r]?.[crew.at.c+1]??false).toBe(false);
 }
 let frontier=[initial];
 for(let depth=0;depth<3;depth++){
  const next:typeof frontier=[];
  for(const state of frontier)for(const action of legalActions(state)){
   const result=transition(state,action);
   for(const crew of initial.crew){
    const blocker=initial.fixtures.find(f=>(f.kind==='comet'?f.cells:[f.at]).some(p=>p.r===crew.at.r&&p.c===crew.at.c))!;
    if(result.state.fixtures.some(f=>f.id===blocker.id))expect(result.state.crew.find(c=>c.id===crew.id)).toMatchObject({at:crew.at,status:'active'});
   }
   if(result.events.some(e=>e.type==='merge'))continue;
   expect(result.state.crew.every(c=>c.status==='active')).toBe(true);
   if(result.state.status==='playing')next.push(result.state);
  }
  // Directed gestures can produce identical complete snapshots. Every transition above
  // is still asserted; explore each distinct future once at the following depth.
  frontier=[...new Map(next.map(state=>[hashState(state),state])).values()];
  if(process.env.TASK8_FRONTIER_COUNTS)console.info(`lesson ${id} depth ${depth+1}: ${next.length} paths -> ${frontier.length} complete states`);
 }
});
it('supplies exactly the authored foundations and twenty teaching sequences, separate from release chapters',()=>{
 expect(authoredLessonLevels.map(l=>l.id)).toEqual([1,2,3,4,5,6,7,8,16,17,18,19,20,31,32,33,34,35,56,57,58,59,60,81,82,83,84,85,111,112,113,114,115,146,147,148,149,150,186,187,188,189,190,231,232,233,234,235,276,277,278,279,280,326,327,328,329,330,376,377,378,379,380,426,427,428,429,430,471,472,473,474,475,516,517,518,519,520,561,562,563,564,565,611,612,613,614,615,661,662,663,664,665,711,712,713,714,715,756,757,758,759,760,801,802,803,804,805]);
 for(const level of authoredLessonLevels){expect(parseCampaignLevel(level)).toEqual(level);expect(campaignLessons.some(l=>l.id===level.lessonId&&l.levelId===level.id)).toBe(true);}
 expect(()=>parseCampaignChapter(authoredLessonLevels.filter(l=>l.chapter===1),1)).toThrow();
 expect(getAuthoredLessonLevel(9)).toBeUndefined();
 expect(getAuthoredLessonLevel(3)!.crew.some(c=>c.vipId==='botanist')).toBe(true);
});
it('consecutive authored lessons have different masks and each five-lesson sequence has five board shapes',()=>{
 for(let i=1;i<authoredLessonLevels.length;i++)expect(authoredLessonLevels[i]!.geometry.mask).not.toEqual(authoredLessonLevels[i-1]!.geometry.mask);
 for(const first of [4,16,31,56,81,111,146,186,231,276,326,376,426,471,516,561,611,661,711,756,801])expect(new Set(authoredLessonLevels.filter(l=>l.id>=first&&l.id<first+5).map(l=>JSON.stringify(l.geometry.mask))).size).toBe(5);
});
it('optional absent failure policy retains the same replay fingerprint after JSON omission',()=>{
 const decoded=loadCampaignLevel(getAuthoredLessonLevel(2)!);
 const omitted=structuredClone(decoded);delete omitted.level.metadata.failurePolicy;
 expect(hashState(decoded)).toBe(hashState(omitted));
 const saved:unknown=JSON.parse(JSON.stringify(decoded));
 expect(hashState(parseCampaignState(saved))).toBe(hashState(omitted));
});
it('intro demonstrations explicitly prevent failure; ordinary lessons still lose on an expired rescue need',()=>{
 const raw=getAuthoredLessonLevel(16)!;
 const level=parseCampaignLevel({...raw,metadata:{...raw.metadata,failurePolicy:'no-failure'}});
 let state=loadCampaignLevel(level);state.crew[0]!.rescueMoves=1;
 const station=state.pieces.find(p=>p.kind==='station')!;
 const slide={type:'swap' as const,from:station.at,to:{r:station.at.r-1,c:station.at.c}};
 for(let i=0;i<30;i++){
   const result=transition(state,slide);
   expect(result.accepted).toBe(true);state=result.state;
 }
 expect(state.status).toBe('playing');expect(state.crew[0]!.rescueMoves).toBe(1);
 const ordinaryLevel=getAuthoredLessonLevel(16)!;ordinaryLevel.id=17;delete ordinaryLevel.metadata.failurePolicy;
 const ordinary=loadCampaignLevel(ordinaryLevel);ordinary.crew[0]!.rescueMoves=1;
 expect(transition(ordinary,slide).state.status).toBe('lost');
 expect(()=>parseCampaignLevel({...level,id:17})).toThrow(/demonstration/);
 expect(()=>parseCampaignLevel({...level,moveLimit:5})).toThrow(/moveLimit/);
});
it.each(authoredLessonLevels)('level $id wins by its committed booster-free teaching actions and clears its lesson fixtures',level=>{
 if(teachingAt(level.id)?.stage==='demonstration')expect(level.metadata.failurePolicy).toBe('no-failure');
 let state=loadCampaignLevel(level);expect(state.status).toBe('playing');
 const trace=lessonSolutionTraces.find(t=>t.levelId===level.id)!;
 expect(hashState(state)).toBe(trace.initialHash);
 expect(state.fixtures.filter(f=>f.kind!=='jelly')).toEqual(level.fixtures.filter(f=>f.kind!=='jelly'));
 for(const fixture of state.fixtures.filter(f=>f.kind==='jelly')){const authored=level.fixtures.find(f=>f.id===fixture.id);expect(fixture.coatedCells).toEqual(authored?.kind==='jelly'?authored.coatedCells:undefined);}
 // Initial safety may board guests already standing on a pod; no piece may move or change kind.
 expect(state.pieces).toEqual(level.pieces.map(p=>p.kind==='pod'?{...p,passengerIds:level.crew.filter(c=>c.status==='active'&&c.at.r===p.at.r&&c.at.c===p.at.c&&(c.carrierId===null||c.carrierId===p.id)).map(c=>c.id)}:p));
 for(const pod of state.pieces)if(pod.kind==='pod')for(const id of pod.passengerIds)expect(state.crew.find(c=>c.id===id)).toMatchObject({carrierId:pod.id,at:pod.at,status:'active'});
 const actions=lessonTeachingActions[level.id]!;expect(actions.length).toBeGreaterThan(0);
 const blockers=new Map(level.crew.map(c=>[c.id,level.fixtures.find(f=>['crate','ice','reactor','comet'].includes(f.kind)&&(f.kind==='comet'?f.cells:[f.at]).some(p=>p.r===c.at.r&&p.c===c.at.c))?.id]));
 const released=new Set<string>();
 for(const action of actions){
  expect(action.type).not.toBe('booster');const result=transition(state,action);expect(result.accepted).toBe(true);
  for(const event of result.events){
   if(event.type==='fixture'&&event.after===null)released.add(event.fixtureId);
   const crewId=event.type==='move'?event.entityId:event.type==='crew'&&event.after?.status==='housed'?event.crewId:undefined;
   if(crewId&&blockers.get(crewId))expect(released.has(blockers.get(crewId)!)).toBe(true);
  }
  state=result.state;
 }
 expect(state.status).toBe('won');expect(state.fixtures.filter(f=>f.kind!=='jelly')).toEqual(level.fixtures.filter(f=>f.kind==='portal'||f.kind==='bridge'||f.kind==='garden'||f.kind==='gate'||f.kind==='lock'||f.kind==='gravity-switch'||f.kind==='solar'||f.kind==='phase-door').map(f=>f.kind==='bridge'?{...f,hits:2,active:true}:f.kind==='garden'?{...f,stage:3}:f.kind==='gate'?{...f,open:true}:f.kind==='gravity-switch'?{...f,direction:state.mechanics.find(m=>m.id==='gravity')!.flippedIds.includes(f.id)?f.direction==='down'?'left':'down':f.direction}:f.kind==='solar'?{...f,charge:f.quota}:f.kind==='phase-door'?{...f,open:![802,804,805].includes(level.id),closingPending:[801,803].includes(level.id)}:f));
 for(const fixture of state.fixtures.filter(f=>f.kind==='jelly')){
  expect(level.fixtures.some(f=>f.id===fixture.id&&f.kind==='jelly')).toBe(true);
  if(fixture.preview)expect(state.pieces.some(p=>p.kind==='tile'&&p.at.r===fixture.preview!.r&&p.at.c===fixture.preview!.c)).toBe(true);
 }
 for(const goal of level.goals)if(goal.type==='homeCrew'||goal.type==='evacuate')for(const id of eligibleIds(goal,level))expect(state.crew.find(c=>c.id===id)?.status).toBe(goal.type==='homeCrew'?'housed':'evacuated');
 expect(hashState(state)).toBe(trace.finalHash);
 let replay=loadCampaignLevel(level);for(const action of actions)replay=transition(replay,action).state;
 expect(hashState(replay)).toBe(hashState(state));
});
