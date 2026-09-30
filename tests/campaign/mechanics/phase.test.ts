import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {legalActions} from '../../../src/campaign/engine/actions';
import {transition} from '../../../src/campaign/engine/turn';
import {gravitySegments} from '../../../src/campaign/engine/geometry';
import {hashState} from '../../../src/campaign/engine/hash';
import {parseCampaignState} from '../../../src/campaign/schema';
import {createContext} from '../../../src/campaign/engine/context';
import {phase,phasePassageOccupied} from '../../../src/campaign/mechanics/phase';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import type {CampaignLevel,CampaignState} from '../../../src/campaign/types';

function phaseLevel():CampaignLevel {
 const level=getAuthoredLessonLevel(2)!;
 level.id=801;level.chapter=17;level.lessonId=null;delete level.metadata.failurePolicy;
 level.fixtures.push({id:'phase-door',kind:'phase-door',at:{r:2,c:1},open:true,closingPending:false});
 level.mechanics.push({id:'phase',fixtureIds:['phase-door']});
 return level;
}
function door(state:CampaignState){return state.fixtures.find(f=>f.id==='phase-door') as Extract<CampaignState['fixtures'][number],{kind:'phase-door'}>;}
function ordinaryTurn(state:CampaignState,usable:(next:CampaignState)=>boolean=()=>true){
 for(const action of legalActions(state)){
  const result=transition(state,action);
  if(result.accepted&&result.state.status==='playing'&&usable(result.state))return result;
 }
 throw new Error('Expected an accepted ordinary action');
}

it('closes a sourced middle door over ordinary supporting terrain, then opens next turn',()=>{
 let state=loadCampaignLevel(phaseLevel());
 const tile=state.pieces.find(p=>p.kind==='tile'&&p.at.r===2&&p.at.c===1)!;
 const first=ordinaryTurn(state,next=>JSON.stringify(next.pieces.find(p=>p.id===tile.id))===JSON.stringify(tile));state=first.state;
 expect(door(state)).toMatchObject({open:false,closingPending:false});
 expect(state.pieces.find(p=>p.id===tile.id)).toEqual(tile);
 expect(state.geometry.inactiveCells).toEqual([]);
 expect(gravitySegments(state).filter(run=>run.segmentId==='column-1-0').length).toBe(2);
 expect(first.events.some(e=>e.type==='phase'&&e.phase==='closed')).toBe(true);
 const before=hashState(state),downstream=state.pieces.find(p=>p.kind==='tile'&&p.at.r===3&&p.at.c===1)!;
 const refill=transition(state,{type:'booster',kind:'demo',at:downstream.at});
 expect(refill.accepted).toBe(true);
 expect(refill.events.some(e=>e.type==='spawn'&&e.piece.at.r===3&&e.piece.at.c===1)).toBe(true);
 expect(refill.state.pieces.find(p=>p.id===tile.id)).toEqual(tile);
 expect(refill.state.pieces.some(p=>p.at.r===3&&p.at.c===1)).toBe(true);
 expect(refill.state.turn).toBe(state.turn);
 expect(door(refill.state)).toMatchObject({open:false,closingPending:false});
 expect(refill.events.some(e=>e.type==='phase')).toBe(false);
 expect(hashState(refill.state)).not.toBe(before);
 state=ordinaryTurn(state).state;
 expect(door(state)).toMatchObject({open:true,closingPending:false});
});

it('rejects a closed-route action without advancing phase, then accepts it after an opening turn',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(801)!);
 const [preparation,crossing]=lessonTeachingActions[801]!;
 const blocked=transition(state,crossing!);
 expect(blocked.accepted).toBe(false);expect(blocked.state).toBe(state);expect(blocked.events).toEqual([]);
 state=transition(state,preparation!).state;
 expect(state.fixtures.find(f=>f.kind==='phase-door')).toMatchObject({open:true,closingPending:false});
 expect(transition(state,crossing!).accepted).toBe(true);
});

