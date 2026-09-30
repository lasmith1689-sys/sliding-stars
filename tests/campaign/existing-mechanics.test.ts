import { describe, expect, it } from 'vitest';
import type { CampaignEvent, CampaignFixture, CampaignLevel, MechanicId } from '../../src/campaign/types';
import type { GameEvent } from '../../src/core/events';
import { settle as legacySettle } from '../../src/core/game';
import { campaignModules, initialRuntime } from '../../src/campaign/mechanics/registry';
import { loadCampaignLevel } from '../../src/campaign/engine/load';
import { transition } from '../../src/campaign/engine/turn';
import { isLegalSwap } from '../../src/campaign/engine/actions';
import { parseCampaignEvents } from '../../src/campaign/schema';
import { settle } from '../../src/campaign/engine/settle';
import { getAuthoredLessonLevel } from '../../src/campaign/lessons';
import { baseLevel, baseState, context, legacyBoard, mergeSwap } from './fixtures/base';

const merge:Extract<CampaignEvent,{type:'merge'}>={type:'merge',sequenceId:0,timingGroup:0,mergeId:'first',pieceIds:['a','b','c'],cells:[{r:0,c:0},{r:0,c:1},{r:0,c:2}],at:{r:0,c:1},before:1,after:2};
const moduleFor=(id:MechanicId)=>{const module=campaignModules.find(m=>m.id===id);expect(module,`implemented ${id} module`).toBeDefined();return module!;};
function withFixture(fixture:CampaignFixture,id:MechanicId):CampaignLevel {
 const level=baseLevel();level.id=81;level.chapter=2;level.fixtures=[fixture];
 if(id==='crates'||id==='ice'||id==='reactors'||id==='comets')level.mechanics=[{id,fixtureIds:[fixture.id]}];
 if(fixture.kind==='crate')level.pieces=level.pieces.filter(p=>p.at.r!==fixture.at.r||p.at.c!==fixture.at.c);
 return level;
}
function legacyMerge():GameEvent {return {type:'merge',cells:merge.cells,anchor:merge.at,newTier:2};}

