import {expect,it} from 'vitest';
import type {CampaignCrew} from '../../../src/campaign/types';
import {baseLevel} from '../fixtures/base';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {legalActions} from '../../../src/campaign/engine/actions';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {parseCampaignLevel,parseCampaignState} from '../../../src/campaign/schema';
import {CampaignSession,createCampaignSave} from '../../../src/session/campaignSession';
import {loadSave} from '../../../src/session/storage';
import {MemoryStorage} from '../../session/fixtures/legacy';

export const arriving=(id='new-crew',at={r:0,c:0}):CampaignCrew=>({id,at,status:'active',carrierId:null,rescueMoves:20,shelterMoves:null,shelterStarted:false,vipId:null});
export function waveLevel(){const l=baseLevel();l.id=147;l.chapter=3;l.crew=[];l.arrivals=[{id:'wave-a',turn:1,entry:{r:0,c:0},crew:[arriving()],status:'pending'}];l.mechanics=[{id:'waves',arrivalIds:['wave-a']}];l.goals=[{id:'home',type:'homeCrew',eligible:{type:'sources',sourceIds:['wave-a'],target:1}}];return l;}
const admit=(c:ReturnType<typeof createContext>)=>campaignModules.find(m=>m.id==='waves')!.admit!(c);
it('keeps required future crew pending and admits exactly once with a full arrival need',()=>{
 const s=loadCampaignLevel(waveLevel());expect(s.status).toBe('playing');
 const r=transition(s,legalActions(s)[0]!);expect(r.accepted).toBe(true);
 expect(r.state.arrivals[0]!.status).toBe('admitted');expect(r.state.crew[0]!.rescueMoves).toBe(20);
 expect(r.events.filter(e=>e.type==='arrival')).toHaveLength(1);
 const c=createContext(structuredClone(r.state));admit(c);expect(c.state.crew).toHaveLength(1);expect(c.events).toEqual([]);
});
it.each(['crew','actor','fixture','special'] as const)('waits behind %s without leapfrogging a due later wave',blocker=>{
 const l=waveLevel();l.arrivals.push({id:'wave-b',turn:1,entry:{r:0,c:1},crew:[arriving('later',{r:0,c:1})],status:'pending'});l.mechanics=[{id:'waves',arrivalIds:['wave-a','wave-b']}];
 const c=createContext(loadCampaignLevel(l));c.state.turn=1;
 if(blocker==='crew')c.state.crew.push(arriving('blocker'));
 if(blocker==='actor')c.state.actors.push({id:'blocker',kind:'rover',at:{r:0,c:0},routeId:null,routeIndex:0,passengerIds:[]});
 if(blocker==='fixture')c.state.fixtures.push({id:'blocker',kind:'ice',at:{r:0,c:0},hp:1});
 if(blocker==='special')c.state.pieces=c.state.pieces.map(p=>p.at.r===0&&p.at.c===0?{id:p.id,kind:'pod',at:p.at,passengerIds:[]}:p);
 admit(c);const queue=c.state.arrivals.filter(a=>a.status==='pending');expect(queue[0]!.id).toBe('wave-a');expect(queue).toHaveLength(2);
 c.state.crew=[];c.state.actors=[];c.state.fixtures=[];if(blocker==='special')c.state.pieces=c.state.pieces.filter(p=>p.at.r!==0||p.at.c!==0);
 admit(c);expect(c.state.arrivals.every(a=>a.status==='admitted')).toBe(true);expect(c.state.crew.map(c=>c.id)).toEqual(['new-crew','later']);
});
it('uses turn then code-unit ID ordering without mutating authored order, and stops at a not-yet-due head',()=>{
 const l=waveLevel();l.arrivals=[{...l.arrivals[0]!,id:'z',turn:2},{...l.arrivals[0]!,id:'A',turn:2,crew:[arriving('second')]},{...l.arrivals[0]!,id:'a',turn:2,crew:[arriving('third')]}];l.mechanics=[{id:'waves',arrivalIds:['z','A','a']}];l.goals[0]!.eligible={type:'sources',sourceIds:['z'],target:1};
 const c=createContext(loadCampaignLevel(l));c.state.turn=1;admit(c);expect(c.state.crew).toEqual([]);c.state.turn=2;admit(c);
 expect(c.state.crew.map(c=>c.id)).toEqual(['second']);expect(c.state.arrivals.map(a=>a.id)).toEqual(['z','A','a']);
});
it('admits a group atomically under the active cap and honors reviewed overrides',()=>{
 const l=waveLevel();l.arrivals[0]!.crew.push(arriving('other'));const c=createContext(loadCampaignLevel(l));c.state.turn=1;
 c.state.crew=Array.from({length:5},(_,i)=>arriving(`existing-${i}`,{r:2,c:i%4}));admit(c);expect(c.state.arrivals[0]!.status).toBe('pending');expect(c.state.crew).toHaveLength(5);
 c.state.level.metadata.capOverride={activeCrew:7,movingCarriers:2,spreadingSystems:1,playtestJustification:'Reviewed cap test'};admit(c);expect(c.state.crew).toHaveLength(7);expect(c.state.arrivals[0]!.status).toBe('admitted');
});
it.each(['comet','bridge','gate'] as const)('waits for every cell in a %s fixture footprint, not only its anchor',kind=>{
 const c=createContext(loadCampaignLevel(waveLevel()));c.state.turn=1;
 const common={id:'formation',at:{r:0,c:1},cells:[{r:0,c:1},{r:0,c:0}]};
 c.state.fixtures=[kind==='comet'?{...common,kind,hp:1}:kind==='bridge'?{...common,kind,hits:2,active:false,connectionIds:[]}:{...common,kind,connectionIds:[],open:true}];
 admit(c);expect(c.state.arrivals[0]!.status).toBe('pending');expect(c.state.crew).toEqual([]);
});
it.each(['portal','jelly'] as const)('waits at the remote occupied %s cell',kind=>{
 const c=createContext(loadCampaignLevel(waveLevel()));c.state.turn=1;
 c.state.fixtures=[kind==='portal'?{id:'portal',kind,at:{r:0,c:1},receiver:{r:0,c:0},segmentId:'column-0'}:{id:'jelly',kind,at:{r:0,c:1},coatedCells:[{r:0,c:0}],preview:null}];
 admit(c);expect(c.state.arrivals[0]!.status).toBe('pending');
});
it('clears arrival needs immediately on safe terrain and never ticks from rejection or booster',()=>{
 const l=waveLevel();l.pieces[0]={id:'piece-0-0',kind:'tile',tier:4,at:{r:0,c:0}};const s=loadCampaignLevel(l);
 const rejected=transition(s,{type:'swap',from:{r:0,c:0},to:{r:0,c:1}});expect(rejected.accepted).toBe(false);expect(rejected.state).toBe(s);
 const boosted=transition(s,{type:'booster',kind:'demo',at:{r:0,c:1}});expect(boosted.state.arrivals[0]!.status).toBe('pending');expect(boosted.state.turn).toBe(0);expect(boosted.events.some(e=>e.type==='turn')).toBe(false);expect(rejected.events).toEqual([]);
 const r=transition(s,legalActions(s)[0]!);expect(r.state.crew[0]!.rescueMoves).toBeNull();
});
it('does not admit a wave after unresolved old needs lose the turn',()=>{
 const l=waveLevel();l.crew=[{...arriving('old',{r:3,c:0}),rescueMoves:1}];
 const s=loadCampaignLevel(l),r=transition(s,{type:'swap',from:{r:0,c:1},to:{r:1,c:1}});
 expect(r.accepted).toBe(true);expect(r.state.status).toBe('lost');expect(r.state.arrivals[0]!.status).toBe('pending');expect(r.events.some(e=>e.type==='arrival')).toBe(false);
});
it('preserves pending and admitted queue plus next-transition equivalence through real save/reload',()=>{
 const l=waveLevel(),store=new MemoryStorage(),session=new CampaignSession(createCampaignSave(l),store);session.persist();
 const before=new CampaignSession(loadSave(store)!,store);const state=(s:CampaignSession)=>{if(s.save.active.kind!=='campaign')throw Error();return s.save.active.state;};const action=legalActions(state(before))[0]!;
 const result=before.dispatch(action)!;expect(result.state.arrivals[0]!.status).toBe('admitted');
 const reload=new CampaignSession(loadSave(store)!,store);reload.finishPresentation();before.finishPresentation();expect(state(reload)).toEqual(state(before));
 expect(parseCampaignState(JSON.parse(JSON.stringify(state(reload))))).toEqual(state(reload));
 const next=legalActions(state(reload))[0]!;expect(reload.dispatch(next)).toEqual(before.dispatch(next));
});
it.each(['position','inactive','attached','shelter','capacity'] as const)('rejects invalid finite arrival %s at the schema boundary',kind=>{
 const l=waveLevel();if(kind==='position')l.arrivals[0]!.crew[0]!.at={r:1,c:0};if(kind==='inactive')l.arrivals[0]!.crew[0]!.status='housed';
 if(kind==='attached')l.arrivals[0]!.crew[0]!.carrierId='piece-0-0';if(kind==='shelter'){l.arrivals[0]!.crew[0]!.shelterStarted=true;l.arrivals[0]!.crew[0]!.shelterMoves=1;}
 if(kind==='capacity')l.arrivals[0]!.crew=Array.from({length:7},(_,i)=>arriving(`new-${i}`));expect(()=>parseCampaignLevel(l)).toThrow();
});
it('requires the admitted ledger and queue status to agree on reload',()=>{
 const s=loadCampaignLevel(waveLevel()),r=transition(s,legalActions(s)[0]!);const runtime=r.state.mechanics.find(m=>m.id==='waves')!;if(runtime.id!=='waves')throw Error();runtime.admittedIds=[];
 expect(()=>parseCampaignState(r.state)).toThrow();
});
it('accepts a reviewed group exceeding six only when its explicit cap permits the whole group',()=>{
 const l=waveLevel();l.arrivals[0]!.crew=Array.from({length:7},(_,i)=>arriving(`guest-${i}`));l.metadata.capOverride={activeCrew:7,movingCarriers:2,spreadingSystems:1,playtestJustification:'Reviewed group demonstration fixture'};
 const s=loadCampaignLevel(l),r=transition(s,legalActions(s)[0]!);expect(r.state.crew).toHaveLength(7);expect(parseCampaignState(r.state)).toEqual(r.state);
});
