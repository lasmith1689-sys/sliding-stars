import {expect,it} from 'vitest';
import {portalState} from '../fixtures/portals';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {parseCampaignLevel,parseCampaignState,parseCampaignEvents} from '../../../src/campaign/schema';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition,createCampaignEngine} from '../../../src/campaign/engine/turn';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {fallPieces,refillPieces} from '../../../src/campaign/engine/settle';
import {validateCandidate,validateForRelease} from '../../../src/campaign/validator';
const module=()=>campaignModules.find(m=>m.id==='portals')!;
it('transfers terrain and its real riders before refill, once per piece per transition',()=>{
 const c=createContext(portalState());expect(module()?.beforeRefill?.(c)).toBe(true);
 expect(c.state.pieces[0]!.at).toEqual({r:0,c:2});expect(c.state.crew[0]!.at).toEqual({r:0,c:2});
 c.state.pieces[0]!.at={r:2,c:0};c.state.crew[0]!.at={r:2,c:0};expect(module().beforeRefill!(c)).toBe(false);
 expect(c.events.filter(e=>e.type==='portal'&&e.phase==='transferred'&&e.pieceId==='tile-1')).toHaveLength(1);
 expect(parseCampaignEvents(c.events)).toEqual(c.events);
 c.state.transportedThisTurn=[];expect(module().beforeRefill!(c)).toBe(true);
});
it.each(['tile','pod','station','crew','actor','comet','inactive'] as const)('occupied receiver waits without overwrite: %s',kind=>{
 const c=createContext(portalState()),at={r:0,c:2};
 if(kind==='tile')c.state.pieces.push({id:'block',kind,tier:2,at});
 if(kind==='pod')c.state.pieces.push({id:'block',kind,passengerIds:[],at});
 if(kind==='station')c.state.pieces.push({id:'block',kind,facing:'left',at});
 if(kind==='crew')c.state.crew.push({...c.state.crew[0]!,id:'other',at});
 if(kind==='actor')c.state.actors.push({id:'rover',kind:'rover',at,passengerIds:[],routeId:null,routeIndex:0});
 if(kind==='comet')c.state.fixtures.push({id:'comet',kind:'comet',at:{r:0,c:1},cells:[{r:0,c:1},at],hp:1});
 if(kind==='inactive')c.state.geometry.inactiveCells.push(at);
 const before=structuredClone(c.state);expect(module()?.beforeRefill?.(c)).toBe(false);expect(c.state).toEqual(before);
 expect(c.events).toContainEqual(expect.objectContaining({type:'portal',phase:'waiting'}));
});
it('validates unsourced discharge topology at authored and saved boundaries',()=>{
 const s=portalState();expect(parseCampaignState(JSON.parse(JSON.stringify(s)))).toEqual(s);
 s.geometry.refillSources.push({id:'bad',at:{r:0,c:2},segmentId:'col-2'});expect(()=>parseCampaignState(s)).toThrow(/portal/i);
 const l=portalState().level,p=l.fixtures[0]!;if(p.kind==='portal')p.receiver={r:1,c:2};expect(()=>parseCampaignLevel(l)).toThrow(/portal/i);
});
it('retains transport history when a generated piece is consumed, but rejects forged identities',()=>{
 const s=portalState();s.nextEntityId=5;s.transportedThisTurn=['entity-3'];s.mechanics=[{id:'portals',transferredPieceIds:['entity-3']}];
 expect(parseCampaignState(JSON.parse(JSON.stringify(s)))).toEqual(s);
 s.transportedThisTurn=['crew-1'];expect(()=>parseCampaignState(s)).toThrow(/transportedThisTurn/i);
});
it('a cleared receiver accepts on a later settle pass; waiting does not consume the guard',()=>{
 const c=createContext(portalState());c.state.pieces.push({id:'block',at:{r:0,c:2},kind:'tile',tier:1});expect(module().beforeRefill!(c)).toBe(false);
 c.state.pieces.pop();expect(module().beforeRefill!(c)).toBe(true);expect(c.state.transportedThisTurn).toEqual(['tile-1']);
});
it('an actor-carried guest stays aboard while its underlying terrain travels',()=>{
 const c=createContext(portalState());c.state.crew[0]!.carrierId='rover';c.state.actors.push({id:'rover',kind:'rover',at:{r:2,c:0},routeId:null,routeIndex:0,passengerIds:['crew-1']});
 expect(module().beforeRefill!(c)).toBe(true);expect(c.state.crew[0]!.at).toEqual({r:2,c:0});expect(c.state.actors[0]!.at).toEqual({r:2,c:0});expect(c.events.find(e=>e.type==='portal')).toMatchObject({passengerIds:[]});
});
it.each(['pod','cargo'] as const)('attached %s passengers travel as a single owned group',kind=>{
 const c=createContext(portalState()),at={r:2,c:0};c.state.pieces=[kind==='pod'?{id:'ride',kind,at,passengerIds:['crew-1']}:{id:'ride',kind,at,cargoKind:'capsule',destinationId:'exit',passengerIds:['crew-1']}];c.state.crew[0]!.carrierId='ride';
 expect(module().beforeRefill!(c)).toBe(true);expect(c.state.crew[0]).toMatchObject({at:{r:0,c:2},carrierId:'ride'});expect(c.events.filter(e=>e.type==='move'&&e.entityId==='crew-1')).toHaveLength(1);
});
it('receiver holes receive no ordinary spawn and preserve coverage through inactive downstream cells',()=>{
 const c=createContext(portalState());c.state.pieces=[];c.state.crew=[];c.state.geometry.inactiveCells=[{r:1,c:2}];
 refillPieces(c);expect(c.state.pieces.every(p=>p.at.c!==2)).toBe(true);
 c.state.pieces.push({id:'receive',kind:'tile',tier:3,at:{r:0,c:2}});fallPieces(c);expect(c.state.pieces.find(p=>p.id==='receive')!.at).toEqual({r:0,c:2});
});
it.each([376,377,378,379,380])('lesson %s has real transport, preserves save/reload, and is causal',id=>{
 const level=getAuthoredLessonLevel(id)!,disabled=createCampaignEngine(campaignModules.map(m=>m.id==='portals'?{...m,beforeRefill:undefined}:m));
 let s=loadCampaignLevel(level),without=disabled.loadCampaignLevel(level),transfers=0;
 expect(s.status).toBe('playing');
 for(const a of lessonTeachingActions[id]!){
  const restored=parseCampaignState(JSON.parse(JSON.stringify(s))),r=transition(s,a);expect(r).toEqual(transition(restored,a));expect(r.accepted).toBe(true);
  const moved=r.events.filter(e=>e.type==='portal'&&e.phase==='transferred');transfers+=moved.length;
  expect(new Set(moved.map(e=>e.type==='portal'?e.pieceId:'')).size).toBe(moved.length);
  s=r.state;const no=disabled.transition(without,a);if(no.accepted)without=no.state;
 }
 expect(s.status).toBe('won');expect(transfers).toBeGreaterThan(0);expect(without.status).not.toBe('won');
});
it('once-per-piece persists across later environment settling; next accepted transition resets it',()=>{
 const engine=createCampaignEngine(campaignModules.map(m=>m.id==='portals'?{...m,environment(c){const p=c.state.pieces.find(p=>p.kind==='pod');if(!p||!c.state.transportedThisTurn.includes(p.id))return;const displaced=c.state.pieces.find(p=>p.at.r===2&&p.at.c===0);if(displaced)displaced.at={...p.at};p.at={r:2,c:0};for(const crew of c.state.crew.filter(q=>q.carrierId===p.id))crew.at={...p.at};}}:m));
 let s=engine.loadCampaignLevel(getAuthoredLessonLevel(376)!);s=engine.transition(s,lessonTeachingActions[376]![0]!).state;const r=engine.transition(s,lessonTeachingActions[376]![1]!);
 expect(r.events.filter(e=>e.type==='portal'&&e.phase==='transferred'&&e.pieceId==='tile-2-1')).toHaveLength(1);
});
it('rejected actions return the same state and boosters can transport without ticking clocks',()=>{
 const s=loadCampaignLevel(getAuthoredLessonLevel(376)!);const bad=transition(s,{type:'swap',from:{r:0,c:0},to:{r:0,c:2}});expect(bad.accepted).toBe(false);expect(bad.state).toBe(s);expect(bad.events).toEqual([]);
 const r=transition(s,{type:'booster',kind:'demo',at:{r:0,c:3}});expect(r.accepted).toBe(true);expect(r.state.turn).toBe(0);expect(r.events.some(e=>e.type==='portal'&&e.phase==='transferred')).toBe(true);expect(r.events.some(e=>e.type==='need'&&e.after!==null&&e.before!==null&&e.after<e.before)).toBe(false);
});
it('rejects missing, rewired, multiply sourced, or multiply received portal topology at save boundaries',()=>{
 for(const mutate of [(s:ReturnType<typeof portalState>)=>{s.fixtures=[];},(s:ReturnType<typeof portalState>)=>{const p=s.fixtures[0]!;if(p.kind==='portal')p.segmentId='col-1';},(s:ReturnType<typeof portalState>)=>{s.geometry.gravitySegments[2]!.cells.shift();}]){const s=portalState();mutate(s);expect(()=>parseCampaignState(s)).toThrow();}
 const l=portalState().level;l.fixtures.push({id:'second',kind:'portal',at:{r:1,c:0},receiver:{r:0,c:2},segmentId:'col-2'});l.mechanics=[{id:'portals',fixtureIds:['portal','second']}];expect(()=>parseCampaignLevel(l)).toThrow(/unique receiver/);
});
it('rejects portal chains and lane overlap but accepts spatially separate currents',()=>{
 const l=portalState().level;l.fixtures.push({id:'second',kind:'portal',at:{r:0,c:2},receiver:{r:0,c:1},segmentId:'col-1'});l.mechanics=[{id:'portals',fixtureIds:['portal','second']}];expect(()=>parseCampaignLevel(l)).toThrow(/another portal/);
 const separate=portalState().level;separate.geometry.routes=[{id:'current',loop:true,cells:[{r:1,c:1},{r:2,c:1}]}];separate.mechanics.push({id:'currents',routeIds:['current']});expect(()=>parseCampaignLevel(separate)).not.toThrow();separate.geometry.routes[0]!.cells=[{r:1,c:0},{r:2,c:0}];expect(()=>parseCampaignLevel(separate)).toThrow(/Portals cannot overlap/);
});
it('a blocked receiver is legal to wait, but an unresolved deadlocked design has no release admission',()=>{
 const l=getAuthoredLessonLevel(376)!;expect(validateCandidate(l)).toEqual([]);expect(validateForRelease(l,{status:'timeout',explored:1})).toContainEqual(expect.objectContaining({code:'unresolved'}));
});
it('fifty delayed no-failure pod slides retain a safe guest and the receiver can still be cleared to win',()=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(376)!);
 for(let i=0;i<50;i++){const r=transition(s,{type:'swap',from:{r:2,c:0},to:{r:2,c:1}});expect(r.accepted).toBe(true);s=parseCampaignState(JSON.parse(JSON.stringify(r.state)));expect(s.status).toBe('playing');expect(s.crew[0]).toMatchObject({status:'active',rescueMoves:null,carrierId:'tile-2-1'});}
 for(const action of lessonTeachingActions[376]!)s=transition(s,action).state;expect(s.status).toBe('won');
});
it('the real final receiver-clearing match transfers its pod before any ordinary refill spawn',()=>{
 let s=loadCampaignLevel(getAuthoredLessonLevel(376)!);s=transition(s,lessonTeachingActions[376]![0]!).state;const r=transition(s,lessonTeachingActions[376]![1]!);
 const transport=r.events.find(e=>e.type==='portal'&&e.phase==='transferred'&&e.pieceId==='tile-2-1')!;
 const mergeOutputs=new Set(r.events.flatMap(e=>e.type==='merge'?r.events.filter(p=>p.type==='spawn'&&p.sequenceId>e.sequenceId).slice(0,1).flatMap(p=>p.type==='spawn'?[p.piece.id]:[]):[]));
 const refill=r.events.find(e=>e.type==='spawn'&&!mergeOutputs.has(e.piece.id));expect(refill).toBeDefined();expect(transport.sequenceId).toBeLessThan(refill!.sequenceId);
});