it('keeps an occupied passage open with a serialized pending close until clearance',()=>{
 const level=phaseLevel();level.crew.push({id:'door-guest',at:{r:2,c:1},status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null});
 level.goals[0]!.eligible={type:'ids',ids:['crew-0','door-guest']};
 let state=loadCampaignLevel(level);
 state=ordinaryTurn(state,next=>next.crew.find(c=>c.id==='door-guest')?.at.r===2&&next.crew.find(c=>c.id==='door-guest')?.at.c===1).state;
 expect(door(state)).toMatchObject({open:true,closingPending:true});
 expect(state.mechanics.find(m=>m.id==='phase')).toEqual({id:'phase',waitingDoorIds:['phase-door']});
 const restored=parseCampaignState(JSON.parse(JSON.stringify(state)));
 expect(hashState(restored)).toBe(hashState(state));
 const rejected=transition(restored,{type:'swap',from:{r:0,c:0},to:{r:5,c:4}});
 expect(rejected.accepted).toBe(false);
 expect(rejected.state).toBe(restored);
 expect(rejected.events).toEqual([]);
 expect(door(rejected.state).closingPending).toBe(true);
});

it.each(['pod','cargo','actor'] as const)('%s traffic holds an open door and can depart before closure without displacement',kind=>{
 const state=loadCampaignLevel(phaseLevel()),at={...door(state).at},tile=state.pieces.find(p=>p.at.r===at.r&&p.at.c===at.c)!;
 if(kind==='actor')state.actors.push({id:'visitor',kind:'rover',at,routeId:null,routeIndex:0,passengerIds:[]});
 else state.pieces=state.pieces.map(p=>p.id===tile.id?kind==='pod'?{id:p.id,at,kind:'pod',passengerIds:[]}:{id:p.id,at,kind:'cargo',cargoKind:'key',destinationId:'test-lock',passengerIds:[]}:p);
 expect(phasePassageOccupied(state,door(state))).toBe(true);
 const context=createContext(state);phase.finalize!(context);
 expect(door(state)).toMatchObject({open:true,closingPending:true});
 expect(state.mechanics.find(m=>m.id==='phase')).toEqual({id:'phase',waitingDoorIds:['phase-door']});
 expect(kind==='actor'?state.actors.some(a=>a.id==='visitor'&&a.at.r===at.r&&a.at.c===at.c):state.pieces.some(p=>p.id===tile.id&&p.at.r===at.r&&p.at.c===at.c)).toBe(true);
 if(kind==='actor')state.actors=state.actors.filter(a=>a.id!=='visitor');
 else state.pieces=state.pieces.filter(p=>p.id!==tile.id);
 phase.finalize!(context);
 expect(door(state)).toMatchObject({open:false,closingPending:false});
 expect(state.mechanics.find(m=>m.id==='phase')).toEqual({id:'phase',waitingDoorIds:[]});
 expect(context.events.filter(e=>e.type==='phase').map(e=>e.phase)).toEqual(['pending','closed']);
});

it('allows a routed actor and its rider to leave an open doorway, then closes behind them',()=>{
 const level=getAuthoredLessonLevel(32)!;level.id=801;level.chapter=17;level.lessonId=null;
 level.fixtures.push({id:'phase-door',kind:'phase-door',at:{r:2,c:0},open:true,closingPending:false});
 level.mechanics.push({id:'phase',fixtureIds:['phase-door']});
 let state=loadCampaignLevel(level);
 expect(state.actors.find(a=>a.id==='rover')?.at).toEqual({r:2,c:0});
 const next=ordinaryTurn(state);state=next.state;
 expect(state.actors.find(a=>a.id==='rover')?.at).not.toEqual({r:2,c:0});
 expect(door(state)).toMatchObject({open:false,closingPending:false});
 expect(state.crew.find(c=>c.id==='crew-0')).toMatchObject({carrierId:'rover',at:state.actors.find(a=>a.id==='rover')!.at,status:'active'});
 expect(next.events.some(e=>e.type==='phase'&&e.phase==='closed')).toBe(true);
});
