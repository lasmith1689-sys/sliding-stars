import {expect,it} from 'vitest';
import {bridgeState,bridgeMerge} from '../fixtures/bridges';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {activeCell,gravitySegments,validateGravityCoverage} from '../../../src/campaign/engine/geometry';
import {fallPieces,refillPieces} from '../../../src/campaign/engine/settle';
import {parseCampaignLevel,parseCampaignState,parseCampaignEvents} from '../../../src/campaign/schema';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition,createCampaignEngine} from '../../../src/campaign/engine/turn';
import {resolveTerrainMatches} from '../../../src/campaign/engine/settle';
const module=()=>campaignModules.find(m=>m.id==='bridges');
// Two independently charged footprints in one column: the lower cell must have
// its own source, since the upper bridge may still be folded when it opens.
function independentBridges(splitSource:boolean){
 const level=structuredClone(getAuthoredLessonLevel(430)!);
 level.crew=[];level.actors=[];level.geometry.routes=[];level.geometry.endpoints=[];level.geometry.connections=[];
 level.geometry.inactiveCells=[{r:2,c:1},{r:3,c:1}];
 level.fixtures=[
  {id:'upper',kind:'bridge',at:{r:1,c:1},cells:[{r:2,c:1}],connectionIds:[],hits:0,active:false},
  {id:'lower',kind:'bridge',at:{r:3,c:2},cells:[{r:3,c:1}],connectionIds:[],hits:0,active:false},
 ];
 level.mechanics=[{id:'bridges',fixtureIds:['upper','lower']}];
 level.goals=[{id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:['upper','lower']}}];
 level.pieces=level.pieces.filter(p=>p.at.r!==2||p.at.c!==1).map(p=>
  p.at.r===3&&(p.at.c===3||p.at.c===4)?{id:p.id,at:p.at,kind:'tile' as const,tier:p.at.c===3?2 as const:1 as const}:p);
 level.pieces.push({id:'bottom-match',kind:'tile',tier:1,at:{r:3,c:2}});
 if(splitSource){
  const column=level.geometry.gravitySegments.find(s=>s.cells.some(p=>p.r===3&&p.c===1))!;
  column.cells=column.cells.filter(p=>p.r!==3);
  level.geometry.gravitySegments.push({...column,id:'lower-segment',cells:[{r:3,c:1}]});
  level.geometry.refillSources.push({id:'lower-source',segmentId:'lower-segment',at:{r:3,c:1}});
 }
 return level;
}
const lowerOpening={type:'swap' as const,from:{r:2,c:3},to:{r:3,c:3}};
it('rejects dependent bridge refill before an accepted level and one-charge save can crash on a real swap',()=>{
 const level=independentBridges(false);
 // Before the topology guard this whole path reaches ordinary refill and throws
 // "no refill source reaches 3,1", after opening only the lower bridge.
 expect(()=>{
  const state=loadCampaignLevel(parseCampaignLevel(level));
  const lower=state.fixtures.find(f=>f.id==='lower')!;if(lower.kind==='bridge')lower.hits=1;
  transition(parseCampaignState(JSON.parse(JSON.stringify(state))),lowerOpening);
 }).toThrow(/level\.bridges.*refill/i);
 expect(()=>parseCampaignLevel(level)).toThrow(/refill/i);
});
it('rejects one-charge snapshots embedding independently unsafe refill ownership',()=>{
 const state=loadCampaignLevel(independentBridges(true));
 const lower=state.fixtures.find(f=>f.id==='lower')!;if(lower.kind==='bridge')lower.hits=1;
 state.level=independentBridges(false);state.geometry=structuredClone(state.level.geometry);
 expect(()=>parseCampaignState(JSON.parse(JSON.stringify(state)))).toThrow(/level\.bridges.*refill/i);
});
it('rejects a saved runtime that joins separately sourced bridge segments',()=>{
 const state=loadCampaignLevel(independentBridges(true));
 const lower=state.fixtures.find(f=>f.id==='lower')!;if(lower.kind==='bridge')lower.hits=1;
 state.geometry=independentBridges(false).geometry;
 expect(()=>parseCampaignState(JSON.parse(JSON.stringify(state)))).toThrow(/bridge refill topology changed/i);
});
it('rejects a bridge fed through an inactive cell with no activating owner',()=>{
 const level=independentBridges(false);level.fixtures=level.fixtures.filter(f=>f.id==='lower');
 level.mechanics=[{id:'bridges',fixtureIds:['lower']}];
 level.goals=[{id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:['lower']}}];
 expect(()=>parseCampaignLevel(level)).toThrow(/refill/i);
});
it('one atomic bridge may open consecutive absent cells in a shared sourced segment',()=>{
 const level=independentBridges(false),bridge=level.fixtures[0]!;
 if(bridge.kind==='bridge')bridge.cells.push({r:3,c:1});level.fixtures=[bridge];
 level.mechanics=[{id:'bridges',fixtureIds:['upper']}];
 level.goals=[{id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:['upper']}}];
 const state=loadCampaignLevel(level);if(state.fixtures[0]?.kind==='bridge')state.fixtures[0].hits=1;
 const result=transition(parseCampaignState(state),{type:'swap',from:{r:0,c:1},to:{r:1,c:1}});
 expect(result.accepted).toBe(true);expect(result.state.status).toBe('won');
 expect(result.state.geometry.inactiveCells).toEqual([]);
 for(const r of [2,3])expect(result.state.pieces.some(p=>p.at.r===r&&p.at.c===1)).toBe(true);
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
});
it.each(['upper','lower'])('separately sourced %s bridge opens and refills while the other stays folded',id=>{
 const state=loadCampaignLevel(independentBridges(true)),bridge=state.fixtures.find(f=>f.id===id)!;
 if(bridge.kind==='bridge')bridge.hits=1;
 const saved=parseCampaignState(JSON.parse(JSON.stringify(state)));
 const action=id==='lower'?lowerOpening:{type:'swap' as const,from:{r:0,c:1},to:{r:1,c:1}};
 const result=transition(saved,action),openedCell={r:id==='upper'?2:3,c:1};
 expect(result.accepted).toBe(true);
 expect(result.state.fixtures.find(f=>f.id===id)).toMatchObject({hits:2,active:true});
 expect(result.state.fixtures.find(f=>f.id!==id)).toMatchObject({active:false});
 expect(activeCell(result.state.geometry,openedCell)).toBe(true);
 expect(activeCell(result.state.geometry,{r:id==='upper'?3:2,c:1})).toBe(false);
 expect(result.state.pieces.some(p=>p.at.r===openedCell.r&&p.at.c===openedCell.c)).toBe(true);
 expect(parseCampaignState(JSON.parse(JSON.stringify(result.state)))).toEqual(result.state);
 expect(transition(saved,action)).toEqual(result);
});
it('two distinct adjacent merges permanently activate only authored cells and connections',()=>{
 const c=createContext(bridgeState()),before=structuredClone(c.state);module()?.onMerge?.(c,bridgeMerge());
 expect(c.state.fixtures[0]).toMatchObject({hits:1,active:false});expect(before.geometry.inactiveCells.filter(p=>activeCell(c.state.geometry,p))).toHaveLength(0);
 module()?.onMerge?.(c,bridgeMerge());expect(c.state.fixtures[0]).toMatchObject({hits:1});
 module()?.onMerge?.(c,bridgeMerge('two'));expect(c.state.fixtures[0]).toMatchObject({hits:2,active:true});
 expect(c.state.geometry.inactiveCells).toEqual([]);expect(c.state.geometry.connections[0]!.active).toBe(true);
 expect(c.state.pieces).toEqual(before.pieces);expect(c.state.geometry).toEqual({...before.geometry,inactiveCells:[],connections:[{...before.geometry.connections[0]!,active:true}]});
 expect(c.state.goalProgress[0]!.completedIds).toEqual(['bridge']);expect(c.state.mechanics).toEqual([{id:'bridges',activatedIds:['bridge']}]);
 module()?.onMerge?.(c,bridgeMerge('three'));expect(c.events.filter(e=>e.type==='geometry')).toHaveLength(1);expect(parseCampaignEvents(c.events)).toEqual(c.events);
});
it('non-adjacent matches do not charge; a large adjacent match counts once',()=>{
 const c=createContext(bridgeState()),far=bridgeMerge();far.cells=[{r:8,c:0},{r:8,c:1},{r:8,c:2}];module()?.onMerge?.(c,far);expect(c.state.fixtures[0]).toMatchObject({hits:0});
 const large=bridgeMerge('large');large.cells.push({r:1,c:0},{r:1,c:2});large.pieceIds.push('d','e');module()?.onMerge?.(c,large);expect(c.state.fixtures[0]).toMatchObject({hits:1,active:false});
});
it('activation preserves identities before ordinary rebuilt gravity and refill move them',()=>{
 const c=createContext(bridgeState());c.state.pieces.push({id:'falling',kind:'tile',tier:4,at:{r:1,c:1}});
 expect(gravitySegments(c.state).find(r=>r.segmentId==='col-1')!.cells).toHaveLength(2);
 module()?.onMerge?.(c,bridgeMerge());module()?.onMerge?.(c,bridgeMerge('two'));
 expect(c.state.pieces.find(p=>p.id==='falling')!.at).toEqual({r:1,c:1});
 expect(gravitySegments(c.state).find(r=>r.segmentId==='col-1')!.cells).toHaveLength(3);
 fallPieces(c);refillPieces(c);expect(c.state.pieces.find(p=>p.id==='falling')!.at).toEqual({r:2,c:1});expect(()=>validateGravityCoverage(c.state)).not.toThrow();
});
it('save/reload retains one charge and permanent activation; forged openings fail',()=>{
 const c=createContext(bridgeState());module()?.onMerge?.(c,bridgeMerge());expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
 const restored=createContext(parseCampaignState(JSON.parse(JSON.stringify(c.state))));module()?.onMerge?.(restored,bridgeMerge('two'));module()?.onMerge?.(c,bridgeMerge('two'));expect(restored.state).toEqual(c.state);
 expect(c.state.fixtures[0]).toMatchObject({active:true});expect(parseCampaignState(c.state)).toEqual(c.state);
 const bad=structuredClone(c.state);bad.geometry.inactiveCells=[{r:2,c:1}];expect(()=>parseCampaignState(bad)).toThrow(/bridge|inactive/i);
});
it('rejects malformed bridge cells, connections, and refill gaps before consumers',()=>{
 const l=bridgeState().level;l.geometry.connections=[];expect(()=>parseCampaignLevel(l)).toThrow(/bridge/i);
 const gap=bridgeState().level;gap.geometry.inactiveCells=[{r:1,c:0}];const b=gap.fixtures[0]!;if(b.kind==='bridge')b.cells=[{r:1,c:0}];gap.geometry.connections=[];if(b.kind==='bridge')b.connectionIds=[];gap.pieces=[];expect(()=>parseCampaignLevel(gap)).toThrow(/refill/i);
});
it.each([426,427,428,429,430])('lesson %s really opens new cells, survives reload and needs its bridge',id=>{
 const level=getAuthoredLessonLevel(id)!,disabled=createCampaignEngine(campaignModules.map(m=>m.id==='bridges'?{...m,onMerge:undefined}:m));
 let s=loadCampaignLevel(level),without=disabled.loadCampaignLevel(level);const openings:string[]=[];
 for(const action of lessonTeachingActions[id]!){
  const restored=parseCampaignState(JSON.parse(JSON.stringify(s))),r=transition(s,action);expect(r).toEqual(transition(restored,action));expect(r.accepted).toBe(true);expect(parseCampaignEvents(r.events)).toEqual(r.events);
  openings.push(...r.events.flatMap(e=>e.type==='bridge'&&e.phase==='opened'?[e.bridgeId]:[]));s=r.state;const no=disabled.transition(without,action);if(no.accepted)without=no.state;
 }
 expect(s.status).toBe('won');expect(without.status).not.toBe('won');expect(openings.sort()).toEqual(level.fixtures.filter(f=>f.kind==='bridge').map(f=>f.id).sort());
 expect(s.geometry.inactiveCells).toEqual([]);expect(parseCampaignState(JSON.parse(JSON.stringify(s)))).toEqual(s);
 expect(level.geometry.inactiveCells.every(at=>s.pieces.some(p=>p.at.r===at.r&&p.at.c===at.c))).toBe(true);
});
it('a real junction counts once while two distinct cascade merges may open in one turn',()=>{
 const c=createContext(bridgeState());c.state.geometry.inactiveCells=[];c.state.pieces=[{r:0,c:1},{r:1,c:0},{r:1,c:1},{r:1,c:2},{r:2,c:1}].map((at,i)=>({id:`p-${i}`,kind:'tile',tier:1,at}));
 resolveTerrainMatches(c,null,campaignModules);expect(c.events.filter(e=>e.type==='merge')).toHaveLength(1);expect(c.state.fixtures[0]).toMatchObject({hits:1});
 // A fresh qualifying terrain match in a later pass is a second real merge.
 c.state.pieces=[0,1,2].map(col=>({id:`q-${col}`,kind:'tile',tier:2,at:{r:0,c:col}}));resolveTerrainMatches(c,null,campaignModules);
 expect(c.events.filter(e=>e.type==='merge')).toHaveLength(2);expect(c.state.fixtures[0]).toMatchObject({active:true,hits:2});
});
it('rejected absent-cell actions cannot tick or charge a hinge',()=>{
 const s=loadCampaignLevel(getAuthoredLessonLevel(426)!),r=transition(s,{type:'swap',from:{r:1,c:1},to:{r:2,c:1}});expect(r.accepted).toBe(false);expect(r.state).toBe(s);expect(r.events).toEqual([]);
});
it('rejects overlapping bridge ownership, rewired saves and bridges on current lanes',()=>{
 const l=bridgeState().level;l.fixtures.push({...l.fixtures[0]!,id:'other',at:{r:2,c:0}});l.mechanics=[{id:'bridges',fixtureIds:['bridge','other']}];expect(()=>parseCampaignLevel(l)).toThrow(/bridge/i);
 const s=bridgeState();s.geometry.gravitySegments[1]!.cells.pop();expect(()=>parseCampaignState(s)).toThrow(/bridge/i);
 const current=bridgeState().level;current.geometry.routes=[{id:'current',loop:true,cells:[{r:1,c:1},{r:1,c:2}]}];current.mechanics.push({id:'currents',routeIds:['current']});expect(()=>parseCampaignLevel(current)).toThrow(/Current lane/);
});
