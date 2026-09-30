import {expect,it} from 'vitest';
import {baseLevel,mergeSwap} from '../fixtures/base';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {parseCampaignState} from '../../../src/campaign/schema';
import {makeScene,applySceneEvents} from '../../../src/render/campaign/snapshot';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {CampaignSession,createCampaignSave} from '../../../src/session/campaignSession';
import {MemoryStorage} from '../../session/fixtures/legacy';
import {loadSave} from '../../../src/session/storage';

export function whaleLevel(){const l=baseLevel();l.id=187;l.chapter=4;l.geometry.routes=[{id:'loop',loop:true,cells:[{r:1,c:0},{r:1,c:1},{r:2,c:1},{r:2,c:0}]}];l.actors=[{id:'whale',kind:'moonwhale',at:{r:1,c:0},routeId:'loop',routeIndex:0,passengerIds:['crew'],landing:{r:0,c:0},transferRequested:false}];l.crew[0]={...l.crew[0]!,at:{r:1,c:0},carrierId:'whale'};l.mechanics=[{id:'moonwhales',actorIds:['whale']}];l.goals=[{id:'transfer',type:'transferCreatures',eligible:{type:'ids',ids:['crew']}}];return l;}
const module=()=>campaignModules.find(m=>m.id==='moonwhales')!;
it('requests through a real adjacent merge, retains the unsafe rider, and takes exactly one loop step',()=>{
 const s=loadCampaignLevel(whaleLevel()),r=transition(s,mergeSwap);expect(r.accepted).toBe(true);
 const whale=r.state.actors[0]!;expect(whale.kind==='moonwhale'&&whale.transferRequested).toBe(true);expect(whale.at).toEqual({r:1,c:1});expect(r.state.crew[0]!.carrierId).toBe('whale');expect(r.state.crew[0]!.at).toEqual(whale.at);expect(r.events.filter(e=>e.type==='move'&&e.entityId==='whale')).toHaveLength(1);
 expect(parseCampaignState(JSON.parse(JSON.stringify(r.state)))).toEqual(r.state);
});
it('transfers only to its adjacent safe mark, owns a pod atomically, and credits once',()=>{
 const l=whaleLevel();l.pieces[0]={id:'pod',kind:'pod',at:{r:0,c:0},passengerIds:[]};const c=createContext(loadCampaignLevel(l)),whale=c.state.actors[0]!;if(whale.kind!=='moonwhale')throw Error();whale.transferRequested=true;
 module().transferActor!(c,'whale');expect(c.state.crew[0]!.carrierId).toBe('pod');expect(c.state.crew[0]!.status).toBe('active');expect(c.state.pieces[0]).toMatchObject({passengerIds:['crew']});expect(whale.passengerIds).toEqual([]);expect(whale.transferRequested).toBe(false);expect(c.state.goalProgress[0]!.completedIds).toEqual(['crew']);
 module().transferActor!(c,'whale');expect(c.events.filter(e=>e.type==='transfer')).toHaveLength(1);expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
});
it.each(['unsafe','crew','actor','fixture','distant'] as const)('keeps a queued request and passenger aboard when landing is %s',block=>{
 const l=whaleLevel();l.pieces[0]={id:'safe',kind:'tile',tier:4,at:{r:0,c:0}};const c=createContext(loadCampaignLevel(l)),w=c.state.actors[0]!;if(w.kind!=='moonwhale')throw Error();w.transferRequested=true;
 if(block==='unsafe')c.state.pieces[0]={id:'unsafe',kind:'tile',tier:3,at:w.landing};if(block==='crew')c.state.crew.push({...c.state.crew[0]!,id:'other',at:w.landing,carrierId:null});if(block==='actor')c.state.actors.push({id:'other',kind:'rover',at:w.landing,routeId:null,routeIndex:0,passengerIds:[]});if(block==='fixture')c.state.fixtures.push({id:'ice',kind:'ice',at:w.landing,hp:1});if(block==='distant')w.landing={r:3,c:3};
 module().transferActor!(c,'whale');expect(c.state.crew[0]!.carrierId).toBe('whale');expect(w.transferRequested).toBe(true);expect(c.events).toEqual([]);
});
it('never skips a blocked next step, closes the loop, and continues empty',()=>{
 const c=createContext(loadCampaignLevel(whaleLevel())),w=c.state.actors[0]!;if(w.kind!=='moonwhale')throw Error();c.state.fixtures.push({id:'ice',kind:'ice',at:{r:1,c:1},hp:1});module().stepActor!(c,'whale');expect(w.routeIndex).toBe(0);c.state.fixtures=[];
 for(let i=0;i<4;i++)module().stepActor!(c,'whale');expect(w.routeIndex).toBe(0);expect(w.at).toEqual({r:1,c:0});w.passengerIds=[];c.state.crew=[];module().stepActor!(c,'whale');expect(w.routeIndex).toBe(1);
});
it('rejects open, jumping and unreachable landing loops',()=>{
 for(const kind of ['open','jump','landing']){const l=whaleLevel();if(kind==='open')l.geometry.routes[0]!.loop=false;if(kind==='jump')l.geometry.routes[0]!.cells[3]={r:3,c:0};if(kind==='landing'&&l.actors[0]!.kind==='moonwhale')l.actors[0]!.landing={r:3,c:3};expect(()=>loadCampaignLevel(l)).toThrow();}
});
it('supports a two-stop repeating route with an orthogonal closing step',()=>{
 const l=whaleLevel();l.geometry.routes[0]!.cells=[{r:1,c:0},{r:1,c:1}];const c=createContext(loadCampaignLevel(l));
 module().stepActor!(c,'whale');expect(c.state.actors[0]!.at).toEqual({r:1,c:1});module().stepActor!(c,'whale');expect(c.state.actors[0]!.at).toEqual({r:1,c:0});expect(c.state.crew[0]!.at).toEqual({r:1,c:0});expect(c.state.crew[0]!.carrierId).toBe('whale');
 l.geometry.routes[0]!.cells=[{r:1,c:0}];expect(()=>loadCampaignLevel(l)).toThrow(/orthogonally/);
});
it('projects real pod passenger ownership from transfer events',()=>{
 const l=whaleLevel();l.pieces[0]={id:'pod',kind:'pod',at:{r:0,c:0},passengerIds:[]};const c=createContext(loadCampaignLevel(l)),w=c.state.actors[0]!;if(w.kind!=='moonwhale')throw Error();w.transferRequested=true;const before=makeScene(c.state);
 module().transferActor!(c,'whale');const projected=applySceneEvents(before,c.events),actual=makeScene(c.state);
 expect(projected.pieces.find(p=>p.id==='pod')).toEqual(actual.pieces.find(p=>p.id==='pod'));expect(projected.crew).toEqual(actual.crew);expect(projected.actors).toEqual(actual.actors);
});
it('allows an adjacent clear safe landing on another loop stop',()=>{
 const l=whaleLevel(),w=l.actors[0]!;if(w.kind!=='moonwhale')throw Error();w.landing={r:1,c:1};l.pieces=l.pieces.map(p=>p.at.r===1&&p.at.c===1?{id:p.id,at:p.at,kind:'tile',tier:4}:p);
 const c=createContext(loadCampaignLevel(l)),actor=c.state.actors[0]!;if(actor.kind!=='moonwhale')throw Error();actor.transferRequested=true;module().transferActor!(c,'whale');expect(c.state.crew[0]!.carrierId).toBeNull();expect(c.state.crew[0]!.at).toEqual(w.landing);
 module().stepActor!(c,'whale');expect(actor.routeIndex).toBe(0); // A landed guest occupies this next track stop.
});
it('retains an actually requested unsafe transfer through save/reload and reaches the safe mark by real play',()=>{
 const store=new MemoryStorage(),session=new CampaignSession(createCampaignSave(getAuthoredLessonLevel(188)!),store),actions=lessonTeachingActions[188]!;
 const first=session.dispatch(actions[0]!)!;expect(first.accepted).toBe(true);expect(first.state.actors[0]).toMatchObject({transferRequested:true,passengerIds:['whale-guest']});expect(first.state.crew[0]!.carrierId).toBe('moonwhale');
 const reload=new CampaignSession(loadSave(store)!,store);session.finishPresentation();reload.finishPresentation();
 for(const action of actions.slice(1)){const a=session.dispatch(action)!,b=reload.dispatch(action)!;expect(b).toEqual(a);session.finishPresentation();reload.finishPresentation();}
 if(reload.save.active.kind!=='campaign')throw Error();expect(reload.save.active.state.status).toBe('won');expect(reload.save.active.state.crew[0]!.carrierId).toBeNull();expect(reload.save.active.state.mechanics).toContainEqual({id:'moonwhales',transferredIds:['whale-guest']});
});
it('rejects moves without a clock effect and boosters never step or release the whale',()=>{
 const s=loadCampaignLevel(whaleLevel()),w=s.actors[0]!;if(w.kind!=='moonwhale')throw Error();w.transferRequested=true;
 const rejected=transition(s,{type:'swap',from:w.at,to:{r:1,c:1}});expect(rejected.accepted).toBe(false);expect(rejected.state).toBe(s);expect(rejected.events).toEqual([]);
 const boosted=transition(s,{type:'booster',kind:'demo',at:{r:0,c:3}});expect(boosted.accepted).toBe(true);expect(boosted.state.turn).toBe(0);expect(boosted.state.actors[0]).toEqual(w);expect(boosted.state.crew[0]!.carrierId).toBe('whale');expect(boosted.events.some(e=>e.type==='transfer'||e.type==='turn')).toBe(false);
});
