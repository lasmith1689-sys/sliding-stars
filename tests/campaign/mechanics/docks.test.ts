import {expect,it} from 'vitest';
import {baseLevel} from '../fixtures/base';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {createContext} from '../../../src/campaign/engine/context';
import {parseCampaignEvents,parseCampaignLevel,parseCampaignState} from '../../../src/campaign/schema';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {legalActions} from '../../../src/campaign/engine/actions';
import {transition} from '../../../src/campaign/engine/turn';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {applySceneEvents,makeScene} from '../../../src/render/campaign/snapshot';
import type {CampaignLevel} from '../../../src/campaign/types';

function dockLevel():CampaignLevel {
 const level=baseLevel([[1,2,1,3],[2,1,3,2],[3,2,4,3],[1,3,2,1]]);
 level.id=756;level.chapter=16;
 level.crew[0]!.at={r:2,c:2};
 level.actors=[{id:'shuttle',kind:'dock',at:{r:1,c:0},routeId:'track',routeIndex:0,entrance:{r:2,c:0},endpointId:'landing'}];
 level.geometry.routes=[{id:'track',cells:[{r:1,c:0},{r:1,c:1},{r:1,c:2}],loop:false}];
 level.geometry.endpoints=[{id:'landing',kind:'station',at:{r:2,c:0},active:true}];
 level.mechanics=[{id:'docks',actorIds:['shuttle']}];
 return level;
}
function module(){const found=campaignModules.find(m=>m.id==='docks');expect(found).toBeDefined();return found!;}

