import { expect,it } from 'vitest';
import { solveCampaign } from '../../src/campaign/solver';
import { replayTrace } from '../../src/campaign/validator';
import { getAuthoredLessonLevel } from '../../src/campaign/lessons';
import { baseLevel } from './fixtures/base';
import { hashState } from '../../src/campaign/engine/hash';
import { loadCampaignLevel } from '../../src/campaign/engine/load';
import { transition } from '../../src/campaign/engine/turn';
import { parseCampaignState } from '../../src/campaign/schema';

const limits={maxNodes:3000,maxDepth:2,maxMilliseconds:15000};
it('solves the authored two-action rescue with a deterministic booster-free replay',()=>{
  const level=getAuthoredLessonLevel(2)!;
  const result=solveCampaign(level,limits);
  expect(result.status).toBe('solved');
  if(result.status!=='solved')throw new Error(result.status);
  expect(result.trace.actions).toHaveLength(2);
  expect(result.trace.actions.every(a=>a.type!=='booster')).toBe(true);
  expect(replayTrace(level,JSON.parse(JSON.stringify(result.trace)))).toEqual({won:true,issues:[]});
  expect(solveCampaign(level,limits)).toEqual(result);
},30000);

it('bounds a genuine looping carrier even though complete-state counters prevent cycle equality',()=>{
  const level=baseLevel();level.id=31;
  level.crew[0]!.at={r:0,c:0};level.crew[0]!.carrierId='rover';level.crew[0]!.rescueMoves=null;
  level.actors=[{id:'rover',kind:'rover',at:{r:0,c:0},routeId:'loop',routeIndex:0,passengerIds:['crew']}];
  level.mechanics=[{id:'rovers',actorIds:['rover']}];
  level.geometry.routes=[{id:'loop',loop:true,cells:[{r:0,c:0},{r:0,c:1},{r:1,c:1},{r:1,c:0}]}];
  const pod=level.pieces.find(p=>p.at.r===2&&p.at.c===0)!;
  level.pieces[level.pieces.indexOf(pod)]={id:pod.id,at:pod.at,kind:'pod',passengerIds:['pilot']};
  level.crew.push({id:'pilot',at:pod.at,status:'active',carrierId:pod.id,rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null});
  const station=structuredClone(level.pieces.find(p=>p.kind==='station')!);
  let state=loadCampaignLevel(level);const initial=hashState(state);
  for(let i=0;i<4;i++){
    const step=transition(state,{type:'swap',from:{r:2,c:i%2},to:{r:2,c:1-i%2}});
    expect(step.accepted,step.rejection).toBe(true);expect(step.state.pieces.find(p=>p.id===station.id)).toEqual(station);state=step.state;
  }
  expect(state.actors[0]!.at).toEqual({r:0,c:0});expect(state.status).toBe('playing');
  expect(hashState(state)).not.toBe(initial);
  expect(solveCampaign(level,{...limits,maxNodes:3,maxDepth:100})).toEqual({status:'timeout',explored:3});
});

it('treats every budget cutoff as unresolved and rejects unbounded limits',()=>{
  const level=getAuthoredLessonLevel(2)!;
  for(const budget of [{maxNodes:0},{maxDepth:0},{maxMilliseconds:0}])
    expect(solveCampaign(level,{...limits,...budget}).status).toBe('timeout');
  for(const budget of [{maxNodes:Infinity},{maxDepth:-1},{maxMilliseconds:NaN}])
    expect(()=>solveCampaign(level,{...limits,...budget})).toThrow(/limit/i);
});

it('fingerprints RNG and pending queue values after genuine state serialization',()=>{
  const state=parseCampaignState(JSON.parse(JSON.stringify(loadCampaignLevel(getAuthoredLessonLevel(2)!))));
  expect(hashState({...state,rngState:state.rngState+1})).not.toBe(hashState(state));
  expect(hashState({...state,pendingTransfers:[{crewId:state.crew[0]!.id,destinationId:'later'}]})).not.toBe(hashState(state));
});
