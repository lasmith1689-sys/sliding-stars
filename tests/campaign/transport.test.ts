import { it,expect } from 'vitest';
import { canMoveActor,moveActor,movePiece } from '../../src/campaign/engine/transport';
import { baseState,context } from './fixtures/base';
import { baseLevel,mergeSwap } from './fixtures/base';
import { createCampaignEngine } from '../../src/campaign/engine/turn';
import { stepActors } from '../../src/campaign/engine/actors';
import { fallPieces } from '../../src/campaign/engine/settle';
import { isLegalTranslation } from '../../src/campaign/engine/actions';

it('moving a piece carries its crew and records every displacement',()=>{
  const state=baseState(),piece=state.pieces.find(p=>p.at.r===3&&p.at.c===0)!;state.pieces=state.pieces.filter(p=>p.at.r!==2||p.at.c!==0);
  const ctx=context(state);expect(movePiece(ctx,piece.id,{r:2,c:0})).toBe(true);expect(state.crew[0]!.at).toEqual({r:2,c:0});
  expect(ctx.events.filter(e=>e.type==='move').map(e=>e.entityId)).toEqual([piece.id,'crew']);
});
it('a piece cannot overwrite an unrelated rider',()=>{
  const state=baseState();state.pieces=state.pieces.filter(p=>p.at.r!==3||p.at.c!==0);const piece=state.pieces[0]!;
  expect(movePiece(context(state),piece.id,{r:3,c:0})).toBe(false);expect(piece.at).toEqual({r:0,c:0});
});
it('a rigid carrier may move into its old footprint, carrying riders but not terrain',()=>{
  const state=baseState();state.crew=[...state.crew,{...state.crew[0]!,id:'other'}];state.crew.forEach((c,i)=>{c.at={r:1,c:i};c.carrierId='pair';});
  state.actors=[{id:'pair',kind:'tether',at:{r:1,c:0},offset:{r:0,c:1},passengerIds:['crew','other'],released:false}];
  const terrain=structuredClone(state.pieces),ctx=context(state);
  expect(canMoveActor(state,'pair',{r:1,c:1})).toBe(true);expect(moveActor(ctx,'pair',{r:1,c:1})).toBe(true);
  expect(state.pieces).toEqual(terrain);expect(state.crew.map(c=>c.at)).toEqual([{r:1,c:1},{r:1,c:2}]);
  expect(ctx.events.filter(e=>e.type==='move').map(e=>e.entityId)).toEqual(['pair','crew','other']);
});

it.each(['missing-terrain','inactive-cell','mask-gap'] as const)(
  'a rigid translation rejects a %s destination without changing state, events or clocks',
  obstruction=>{
    const level=baseLevel();
    level.id=881;
    level.chapter=18;
    level.moveLimit=9;
    level.crew=[level.crew[0]!,{...level.crew[0]!,id:'other'}];
    level.crew.forEach((crew,c)=>{
      crew.at={r:1,c};
      crew.carrierId='pair';
    });
    level.actors=[{id:'pair',kind:'tether',at:{r:1,c:0},offset:{r:0,c:1},passengerIds:['crew','other'],released:false}];
    level.mechanics=[{id:'tethers',actorIds:['pair']}];
    const state=baseState(level);
    state.mechanics=[{id:'tethers',releasedIds:[]}];
    state.pieces=state.pieces.filter(piece=>piece.at.r!==1||piece.at.c!==2);
    if(obstruction==='inactive-cell')state.geometry.inactiveCells.push({r:1,c:2});
    if(obstruction==='mask-gap')state.geometry.mask[1]![2]=false;
    const before=structuredClone(state);
    const engine=createCampaignEngine([{id:'tethers',validate:()=>[]}]);

    expect.soft(canMoveActor(state,'pair',{r:1,c:1})).toBe(false);
    expect.soft(isLegalTranslation(state,'pair',0,1)).toBe(false);
    const result=engine.transition(state,{type:'translate',actorId:'pair',dr:0,dc:1});
    expect.soft(result.accepted).toBe(false);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(state).toEqual(before);
    expect(result.state.turn).toBe(0);
    expect(result.state.movesRemaining).toBe(9);
    expect(result.state.crew.map(crew=>crew.rescueMoves)).toEqual([20,20]);
  },
);

