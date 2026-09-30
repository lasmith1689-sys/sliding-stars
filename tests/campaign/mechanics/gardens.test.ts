import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import type {CampaignEvent} from '../../../src/campaign/types';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {parseCampaignState,parseCampaignEvents,parseCampaignLevel} from '../../../src/campaign/schema';
import {transition,createCampaignEngine} from '../../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {resolveTerrainMatches} from '../../../src/campaign/engine/settle';
const garden=()=>campaignModules.find(m=>m.id==='gardens');
function context(){const level=getAuthoredLessonLevel(426)!;level.id=516;level.geometry.inactiveCells=[];level.geometry.connections=[];level.fixtures=[{id:'plot',kind:'garden',at:{r:1,c:1},stage:0,harvestId:'fruit',exitId:'exit',outputAt:{r:0,c:1}}];return createContext({level,levelId:516,campaignVersion:'2026.1',rulesVersion:'campaign-1',turn:0,nextEntityId:1,rngState:7,geometry:level.geometry,pieces:[],crew:[],actors:[],fixtures:level.fixtures,arrivals:[],mechanics:[{id:'gardens',harvestedIds:[]}],goalProgress:[],movesRemaining:null,points:0,status:'playing',transportedThisTurn:[],pendingTransfers:[]});}
const merge=(id='one'):Extract<CampaignEvent,{type:'merge'}>=>({type:'merge',mergeId:id,sequenceId:0,timingGroup:0,pieceIds:['a','b','c','d','e'],cells:[{r:1,c:0},{r:1,c:1},{r:1,c:2},{r:0,c:1},{r:2,c:1}],at:{r:1,c:0},before:1,after:2});
it('a large actual merge containing a plot advances once, replaying it never advances twice',()=>{const c=context();garden()?.onMerge?.(c,merge());expect(c.state.fixtures[0]).toMatchObject({stage:1});garden()?.onMerge?.(c,merge());expect(c.state.fixtures[0]).toMatchObject({stage:1});});
it('adjacent alone does not grow and three distinct merges yield exactly one harvest',()=>{const c=context(),far=merge();far.cells=[{r:0,c:0},{r:0,c:1},{r:0,c:2}];garden()?.onMerge?.(c,far);expect(c.state.fixtures[0]).toMatchObject({stage:0});for(const id of ['one','two','three','three','four'])garden()?.onMerge?.(c,merge(id));garden()?.beforeRefill?.(c);expect(c.state.fixtures[0]).toMatchObject({stage:3});expect(c.state.pieces.filter(p=>p.id==='fruit')).toHaveLength(1);garden()?.beforeRefill?.(c);expect(c.state.pieces.filter(p=>p.id==='fruit')).toHaveLength(1);});
it('a real five-cell junction advances just one stage',()=>{const c=context();c.state.pieces=merge().cells.map((at,i)=>({id:`p${i}`,kind:'tile',tier:1,at}));resolveTerrainMatches(c,null,campaignModules);expect(c.events.filter(e=>e.type==='merge')).toHaveLength(1);expect(c.state.fixtures[0]).toMatchObject({stage:1});});
it('mature output waits without overwrite, survives save, then emits exactly one real cargo',()=>{
 const c=createContext(loadCampaignLevel(getAuthoredLessonLevel(516)!));for(const id of ['a','b','c'])garden()!.onMerge!(c,merge(id));const before=structuredClone(c.state.pieces);
 expect(garden()!.beforeRefill!(c)).toBe(false);expect(c.state.pieces).toEqual(before);expect(c.events.some(e=>e.type==='garden'&&e.phase==='waiting')).toBe(true);
 const restored=createContext(parseCampaignState(JSON.parse(JSON.stringify(c.state))));restored.state.pieces=restored.state.pieces.filter(p=>p.at.r!==0||p.at.c!==1);
 expect(garden()!.beforeRefill!(restored)).toBe(true);expect(garden()!.beforeRefill!(restored)).toBe(false);
 expect(restored.state.pieces.find(p=>p.id==='harvest-0')).toMatchObject({kind:'cargo',cargoKind:'harvest',destinationId:'harvest-exit-0',passengerIds:[],at:{r:0,c:1}});
 expect(parseCampaignState(JSON.parse(JSON.stringify(restored.state)))).toEqual(restored.state);expect(parseCampaignEvents(restored.events)).toEqual(restored.events);
 const cargoSwap={type:'swap' as const,from:{r:0,c:1},to:{r:0,c:0}};expect(transition(restored.state,cargoSwap)).toMatchObject({accepted:false,events:[]});expect(transition(restored.state,{...cargoSwap,from:cargoSwap.to,to:cargoSwap.from}).accepted).toBe(false);
 const corrupt=structuredClone(restored.state);if(corrupt.fixtures[0]?.kind==='garden')corrupt.fixtures[0].stage=2;expect(()=>parseCampaignState(corrupt)).toThrow(/maturity/);
 const rewired=structuredClone(restored.state);if(rewired.fixtures[0]?.kind==='garden')rewired.fixtures[0].outputAt={r:1,c:0};expect(()=>parseCampaignState(rewired)).toThrow(/output changed/);
});
it('rejects invalid output and a mature authored plot before loading',()=>{const l=getAuthoredLessonLevel(516)!;if(l.fixtures[0]?.kind==='garden')l.fixtures[0].outputAt={r:99,c:0};expect(()=>parseCampaignLevel(l)).toThrow(/output/);const m=getAuthoredLessonLevel(516)!;if(m.fixtures[0]?.kind==='garden')m.fixtures[0].stage=3;expect(()=>parseCampaignLevel(m)).toThrow(/growth zero/);});
it('rejects a plot occupying a current lane as an unsupported spatial combination',()=>{const l=getAuthoredLessonLevel(516)!;l.geometry.routes.push({id:'lane',loop:true,cells:[{r:1,c:1},{r:1,c:2}]});l.mechanics.push({id:'currents',routeIds:['lane']});expect(()=>parseCampaignLevel(l)).toThrow(/Current lane/);});
it.each([516,517,518,519,520])('lesson %s needs real plot growth, reloads at every turn and delivers once',id=>{
 const l=getAuthoredLessonLevel(id)!,disabled=createCampaignEngine(campaignModules.map(m=>m.id==='gardens'?{...m,onMerge:undefined}:m));let s=loadCampaignLevel(l),without=disabled.loadCampaignLevel(l);let yields=0,growth=0;
 for(const action of lessonTeachingActions[id]!){const r=transition(s,action);expect(r.accepted).toBe(true);expect(r).toEqual(transition(parseCampaignState(JSON.parse(JSON.stringify(s))),action));growth+=r.events.filter(e=>e.type==='garden'&&e.phase==='grown').length;yields+=r.events.filter(e=>e.type==='spawn'&&e.piece.id==='harvest-0').length;s=r.state;const no=disabled.transition(without,action);if(no.accepted)without=no.state;}
 expect(s.status).toBe('won');expect(without.status).not.toBe('won');expect(growth).toBe(3);expect(yields).toBe(1);expect(s.mechanics.find(m=>m.id==='gardens')).toEqual({id:'gardens',harvestedIds:['harvest-0']});expect(s.mechanics.find(m=>m.id==='exits')).toEqual({id:'exits',departedIds:['harvest-0']});expect(s.goalProgress.find(g=>g.goalId==='harvest')!.completedIds).toEqual(['harvest-0']);
});
