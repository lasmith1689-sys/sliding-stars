import { expect,it } from 'vitest';
import { validateCandidate,validateForRelease } from '../../src/campaign/validator';
import { solveCampaign } from '../../src/campaign/solver';
import { getAuthoredLessonLevel } from '../../src/campaign/lessons';
import { lessonSolutionTraces } from '../../src/campaign/content/lesson-solutions.dev';

it('never admits an unresolved candidate to release even if it is actually solvable',()=>{
  const level=getAuthoredLessonLevel(2)!;
  const result=solveCampaign(level,{maxNodes:0,maxDepth:2,maxMilliseconds:1000});
  expect(validateForRelease(level,result).map(i=>i.code)).toContain('unresolved');
  expect(validateForRelease(level,{status:'exhausted',explored:1}).map(i=>i.code)).toContain('unresolved');
  expect(validateForRelease(level,{status:'solved',trace:lessonSolutionTraces.find(t=>t.levelId===2)!})).toEqual([]);
});
it('composes existing reference and finite-source checks with engine refill coverage',()=>{
  const valid=getAuthoredLessonLevel(2)!;expect(validateCandidate(valid)).toEqual([]);
  const badId=structuredClone(valid);badId.goals[0]!.eligible={type:'ids',ids:['missing']};
  expect(validateCandidate(badId)[0]?.code).toBe('schema');
  const quota=structuredClone(valid);quota.goals[0]!.eligible={type:'sources',sourceIds:[quota.crew[0]!.id],target:99};
  expect(validateCandidate(quota)[0]?.message).toMatch(/finite/);
  const dry=structuredClone(valid);dry.geometry.refillSources=[];
  expect(validateCandidate(dry)[0]?.message).toMatch(/refill/);
});
it('rejects an off-board carrier route and validates the implemented relay before search',()=>{
  const route=getAuthoredLessonLevel(31)!;
  route.geometry.routes.push({id:'bad',loop:true,cells:[{r:999,c:0}]});
  expect(validateCandidate(route)[0]?.message).toMatch(/footprint/);
  const future=getAuthoredLessonLevel(2)!;future.id=841;future.chapter=17;
  future.geometry.endpoints.push({id:'future-home',kind:'station',at:{r:1,c:0},active:false});
  future.fixtures=[{id:'future-relay',kind:'relay',at:{r:0,c:1},order:1,active:false,endpointId:'future-home'}];
  future.mechanics=[{id:'relays',fixtureIds:['future-relay']}];
  expect(validateCandidate(future)).toEqual([]);
});
