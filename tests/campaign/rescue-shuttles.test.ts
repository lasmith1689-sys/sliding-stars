import {it,expect} from 'vitest';
import {baseLevel,baseState} from './fixtures/base';
import {isLegalSwap} from '../../src/campaign/engine/actions';
import {transition} from '../../src/campaign/engine/turn';
import {parseCampaignState} from '../../src/campaign/schema';
import {applySceneEvents,makeScene} from '../../src/render/campaign/snapshot';

it('rejects empty-shuttle free swaps in both directions without spending a move',()=>{
 const state=baseState(baseLevel([[1,2,1,3],[2,1,3,2],[3,2,1,3],[1,3,'P',2]]));
 for(const [from,to] of [[{r:3,c:2},{r:3,c:3}],[{r:3,c:3},{r:3,c:2}]]){
  const result=transition(state,{type:'swap',from:from!,to:to!});
  expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
 }
});
it('allows an empty shuttle swap when displaced terrain actually makes a match',()=>{
 const state=baseState(baseLevel([[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']]));
 expect(isLegalSwap(state,{r:0,c:2},{r:0,c:3})).toBe(true);
 expect(transition(state,{type:'swap',from:{r:0,c:2},to:{r:0,c:3}}).events.some(e=>e.type==='merge')).toBe(true);
});
it('lets a occupied shuttle carry its guest into a station entrance',()=>{
 const state=baseState(baseLevel([[1,2,1,3],[2,1,3,2],[3,2,1,3],[1,'P',2,'S']]));
 const pod=state.pieces.find(p=>p.kind==='pod')!;if(pod.kind!=='pod')throw Error('fixture');
 pod.passengerIds=['crew'];Object.assign(state.crew[0]!,{at:{...pod.at},carrierId:pod.id,rescueMoves:null});
 const result=transition(state,{type:'swap',from:{r:3,c:1},to:{r:3,c:2}});
 expect(result.accepted).toBe(true);expect(result.state.crew[0]!.status).toBe('housed');expect(result.state.status).toBe('won');
});
it('does not give an empty shuttle free flight by swapping with a station',()=>{
 const state=baseState(baseLevel([[1,2,1,3],[2,1,3,2],[3,2,1,3],[1,2,'P','S']]));
 expect(isLegalSwap(state,{r:3,c:2},{r:3,c:3})).toBe(false);
});

for(const reverse of [false,true])it(`a matching shuttle slide picks up the guest on the displaced terrain (${reverse?'tile first':'shuttle first'})`,()=>{
 const level=baseLevel([[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']]);
 level.crew[0]!.at={r:0,c:3};
 const state=baseState(level),original=structuredClone(state),pod=state.pieces.find(p=>p.kind==='pod')!;
 const from={r:0,c:reverse?3:2},to={r:0,c:reverse?2:3};
 const result=transition(state,{type:'swap',from,to});
 expect(result.accepted).toBe(true);expect(result.state.turn).toBe(1);
 expect(result.state.pieces.find(p=>p.id===pod.id)).toMatchObject({kind:'pod',passengerIds:['crew'],at:{r:0,c:3}});
 expect(result.state.crew[0]).toMatchObject({at:{r:0,c:3},carrierId:pod.id,status:'active',rescueMoves:null});
 expect(result.events.some(e=>e.type==='merge')).toBe(true);
 expect(result.events.find(e=>e.type==='transfer'&&e.crewId==='crew')).toMatchObject({toCarrierId:pod.id,timingGroup:result.events[0]!.timingGroup});
 expect(applySceneEvents(makeScene(state),result.events)).toEqual(makeScene(result.state));
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
 expect(state).toEqual(original);
});

it('crew beside an empty shuttle do not authorize a nonmatching pickup',()=>{
 const level=baseLevel([[1,2,'P',3],[2,3,2,1],[3,2,3,2],[1,3,2,'S']]);
 level.crew[0]!.at={r:0,c:3};const state=baseState(level);
 for(const [from,to] of [[{r:0,c:2},{r:0,c:3}],[{r:0,c:3},{r:0,c:2}]]){
  const result=transition(state,{type:'swap',from:from!,to:to!});
  expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
 }
});

it('the newly loaded shuttle can fly to a fixed station entrance and rescue its exact guest',()=>{
 const level=baseLevel([[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']]);
 level.crew[0]!.at={r:0,c:3};let state=baseState(level);
 const station=structuredClone(state.pieces.find(p=>p.kind==='station'));
 const route=[[[0,2],[0,3]],[[0,3],[1,3]],[[1,3],[2,3]],[[2,3],[2,2]],[[2,2],[3,2]]] as const;
 for(const [[r,c],[toR,toC]] of route){
  const result=transition(state,{type:'swap',from:{r,c},to:{r:toR,c:toC}});
  expect(result.accepted).toBe(true);state=result.state;
  expect(state.pieces.find(p=>p.kind==='station'&&p.id===station!.id)).toEqual(station);
 }
 expect(state.status).toBe('won');expect(state.turn).toBe(5);
 expect(state.crew[0]).toMatchObject({status:'housed',carrierId:null});
});

it('an occupied shuttle keeps its existing passenger instead of collecting another tile rider',()=>{
 const level=baseLevel([[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']]);
 const pod=level.pieces.find(p=>p.kind==='pod')!;if(pod.kind!=='pod')throw Error('fixture');
 level.crew[0]!.at={r:0,c:3};pod.passengerIds=['pilot'];
 level.crew.push({...level.crew[0]!,id:'pilot',at:{...pod.at},carrierId:pod.id,rescueMoves:null});
 const result=transition(baseState(level),{type:'swap',from:{r:0,c:2},to:{r:0,c:3}});
 expect(result.accepted).toBe(true);
 expect(result.state.pieces.find(p=>p.id===pod.id)).toMatchObject({passengerIds:['pilot']});
 expect(result.state.crew.find(c=>c.id==='crew')!.carrierId).toBeNull();
});
