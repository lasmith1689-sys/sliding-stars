import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../src/campaign/lessons';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {parseCampaignLevel,parseCampaignState} from '../../src/campaign/schema';
import type {CampaignState,GeometryDef} from '../../src/campaign/types';
import {currents,currentMoves} from '../../src/campaign/mechanics/currents';
import {createContext} from '../../src/campaign/engine/context';
import {transition} from '../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../src/campaign/content/lesson-solutions.dev';
import {createCampaignSave} from '../../src/session/campaignSession';
import {readSave,SAVE_KEY,BACKUP_KEY} from '../../src/session/storage';
import {MemoryStorage} from '../session/fixtures/legacy';

function twoLaneState():CampaignState {
 const level=getAuthoredLessonLevel(277)!;
 level.geometry.routes.push({id:'other-current',loop:true,cells:[{r:0,c:0},{r:0,c:1}]});
 level.mechanics=[{id:'currents',routeIds:['current-0','other-current']}];
 return loadCampaignLevel(level);
}
const corruptions:{name:string;mutate:(geometry:GeometryDef)=>void}[]=[
 {name:'missing',mutate:g=>{g.routes.shift();}},
 {name:'open',mutate:g=>{g.routes[0]!.loop=false;}},
 {name:'singleton',mutate:g=>{g.routes[0]!.cells=[g.routes[0]!.cells[0]!];}},
 {name:'nonorthogonal',mutate:g=>{g.routes[0]!.cells=[{r:2,c:1},{r:3,c:2}];}},
 {name:'overlapping',mutate:g=>{g.routes[1]!.cells=[...g.routes[0]!.cells];}},
];
it.each(corruptions)('rejects a $name runtime current instead of restoring a broken consumer',({mutate})=>{
 const state=twoLaneState();mutate(state.geometry);expect(()=>parseCampaignState(JSON.parse(JSON.stringify(state)))).toThrow(/current/i);
});
it.each(corruptions)('rejects a $name embedded authored current even when runtime geometry agrees',({mutate})=>{
 const state=twoLaneState();mutate(state.level.geometry);state.geometry=structuredClone(state.level.geometry);
 expect(()=>parseCampaignLevel(state.level)).toThrow(/current|reference/i);
 expect(()=>parseCampaignState(state)).toThrow(/current|reference/i);
});
it.each(['reverse','relocate'] as const)('rejects a valid cycle that would %s the authored current topology',kind=>{
 const state=twoLaneState();state.geometry.routes[0]!.cells=kind==='reverse'?[...state.geometry.routes[0]!.cells].reverse():[{r:1,c:0},{r:1,c:1},{r:2,c:1},{r:2,c:0}];
 expect(()=>parseCampaignState(state)).toThrow(/current.*authored/i);
});
it('restores a real station-blocked turn and does not rerun authored station exclusions against the runtime',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(280)!);
 for(const action of lessonTeachingActions[280]!.slice(0,2))state=transition(state,action).state;
 const restored=parseCampaignState(JSON.parse(JSON.stringify(state)));expect(restored).toEqual(state);
 const route=restored.geometry.routes.find(r=>r.id==='current-0')!;expect(currentMoves(restored,route)).toBeNull();
 const context=createContext(restored);currents.environment!(context);expect(context.state).toEqual(state);expect(context.events).toHaveLength(1);expect(context.events[0]).toMatchObject({type:'current',phase:'waiting'});
});
it('allows a declared dynamic fixture to block a current and permits unrelated geometry changes',()=>{
 const level=getAuthoredLessonLevel(277)!;
 level.fixtures=[{id:'ice',kind:'ice',at:{r:1,c:0},hp:1}];level.mechanics.push({id:'ice',fixtureIds:['ice']});
 const state=loadCampaignLevel(level);state.fixtures[0]!.at={r:3,c:1};
 // Unrelated routes/connections are not frozen by the current's immutable cycle contract.
 state.geometry.routes.push({id:'unrelated',loop:false,cells:[{r:1,c:0},{r:1,c:1}]});
 state.geometry.connections.push({id:'opened-link',from:{r:0,c:0},to:{r:1,c:0},active:true});
 const restored=parseCampaignState(JSON.parse(JSON.stringify(state)));expect(restored).toEqual(state);
 expect(currentMoves(restored,restored.geometry.routes[0]!)).toBeNull();
});
it('recovers the valid backup instead of loading a higher-revision malformed current primary',()=>{
 const store=new MemoryStorage(),backup=createCampaignSave(getAuthoredLessonLevel(276)!),primary=structuredClone(backup);
 primary.revision=backup.revision+1;if(primary.active.kind!=='campaign')throw Error();primary.active.state.geometry.routes=[];
 const primaryRaw=JSON.stringify(primary),backupRaw=JSON.stringify(backup);store.setItem(SAVE_KEY,primaryRaw);store.setItem(BACKUP_KEY,backupRaw);
 const read=readSave(store);expect(read.status).toBe('recovered');expect(read.save).toEqual(backup);
 expect(store.getItem(SAVE_KEY)).toBe(primaryRaw);expect(store.getItem(BACKUP_KEY)).toBe(backupRaw);
});
