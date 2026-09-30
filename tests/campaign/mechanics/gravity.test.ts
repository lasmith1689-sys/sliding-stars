import {expect,it} from 'vitest';
import {gravityState,gravityMerge} from '../fixtures/gravity';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {fallPieces} from '../../../src/campaign/engine/settle';
import {parseCampaignState} from '../../../src/campaign/schema';
import {parseCampaignLevel,parseCampaignEvents} from '../../../src/campaign/schema';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {createCampaignEngine,transition} from '../../../src/campaign/engine/turn';
import {refillPieces,resolveTerrainMatches} from '../../../src/campaign/engine/settle';
import {makeScene,applySceneEvents} from '../../../src/render/campaign/snapshot';
const module=()=>campaignModules.find(m=>m.id==='gravity');
it('a containing merge changes actual ordered fall to left with riders and a second merge restores down',()=>{
 const c=createContext(gravityState());module()?.onMerge?.(c,gravityMerge());
 expect(c.state.fixtures[0]).toMatchObject({direction:'left',at:{r:1,c:1}});fallPieces(c);
 expect(c.state.pieces[0]!.at).toEqual({r:1,c:0});expect(c.state.crew[0]!.at).toEqual({r:1,c:0});
 expect(c.state.geometry.refillSources.every(s=>s.at.c===2)).toBe(true);
 expect(c.state.pieces[1]!.at).toEqual({r:2,c:2});
 expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
 module()?.onMerge?.(c,gravityMerge('two'));fallPieces(c);
 expect(c.state.fixtures[0]).toMatchObject({direction:'down'});expect(c.state.pieces[0]!.at).toEqual({r:2,c:0});expect(c.state.crew[0]!.at).toEqual({r:2,c:0});
 expect(c.state.geometry.refillSources.every(s=>s.at.r===0)).toBe(true);
 expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
});
it.each([611,612,613,614,615])('lesson %s needs actual switched gravity, saves every turn and moves riders',id=>{
 const level=getAuthoredLessonLevel(id)!,disabled=createCampaignEngine(campaignModules.map(m=>m.id==='gravity'?{...m,onMerge:undefined}:m));
 let state=loadCampaignLevel(level),without=disabled.loadCampaignLevel(level),toggles=0,riderMoves=0;
 for(const action of lessonTeachingActions[id]!){const result=transition(state,action);expect(result.accepted).toBe(true);expect(transition(parseCampaignState(JSON.parse(JSON.stringify(state))),action)).toEqual(result);
  expect(parseCampaignEvents(result.events)).toEqual(result.events);toggles+=result.events.filter(e=>e.type==='gravity').length;riderMoves+=result.events.filter(e=>e.type==='move'&&e.passengerIds.length>0).length;
  expect([...applySceneEvents(makeScene(state),result.events).fixtures].sort((a,b)=>a.id.localeCompare(b.id))).toEqual([...makeScene(result.state).fixtures].sort((a,b)=>a.id.localeCompare(b.id)));state=result.state;
  const no=disabled.transition(without,action);if(no.accepted)without=no.state;
 }
 console.info('gravity lesson',id,'toggles',toggles,'rider moves',riderMoves,'disabled',without.status);
 expect(state.status).toBe('won');expect(without.status).not.toBe('won');expect(toggles).toBeGreaterThan(0);expect(riderMoves).toBeGreaterThan(0);expect(parseCampaignState(JSON.parse(JSON.stringify(state)))).toEqual(state);
});
it('actual containing terrain merge emits one topology change and opposite-edge source travel',()=>{
 const c=createContext(loadCampaignLevel(getAuthoredLessonLevel(611)!));
 const a=c.state.pieces.find(p=>p.at.r===1&&p.at.c===0)!,b=c.state.pieces.find(p=>p.at.r===1&&p.at.c===1)!;[a.at,b.at]=[b.at,a.at];
 expect(resolveTerrainMatches(c,{r:1,c:1},campaignModules)).toBe(true);fallPieces(c);refillPieces(c);
 expect(c.events.filter(e=>e.type==='gravity')).toHaveLength(1);
 const entries=c.events.filter(e=>e.type==='refill');expect(entries.length).toBeGreaterThan(0);
 for(const event of entries){expect(event.direction).toBe('left');expect(event.from.c).toBe(event.to.c+1);expect(event.to.c).toBe(2);const source=c.state.geometry.refillSources.find(s=>s.id===event.sourceId)!;expect(source.at).toEqual(event.to);expect(c.events.find(e=>e.type==='spawn'&&e.piece.id===event.pieceId)).toMatchObject({piece:{at:source.at}});}
 expect(new Set(c.state.pieces.map(p=>`${p.at.r},${p.at.c}`)).size).toBe(c.state.pieces.length);
 expect(parseCampaignEvents(c.events)).toEqual(c.events);
});
it('rejects forged orientation, ordered cells, source heads, chamber membership and ledgers',()=>{
 const c=createContext(gravityState());module()?.onMerge?.(c,gravityMerge());
 for(const mutate of [(s:typeof c.state)=>{const f=s.fixtures[0]!;if(f.kind==='gravity-switch')f.direction='down'},(s:typeof c.state)=>{s.geometry.gravitySegments[0]!.cells.reverse()},(s:typeof c.state)=>{s.geometry.refillSources[0]!.at.c=0},(s:typeof c.state)=>{s.geometry.chambers[0]!.cells.pop()},(s:typeof c.state)=>{const m=s.mechanics.find(m=>m.id==='gravity')!;m.toggleCount=2},(s:typeof c.state)=>{const m=s.mechanics.find(m=>m.id==='gravity')!;m.flippedIds=['not-a-switch']}]){const bad=structuredClone(c.state);mutate(bad);expect(()=>parseCampaignState(bad)).toThrow();}
 const inactive=gravityState().level;inactive.geometry.inactiveCells=[{r:0,c:0}];inactive.pieces=inactive.pieces.filter(p=>p.at.r!==0);expect(()=>parseCampaignLevel(inactive)).toThrow(/active terrain/);
 const overlap=gravityState().level;overlap.geometry.chambers.push({id:'overlap',cells:[{r:1,c:1}],directions:['down']});expect(()=>parseCampaignLevel(overlap)).toThrow(/unique/);
});
it('two real containing merges toggle down-left-down while actor passengers remain on their carrier',()=>{
 const c=createContext(gravityState());c.state.actors=[{id:'rover',kind:'rover',at:{r:0,c:2},routeId:null,routeIndex:0,passengerIds:['actor-rider']}];c.state.crew.push({...c.state.crew[0]!,id:'actor-rider',carrierId:'rover',at:{r:0,c:2}});
 for(const [i,direction] of ['left','down'].entries()){
  c.state.pieces=c.state.pieces.filter(p=>p.kind==='station');
  c.state.pieces.push(...[0,1,2].map(col=>({id:`merge-${i}-${col}`,kind:'tile' as const,tier:1 as const,at:{r:1,c:col}})),{id:`actor-floor-${i}`,kind:'tile',tier:4,at:{r:0,c:2}});
  c.state.crew[0]!.at={r:1,c:2};expect(resolveTerrainMatches(c,null,campaignModules)).toBe(true);fallPieces(c);
  expect(c.state.fixtures[0]).toMatchObject({direction});expect(c.state.crew[1]).toMatchObject({at:{r:0,c:2},carrierId:'rover'});expect(c.state.actors[0]!.at).toEqual({r:0,c:2});
 }
 expect(c.events.filter(e=>e.type==='gravity')).toHaveLength(2);
});
it('adjacency does not trigger and repeated processing of a containing junction toggles once',()=>{
 const c=createContext(gravityState()),adjacent=gravityMerge();adjacent.cells=adjacent.cells.map(p=>({...p,r:0}));module()?.onMerge?.(c,adjacent);
 expect(c.state.fixtures[0]).toMatchObject({direction:'down'});
 const junction=gravityMerge('junction');junction.cells.push({r:0,c:1},{r:2,c:1});junction.pieceIds.push('d','e');
 module()?.onMerge?.(c,junction);module()?.onMerge?.(c,junction);
 expect(c.state.fixtures[0]).toMatchObject({direction:'left'});expect(c.state.mechanics[0]).toMatchObject({toggleCount:1});
});
