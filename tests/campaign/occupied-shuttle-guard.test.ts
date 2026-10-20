import {expect,it} from 'vitest';
import {baseLevel,baseState} from './fixtures/base';
import {legalActions} from '../../src/campaign/engine/actions';
import {transition} from '../../src/campaign/engine/turn';
import {parseCampaignState} from '../../src/campaign/schema';
import type {CampaignCrew,CampaignState} from '../../src/campaign/types';
import type {Pos,Tier} from '../../src/core/types';

// The occupied-shuttle guard: a shuttle already carrying a passenger never
// boards a second guest through a matching swap. Exercised via transition().
type Cell=Tier|'S'|'P'|null;
const guest=(id:string,at:Pos,extra:Partial<CampaignCrew>={}):CampaignCrew=>({id,at:{...at},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null,...extra});
/** Board with a shuttle at `pod` already carrying `rider`, and an unowned guest `crew` at `guestAt`. */
function occupied(grid:Cell[][],pod:Pos,guestAt:Pos):CampaignState {
 const level=baseLevel(grid);level.crew[0]!.at={...guestAt};
 const podId=`piece-${pod.r}-${pod.c}`,piece=level.pieces.find(p=>p.id===podId);
 if(piece?.kind!=='pod')throw Error('fixture: expected shuttle');
 piece.passengerIds=['rider'];level.crew.push(guest('rider',pod,{carrierId:podId}));
 level.goals=[{id:'home',type:'homeCrew',eligible:{type:'ids',ids:['crew','rider']}}];
 return baseState(level);
}
const same=(a:Pos,b:Pos)=>a.r===b.r&&a.c===b.c;

it('the occupied-shuttle fixture is a valid state and the matching slide is legal',()=>{
 const state=occupied([[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']],{r:0,c:2},{r:0,c:3});
 expect(parseCampaignState(JSON.parse(JSON.stringify(state)))).toEqual(state);
 expect(legalActions(state).some(a=>a.type==='swap'&&[a.from,a.to].some(p=>same(p,{r:0,c:2}))&&[a.from,a.to].some(p=>same(p,{r:0,c:3})))).toBe(true);
});

it.each([false,true])('a shuttle carrying a passenger never boards the guest on the displaced tile (reverse=%s)',reverse=>{
 const state=occupied([[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']],{r:0,c:2},{r:0,c:3}),original=structuredClone(state);
 const a={r:0,c:2},b={r:0,c:3};
 const result=transition(state,{type:'swap',from:reverse?b:a,to:reverse?a:b});
 expect(result.accepted).toBe(true);
 const pod=result.state.pieces.find(p=>p.id==='piece-0-2')!;
 expect(pod).toMatchObject({kind:'pod',passengerIds:['rider']});
 expect(result.state.crew.find(c=>c.id==='rider')).toMatchObject({carrierId:'piece-0-2',at:pod.at});
 expect(result.state.crew.find(c=>c.id==='crew')!.carrierId).not.toBe('piece-0-2');
 expect(result.events.some(e=>e.type==='transfer'&&e.crewId==='crew'&&e.toCarrierId==='piece-0-2')).toBe(false);
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
 expect(state).toEqual(original);
});

it('a corner shuttle carrying a passenger ignores the guest in a vertical-match slide',()=>{
 const state=occupied([[2,3,1,'P'],[3,2,3,1],[2,3,2,1],[3,2,'S',2]],{r:0,c:3},{r:0,c:2});
 const result=transition(state,{type:'swap',from:{r:0,c:3},to:{r:0,c:2}});
 expect(result.accepted).toBe(true);
 expect(result.state.pieces.find(p=>p.id==='piece-0-3')).toMatchObject({kind:'pod',passengerIds:['rider']});
 expect(result.state.crew.find(c=>c.id==='crew')!.carrierId).not.toBe('piece-0-3');
});

it('every accepted slide of an occupied shuttle with a guest on the other tile never boards the guest',()=>{
 const boards:{grid:Cell[][];pod:Pos;crew:Pos}[]=[
  {grid:[[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']],pod:{r:0,c:2},crew:{r:0,c:3}},
  {grid:[[2,3,1,'P'],[3,2,3,1],[2,3,2,1],[3,2,'S',2]],pod:{r:0,c:3},crew:{r:0,c:2}},
  {grid:[[2,1,3,2],['P',2,1,3],[1,3,2,1],[1,2,3,'S']],pod:{r:1,c:0},crew:{r:1,c:1}},
  {grid:[[3,2,3,2],[2,3,1,3],[1,'P',2,1],[3,1,'S',2]],pod:{r:2,c:1},crew:{r:3,c:1}},
 ];
 let probed=0;
 for(const board of boards){
  const state=occupied(board.grid,board.pod,board.crew),podId=`piece-${board.pod.r}-${board.pod.c}`;
  for(const action of legalActions(state)){
   if(action.type!=='swap'||![action.from,action.to].some(p=>same(p,board.pod))||![action.from,action.to].some(p=>same(p,board.crew)))continue;
   const result=transition(state,action);expect(result.accepted).toBe(true);probed++;
   // The rider may legitimately be delivered later in the turn; the guest must never board.
   const pod=result.state.pieces.find(p=>p.id===podId);
   if(pod?.kind==='pod')expect(pod.passengerIds).not.toContain('crew');
   expect(result.state.crew.find(c=>c.id==='crew')!.carrierId).not.toBe(podId);
   expect(result.events.some(e=>e.type==='transfer'&&e.crewId==='crew'&&e.toCarrierId===podId)).toBe(false);
  }
 }
 expect(probed).toBeGreaterThanOrEqual(2);
});