describe('ported legacy mechanics',()=>{
 it('crates take one hit per distinct merge, open for 40 points and credit supplies once',()=>{
  const level=withFixture({id:'box',kind:'crate',at:{r:1,c:0},hp:3},'crates');
  level.goals=[{id:'supplies',type:'recoverSupplies',eligible:{type:'ids',ids:['box']}}];
  const ctx=context(baseState(level));ctx.state.mechanics=[initialRuntime('crates')];
  const legacy=legacyBoard(ctx.state);legacy.overlays[1]![0]={kind:'canister',hp:3};
  const events:GameEvent[]=[legacyMerge(),legacyMerge()];legacySettle(legacy,events,false);
  moduleFor('crates').onMerge!(ctx,merge);moduleFor('crates').onMerge!(ctx,{...merge,mergeId:'second'});
  expect(ctx.state.fixtures[0]).toMatchObject({hp:legacy.overlays[1]![0]!.hp});expect(ctx.state.fixtures[0]).toMatchObject({hp:1});
  moduleFor('crates').onMerge!(ctx,{...merge,mergeId:'third'});
  expect(ctx.state.fixtures).toEqual([]);expect(ctx.state.points).toBe(40);expect(ctx.state.goalProgress[0]!.completedIds).toEqual(['box']);
  expect(parseCampaignEvents(ctx.events)).toEqual(ctx.events);
 });
 it.each(['ice','reactors'] as const)('%s blocks swaps, matches legacy single-merge wear, and releases on thaw/cooling',id=>{
  const fixture:CampaignFixture=id==='ice'?{id:'obstacle',kind:'ice',at:{r:1,c:0},hp:2}:{id:'obstacle',kind:'reactor',at:{r:1,c:0},hp:2,fuse:3,period:3};
  const ctx=context(baseState(withFixture(fixture,id)));ctx.state.mechanics=[initialRuntime(id)];
  const legacy=legacyBoard(ctx.state);legacy.overlays[1]![0]=id==='ice'?{kind:'crystal',hp:2}:{kind:'reactor',hp:2,fuse:3,period:3};
  legacySettle(legacy,[legacyMerge()],false);
  expect(isLegalSwap(ctx.state,{r:1,c:0},{r:0,c:0})).toBe(false);
  moduleFor(id).onMerge!(ctx,merge);
  expect(ctx.state.fixtures[0]).toMatchObject({hp:legacy.overlays[1]![0]!.hp});
  moduleFor(id).onMerge!(ctx,{...merge,mergeId:'second'});expect(ctx.state.fixtures).toEqual([]);
  expect(parseCampaignEvents(ctx.events)).toEqual(ctx.events);
 });
 it('a connected comet shares one hit pool, even when several cells touch a merge',()=>{
  const ctx=context(baseState(withFixture({id:'comet',kind:'comet',at:{r:1,c:0},cells:[{r:1,c:0},{r:1,c:1}],hp:2},'comets')));ctx.state.mechanics=[initialRuntime('comets')];
  const legacy=legacyBoard(ctx.state);legacy.overlays[1]![0]={kind:'comet',hp:2};legacy.overlays[1]![1]={kind:'comet',hp:2};legacySettle(legacy,[legacyMerge()],false);
  moduleFor('comets').onMerge!(ctx,merge);expect(ctx.state.fixtures[0]).toMatchObject({hp:legacy.overlays[1]![1]!.hp});
  moduleFor('comets').onMerge!(ctx,{...merge,mergeId:'second'});expect(ctx.state.fixtures).toEqual([]);
  expect(ctx.state.mechanics).toEqual([{id:'comets',clearedIds:['comet']}]);
 });
 it('reactor expiry matches legacy terrain erosion and resets its fuse once',()=>{
  const ctx=context(baseState(withFixture({id:'reactor',kind:'reactor',at:{r:2,c:1},hp:3,fuse:1,period:3},'reactors')));ctx.state.mechanics=[initialRuntime('reactors')];
  const piece=ctx.state.pieces.find(p=>p.at.r===2&&p.at.c===0)!;if(piece.kind==='tile')piece.tier=4;
  const legacy=legacyBoard(ctx.state);legacy.overlays[2]![1]={kind:'reactor',hp:3,fuse:1,period:3};legacySettle(legacy,[],true);
  moduleFor('reactors').environment!(ctx);
  expect(piece).toMatchObject({tier:3});expect(legacy.grid[2]![0]).toMatchObject({tier:3});
  expect(ctx.state.fixtures[0]).toMatchObject({fuse:3});expect(ctx.state.mechanics).toEqual([{id:'reactors',overloadCount:1}]);
  expect(parseCampaignEvents(ctx.events)).toEqual(ctx.events);
 });
 it('rover carries its rider one BFS step toward the station door like legacy',()=>{
  const level=baseLevel();level.id=31;level.actors=[{id:'rover',kind:'rover',at:{r:3,c:0},routeId:null,routeIndex:0,passengerIds:['crew']}];level.crew[0]!.carrierId='rover';level.mechanics=[{id:'rovers',actorIds:['rover']}];
  const ctx=context(baseState(level));ctx.state.mechanics=[initialRuntime('rovers')];ctx.steppedActorIds.add('rover');
  const legacy=legacyBoard(ctx.state);legacy.rovers=[{id:1,r:3,c:0,riderId:0}];legacySettle(legacy,[],true);
  moduleFor('rovers').stepActor!(ctx,'rover');expect(ctx.state.actors[0]!.at).toEqual({r:legacy.rovers[0]!.r,c:legacy.rovers[0]!.c});
  expect(ctx.state.crew[0]!.at).toEqual({r:3,c:1});expect(ctx.events).toContainEqual(expect.objectContaining({type:'move',entityId:'rover',passengerIds:['crew']}));
 });
 it('real merge transitions damage crates and boosters neither tick reactors nor bypass fixtures',()=>{
  const level=withFixture({id:'box',kind:'crate',at:{r:1,c:0},hp:3},'crates');
  const state=loadCampaignLevel(level);const result=transition(state,mergeSwap);expect(result.accepted).toBe(true);expect(result.state.fixtures[0]).toMatchObject({hp:1});
  expect(result.events.filter(e=>e.type==='fixture'&&e.fixtureId==='box')).toHaveLength(2);
  const reactorLevel=withFixture({id:'reactor',kind:'reactor',at:{r:2,c:1},hp:3,fuse:2,period:3},'reactors');
  const reactorState=loadCampaignLevel(reactorLevel);
  expect(transition(reactorState,{type:'booster',kind:'demo',at:{r:2,c:1}}).accepted).toBe(false);
  const boosted=transition(reactorState,{type:'booster',kind:'demo',at:{r:0,c:3}});expect(boosted.accepted).toBe(true);expect(boosted.state.turn).toBe(0);expect(boosted.state.fixtures[0]).toMatchObject({fuse:2,hp:3});
 });
 it('repeated settle cannot replay damage or tick a reactor fuse',()=>{
  const level=withFixture({id:'reactor',kind:'reactor',at:{r:1,c:0},hp:10,fuse:3,period:3},'reactors');
  const result=transition(loadCampaignLevel(level),mergeSwap);expect(result.accepted).toBe(true);
  const ctx=context(structuredClone(result.state)),before=structuredClone(ctx.state.fixtures);
  settle(ctx,campaignModules);settle(ctx,campaignModules);
  expect(ctx.state.fixtures).toEqual(before);expect(ctx.events).toEqual([]);
  expect(result.state.fixtures[0]).toMatchObject({hp:8,fuse:2});
 });
 it('ice keeps its terrain identity fixed through gravity and a wormhole until thawed',()=>{
  const level=getAuthoredLessonLevel(18)!;const state=loadCampaignLevel(level);
  const at=level.fixtures[0]!.at;
  const frozen=state.pieces.find(p=>p.at.r===at.r&&p.at.c===at.c)!;
  const boosted=transition(state,{type:'booster',kind:'wormhole',at:{r:0,c:0}});expect(boosted.accepted).toBe(true);
  expect(boosted.state.pieces.find(p=>p.id===frozen.id)).toEqual(frozen);expect(boosted.state.fixtures).toEqual(state.fixtures);
  expect(transition(state,{type:'booster',kind:'demo',at}).accepted).toBe(false);
 });
 it('empty rovers board colocated free crew, carry once, and retire after delivery',()=>{
  const level=getAuthoredLessonLevel(31)!;level.actors[0]={id:'rover',kind:'rover',at:{r:3,c:0},routeId:null,routeIndex:0,passengerIds:[]};level.crew[0]!.carrierId=null;
  const state=loadCampaignLevel(level),result=transition(state,{type:'swap',from:{r:3,c:2},to:{r:3,c:3}});
  expect(result.accepted).toBe(true);expect(result.events.some(e=>e.type==='transfer'&&e.toCarrierId==='rover')).toBe(true);
  expect(result.events.filter(e=>e.type==='move'&&e.entityId==='rover')).toHaveLength(1);
  expect(result.state.status).toBe('won');expect(result.state.actors).toEqual([]);expect(result.state.mechanics).toEqual([{id:'rovers',arrivedIds:['rover']}]);
 });
 it('a blocked rover route waits without overwriting cargo, passengers, or taking a later extra step',()=>{
  const level=getAuthoredLessonLevel(32)!;
  const destination=level.pieces.find(p=>p.at.r===3&&p.at.c===0)!;
  level.pieces=level.pieces.map(p=>p.id===destination.id?{id:p.id,at:p.at,kind:'pod',passengerIds:[]}:p);
  const result=transition(loadCampaignLevel(level),{type:'swap',from:{r:3,c:2},to:{r:3,c:3}});
  expect(result.accepted).toBe(true);expect(result.state.actors[0]!.at).toEqual({r:2,c:0});expect(result.state.crew[0]!.at).toEqual({r:2,c:0});
  expect(result.state.pieces.find(p=>p.id===destination.id)).toMatchObject({kind:'pod',at:{r:3,c:0}});
  expect(result.events.filter(e=>e.type==='move'&&e.entityId==='rover')).toEqual([]);
 });
 it('rover boosters keep position and rescue safety without a scheduled step',()=>{
  const state=loadCampaignLevel(getAuthoredLessonLevel(31)!);
  const result=transition(state,{type:'booster',kind:'demo',at:{r:0,c:3}});
  expect(result.accepted).toBe(true);expect(result.state.actors).toEqual(state.actors);expect(result.state.crew[0]!.rescueMoves).toBeNull();
 });
 it('rejects separate touching comet pools instead of silently changing connected rules',()=>{
  const level=getAuthoredLessonLevel(81)!;
  level.fixtures.push({id:'split-comet',kind:'comet',at:{r:2,c:0},cells:[{r:2,c:0}],hp:2});
  level.mechanics=[{id:'comets',fixtureIds:['comet','split-comet']}];
  expect(()=>loadCampaignLevel(level)).toThrow(/connected comet/);
 });
 it('rejects a rover route with nonadjacent loop closure',()=>{
  const routeLevel=getAuthoredLessonLevel(32)!;routeLevel.geometry.routes[0]!.loop=true;
  expect(()=>loadCampaignLevel(routeLevel)).toThrow(/adjacent/);
 });
});