it('moves one track stop with its absolute entrance and endpoint while the guest and terrain stay put',()=>{
 const c=createContext(loadCampaignLevel(dockLevel())),before=structuredClone(c.state);
 module().stepActor!(c,'shuttle');
 expect(c.state.actors[0]).toMatchObject({at:{r:1,c:1},routeIndex:1,entrance:{r:2,c:1}});
 expect(c.state.geometry.endpoints[0]).toMatchObject({at:{r:2,c:1}});
 expect(c.state.crew[0]).toMatchObject({at:before.crew[0]!.at,status:'active',carrierId:null});
 expect(c.state.pieces).toEqual(before.pieces);
 expect(parseCampaignEvents(c.events)).toEqual(c.events);
});
it('boards only on the actual aligned safe entrance and credits that passenger once',()=>{
 const c=createContext(loadCampaignLevel(dockLevel()));
 module().stepActor!(c,'shuttle');module().settle!(c);
 expect(c.state.crew[0]).toMatchObject({at:{r:2,c:2},status:'active'});
 module().stepActor!(c,'shuttle');module().settle!(c);
 expect(c.state.crew[0]).toMatchObject({at:{r:2,c:2},status:'housed',carrierId:null});
 expect(c.state.mechanics).toContainEqual({id:'docks',boardedIds:['crew']});
 expect(c.events.filter(e=>e.type==='dock'&&e.phase==='boarded')).toHaveLength(1);
 module().settle!(c);expect(c.state.mechanics).toContainEqual({id:'docks',boardedIds:['crew']});
});
it('waits at blocked track terrain or an occupied entrance and reloads the waiting guest exactly',()=>{
 const level=dockLevel(),c=createContext(loadCampaignLevel(level));
 c.state.actors.push({id:'other',kind:'rover',at:{r:1,c:1},routeId:null,routeIndex:0,passengerIds:[]});
 module().stepActor!(c,'shuttle');
 expect(c.state.actors[0]).toMatchObject({routeIndex:0,entrance:{r:2,c:0}});
 expect(c.events).toContainEqual(expect.objectContaining({type:'dock',phase:'waiting'}));
 c.state.actors.pop();module().stepActor!(c,'shuttle');
 expect(parseCampaignState(JSON.parse(JSON.stringify(c.state))).crew[0]).toMatchObject({at:{r:2,c:2},status:'active'});
});
it.each(['actor','fixture','inactive'] as const)('waits without moving its owned endpoint when the next entrance has %s blockage',kind=>{
 const c=createContext(loadCampaignLevel(dockLevel())),entrance={r:2,c:1};
 if(kind==='actor')c.state.actors.push({id:'guest-rover',kind:'rover',at:entrance,routeId:null,routeIndex:0,passengerIds:[]});
 if(kind==='fixture')c.state.fixtures.push({id:'ice-block',kind:'ice',at:entrance,hp:1});
 if(kind==='inactive')c.state.geometry.inactiveCells.push(entrance);
 const before=structuredClone(c.state);
 module().stepActor!(c,'shuttle');
 expect(c.state).toEqual(before);
 expect(c.events).toContainEqual(expect.objectContaining({type:'dock',actorId:'shuttle',phase:'waiting'}));
});
it('accepted turns step once, rejection and accepted booster leave the dock still, and a saved misaligned guest waits',()=>{
 let state=loadCampaignLevel(dockLevel()),initial=structuredClone(state);
 const rejected=transition(state,{type:'swap',from:{r:0,c:0},to:{r:2,c:0}});
 expect(rejected.accepted).toBe(false);expect(rejected.state).toBe(state);expect(rejected.events).toEqual([]);
 const booster=transition(state,{type:'booster',kind:'demo',at:{r:0,c:0}});
 expect(booster.accepted).toBe(true);expect(booster.state.turn).toBe(0);expect(booster.state.actors).toEqual(initial.actors);expect(booster.state.geometry.endpoints).toEqual(initial.geometry.endpoints);
 const action=legalActions(state)[0];expect(action).toBeDefined();
 const first=transition(state,action!);expect(first.accepted).toBe(true);expect(first.state.turn).toBe(1);
 expect(applySceneEvents(makeScene(state),first.events)).toEqual(makeScene(first.state));
 expect(first.state.actors[0]).toMatchObject({routeIndex:1,entrance:{r:2,c:1}});
 expect(first.state.geometry.endpoints[0]).toMatchObject({at:{r:2,c:1}});
 expect(first.state.crew[0]).toMatchObject({at:initial.crew[0]!.at,status:'active'});
 state=parseCampaignState(JSON.parse(JSON.stringify(first.state)));
 const next=legalActions(state)[0];expect(next).toBeDefined();
 const second=transition(state,next!);expect(second.accepted).toBe(true);expect(second.state.actors[0]).toMatchObject({routeIndex:2,entrance:{r:2,c:2}});
 expect(applySceneEvents(makeScene(state),second.events)).toEqual(makeScene(second.state));
 expect(second.state.crew[0]!.status).toBe('housed');expect(second.events.filter(e=>e.type==='dock'&&e.phase==='boarded')).toHaveLength(1);
});
it('rejects tampered saved route, entrance, endpoint, and boarding ledger',()=>{
 const c=createContext(loadCampaignLevel(dockLevel()));module().stepActor!(c,'shuttle');
 expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
 const endpoint=structuredClone(c.state);endpoint.geometry.endpoints[0]!.at={r:2,c:0};expect(()=>parseCampaignState(endpoint)).toThrow(/dock/i);
 const entrance=structuredClone(c.state);if(entrance.actors[0]?.kind==='dock')entrance.actors[0].entrance={r:2,c:0};expect(()=>parseCampaignState(entrance)).toThrow(/dock/i);
 const route=structuredClone(c.state);route.geometry.routes[0]!.cells[2]={r:1,c:3};expect(()=>parseCampaignState(route)).toThrow(/dock/i);
 const ledger=structuredClone(c.state);if(ledger.mechanics[0]?.id==='docks')ledger.mechanics[0].boardedIds=['crew'];expect(()=>parseCampaignState(ledger)).toThrow(/dock/i);
});
it.each([756,757,758,759,760])('lesson %s actually boards every required guest after a playable wait',id=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(id)!),boarded:string[]=[],misaligned=false;
 for(const [index,action] of lessonTeachingActions[id]!.entries()){
  const before=state,entrance=before.actors.find(a=>a.kind==='dock')!.entrance;
  if(before.crew.some(c=>c.status==='active'&&(c.at.r!==entrance.r||c.at.c!==entrance.c)))misaligned=true;
  const result=transition(state,action);expect(result.accepted).toBe(true);
  boarded.push(...result.events.flatMap(e=>e.type==='dock'&&e.phase==='boarded'&&e.crewId?[e.crewId]:[]));
  if(index<lessonTeachingActions[id]!.length-1)expect(result.state.status).toBe('playing');
  state=result.state;
 }
 expect(misaligned).toBe(true);expect(state.status).toBe('won');
 expect(boarded.sort()).toEqual(state.crew.map(c=>c.id).sort());
 if(id===760)expect(state.mechanics.some(m=>m.id==='currents'&&m.shiftCount>0)).toBe(true);
});
it('rejects incoherent moving endpoint, unowned endpoint, offset route and disabled entrance',()=>{
 const moved=dockLevel();moved.geometry.endpoints[0]!.at={r:2,c:1};expect(()=>parseCampaignLevel(moved)).toThrow(/dock/i);
 const shared=dockLevel();shared.geometry.routes.push({id:'track-2',cells:[{r:3,c:0},{r:3,c:1},{r:3,c:2}],loop:false});shared.actors.push({id:'shuttle-2',kind:'dock',at:{r:3,c:0},routeId:'track-2',routeIndex:0,entrance:{r:2,c:0},endpointId:'landing'});shared.mechanics=[{id:'docks',actorIds:['shuttle','shuttle-2']}];expect(()=>parseCampaignLevel(shared)).toThrow(/dock/i);
 const skipped=dockLevel();skipped.geometry.routes[0]!.cells[1]={r:1,c:3};expect(()=>parseCampaignLevel(skipped)).toThrow(/dock/i);
 const masked=dockLevel();masked.geometry.mask[2]![1]=false;expect(()=>parseCampaignLevel(masked)).toThrow(/footprint|dock/i);
});
