import { it,expect } from 'vitest';
import { transition,createCampaignEngine } from '../../src/campaign/engine/turn';
import { settle } from '../../src/campaign/engine/settle';
import { creditGoals,goalsComplete } from '../../src/campaign/engine/goals';
import { baseLevel,baseState,context,mergeSwap } from './fixtures/base';
import { emit } from '../../src/campaign/engine/context';
import { parseCampaignState } from '../../src/campaign/schema';
import { resolveCrewSafety } from '../../src/campaign/engine/needs';

it('final rescue wins before the last move or need expires',()=>{
  const state=baseState(baseLevel([[1,2,2,3],[2,1,1,2],[3,2,1,3],[1,1,2,'S']]));state.level.moveLimit=1;state.movesRemaining=1;state.crew[0]!.at={r:3,c:1};state.crew[0]!.rescueMoves=1;
  const station=structuredClone(state.pieces.find(p=>p.kind==='station')!),result=transition(state,{type:'swap',from:{r:3,c:1},to:{r:3,c:2}});
  expect(result.accepted,result.rejection).toBe(true);expect(result.events.some(e=>e.type==='merge')).toBe(true);expect(result.state.pieces.find(p=>p.id===station.id)).toEqual(station);expect(result.state.movesRemaining).toBe(0);
  expect(result.state.status).toBe('won');expect(result.state.crew[0]!.status).toBe('housed');expect(result.events.some(e=>e.type==='need'&&e.after===0)).toBe(false);
});
it('repeat settling does not tick rescue clocks or award safe-ground points twice',()=>{
  const state=baseState(),ctx=context(state);settle(ctx,[]);const once=structuredClone(state);settle(ctx,[]);expect(state).toEqual(once);
});
it('a finite future crew quota prevents premature victory',()=>{
  const state=baseState();state.crew[0]!.status='housed';state.level.goals[0]!.eligible={type:'ids',ids:['crew','future']};
  creditGoals(context(state));expect(goalsComplete(state)).toBe(false);
});

it('admission happens after old crew ticks and newly admitted crew keep their full timer',()=>{
  const level=baseLevel();level.id=146;level.chapter=3;
  const incoming={...level.crew[0]!,id:'incoming',at:{r:0,c:3},rescueMoves:9};
  level.arrivals=[{id:'wave',turn:1,entry:incoming.at,crew:[incoming],status:'pending'}];level.mechanics=[{id:'waves',arrivalIds:['wave']}];
  level.goals[0]!.eligible={type:'ids',ids:['crew','incoming']};
  const engine=createCampaignEngine([{id:'waves',validate:()=>[],admit:ctx=>{
    const arrival=ctx.state.arrivals[0]!;if(arrival.status==='admitted')return;
    arrival.status='admitted';ctx.state.crew.push(structuredClone(incoming));emit(ctx,{type:'crew',crewId:incoming.id,before:null,after:incoming});
    emit(ctx,{type:'arrival',arrivalId:arrival.id,before:'pending',after:'admitted',crewIds:[incoming.id]});
    const runtime=ctx.state.mechanics.find(m=>m.id==='waves');if(runtime?.id==='waves')runtime.admittedIds.push(arrival.id);
  }}]);
  const state=engine.loadCampaignLevel(level),result=engine.transition(state,mergeSwap);
  expect(result.state.crew.find(c=>c.id==='crew')!.rescueMoves).toBe(19);
  expect(result.state.crew.find(c=>c.id==='incoming')!.rescueMoves).toBe(9);
  expect(result.events.findIndex(e=>e.type==='arrival')).toBeGreaterThan(result.events.findIndex(e=>e.type==='need'&&e.after===19));
  expect(parseCampaignState(result.state)).toEqual(result.state);
});

it('finalize happens once after environment, before goals and needs; boosters never finalize',()=>{
  const order:string[]=[];const level=baseLevel();level.id=4;level.fixtures=[{id:'box',kind:'crate',hp:1,at:{r:2,c:3}}];level.pieces=level.pieces.filter(p=>p.at.r!==2||p.at.c!==3);level.mechanics=[{id:'crates',fixtureIds:['box']}];
  const engine=createCampaignEngine([{id:'crates',validate:()=>[],transfer:()=>{order.push('transfer');},environment:()=>{order.push('environment');},finalize:ctx=>{
    order.push('finalize');ctx.state.crew[0]!.status='housed';
  }}]);
  const state=engine.loadCampaignLevel(level);state.crew[0]!.rescueMoves=1;
  const result=engine.transition(state,mergeSwap);expect(order).toEqual(['transfer','environment','finalize']);expect(result.state.status).toBe('won');
  expect(result.events.some(e=>e.type==='need'&&e.after===0)).toBe(false);
  order.length=0;engine.transition(state,{type:'booster',kind:'demo',at:{r:0,c:3}});expect(order).toEqual([]);
});

it('a requested-transfer carrier pauses rescue without automatically housing its passengers at a door',()=>{
  const state=baseState();state.crew[0]!.at={r:3,c:2};state.crew[0]!.carrierId='whale';
  state.actors=[{id:'whale',kind:'moonwhale',at:{r:3,c:2},routeId:'route',routeIndex:0,passengerIds:['crew'],landing:{r:2,c:2},transferRequested:false}];
  resolveCrewSafety(context(state));expect(state.crew[0]!.status).toBe('active');expect(state.crew[0]!.rescueMoves).toBeNull();
});

it('a rigid pair pauses rescue needs while its release remains owned by the mechanic',()=>{
  const state=baseState();state.crew[0]!.at={r:1,c:0};state.crew[0]!.carrierId='pair';state.crew.push({...state.crew[0]!,id:'other',at:{r:1,c:1}});
  state.actors=[{id:'pair',kind:'tether',at:{r:1,c:0},offset:{r:0,c:1},passengerIds:['crew','other'],released:false}];
  resolveCrewSafety(context(state));expect(state.crew.map(c=>c.rescueMoves)).toEqual([null,null]);
});