it('ordinary-terrain actors cannot move to an active cell without a tile',()=>{
  const state=baseState();
  state.actors=[{id:'rover',kind:'rover',at:{r:1,c:0},routeId:null,routeIndex:0,passengerIds:[]}];
  state.pieces=state.pieces.filter(piece=>piece.at.r!==1||piece.at.c!==1);
  expect(canMoveActor(state,'rover',{r:1,c:1})).toBe(false);
});

it('actors across modules compete in global code-unit ID order',()=>{
  const level=baseLevel();level.id=231;level.chapter=5;
  level.actors=[{id:'Z-rover',kind:'rover',at:{r:2,c:2},routeId:null,routeIndex:0,passengerIds:[]},{id:'A-pup',kind:'pup',at:{r:2,c:0},nurseryId:'nursery'}];
  level.geometry.endpoints=[{id:'nursery',kind:'nursery',at:{r:1,c:3},active:true}];level.mechanics=[{id:'rovers',actorIds:['Z-rover']},{id:'pups',actorIds:['A-pup']}];
  const order:string[]=[];const engine=createCampaignEngine([
    {id:'rovers',validate:()=>[],stepActor:(ctx,id)=>{order.push(id);moveActor(ctx,id,{r:2,c:1});}},
    {id:'pups',validate:()=>[],stepActor:(ctx,id)=>{order.push(id);moveActor(ctx,id,{r:2,c:1});}},
  ]);
  const state=engine.loadCampaignLevel(level),result=engine.transition(state,mergeSwap);
  expect(order).toEqual(['A-pup','Z-rover']);expect(result.state.actors.find(a=>a.id==='A-pup')!.at).toEqual({r:2,c:1});expect(result.state.actors.find(a=>a.id==='Z-rover')!.at).toEqual({r:2,c:2});
});

it('actor snapshot excludes new actors, skips removed/already stepped actors, and transfers before stepping',()=>{
  const ctx=context();ctx.state.actors=[{id:'A',kind:'rover',at:{r:0,c:0},routeId:null,routeIndex:0,passengerIds:[]},{id:'B',kind:'rover',at:{r:0,c:1},routeId:null,routeIndex:0,passengerIds:[]}];
  const order:string[]=[];const modules=[{id:'rovers' as const,validate:()=>[],transferActor:(c:typeof ctx,id:string)=>{
    order.push(`transfer:${id}`);if(id==='A'){c.state.actors=c.state.actors.filter(a=>a.id!=='B');c.state.actors.push({id:'C',kind:'rover',at:{r:0,c:2},routeId:null,routeIndex:0,passengerIds:[]});}
  },stepActor:(_:typeof ctx,id:string)=>{order.push(`step:${id}`);}}];
  stepActors(ctx,modules,['A','B']);stepActors(ctx,modules,['A','B']);expect(order).toEqual(['transfer:A','step:A']);
});

it('terrain with a rider cannot be transported into an unrelated actor rider',()=>{
  const state=baseState();state.pieces=state.pieces.filter(p=>p.at.r!==2||p.at.c!==0);
  state.actors=[{id:'rover',kind:'rover',at:{r:2,c:0},routeId:null,routeIndex:0,passengerIds:['rider']}];
  state.crew.push({...state.crew[0]!,id:'rider',at:{r:2,c:0},carrierId:'rover'});
  const source=state.pieces.find(p=>p.at.r===3&&p.at.c===0)!;
  expect(movePiece(context(state),source.id,{r:2,c:0})).toBe(false);
});

it('a falling pod cannot tunnel through an actor to reach a free cell below it',()=>{
  const state=baseState();state.crew=[];state.pieces=state.pieces.filter(p=>p.at.c!==0);
  state.pieces.push({id:'pod',kind:'pod',at:{r:0,c:0},passengerIds:[]});state.actors=[{id:'rover',kind:'rover',at:{r:1,c:0},routeId:null,routeIndex:0,passengerIds:[]}];
  fallPieces(context(state));expect(state.pieces.find(p=>p.id==='pod')!.at).toEqual({r:0,c:0});
});

it('actors cannot enter a fixed trigger fixture even where ordinary terrain is movable',()=>{
  const state=baseState();state.crew=[];state.actors=[{id:'rover',kind:'rover',at:{r:1,c:0},routeId:null,routeIndex:0,passengerIds:[]}];
  state.fixtures=[{id:'garden',kind:'garden',at:{r:1,c:1},stage:0,harvestId:'fruit',exitId:'exit',outputAt:{r:0,c:1}}];
  expect(canMoveActor(state,'rover',{r:1,c:1})).toBe(false);
});
