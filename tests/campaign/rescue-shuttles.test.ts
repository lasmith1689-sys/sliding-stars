import {it,expect} from 'vitest';
import {baseLevel,baseState} from './fixtures/base';
import {isLegalSwap} from '../../src/campaign/engine/actions';
import {transition} from '../../src/campaign/engine/turn';

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
