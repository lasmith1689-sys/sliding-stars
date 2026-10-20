import {expect,it} from 'vitest';
import {baseLevel,baseState} from '../campaign/fixtures/base';
import {pieceAt} from '../../src/campaign/engine/occupancy';
import {legalActions} from '../../src/campaign/engine/actions';
import {terrainMatches} from '../../src/campaign/engine/matches';
import {CampaignSession,createCampaignSave} from '../../src/session/campaignSession';
import {recoverPracticeMoves} from '../../src/session/campaignRecovery';
import {upgradeRescueShuttles} from '../../src/session/rescueUpgrade';
import {migrateRun} from '../../src/session/migrate';
import {BACKUP_KEY,SAVE_KEY,loadSave,readSave,saveSnapshot} from '../../src/session/storage';
import {MemoryStorage,legacyRun} from './fixtures/legacy';
import type {SaveV2} from '../../src/session/types';
import type {CampaignState} from '../../src/campaign/types';

// Falsification probes for saves crossing the fixed-station and empty-shuttle boarding repair.
const marker='rescue-shuttles-v2';
const noProvider=async():Promise<never>=>{throw Error('must not reload a mission');};
function campaign(save:SaveV2):CampaignState {if(save.active.kind!=='campaign')throw Error('Expected campaign');return save.active.state;}
function pickupSave():SaveV2 {
 const level=baseLevel([[1,1,'P',1],[2,3,2,3],[3,2,3,2],[1,3,2,'S']]);level.crew[0]!.at={r:0,c:3};
 const save=createCampaignSave(level);save.seenTips=[marker];save.revision=11;save.wallet.coins=640;return save;
}
/** A save written before stations were anchored: its station was slid into a corner. */
function movedStationSave():SaveV2 {
 const level=baseLevel([[1,2,1,3],[2,1,3,2],[3,2,1,3],['S',3,2,1]]);level.crew[0]!.at={r:1,c:1};
 const save=createCampaignSave(level),state=campaign(save),station=pieceAt(state,{r:3,c:0})!,tile=pieceAt(state,{r:2,c:0})!;
 expect(state.status).toBe('playing');station.at={r:2,c:0};tile.at={r:3,c:0};
 state.turn=9;save.revision=30;save.seenTips=[marker];save.wallet.coins=3660;return save;
}
const write=(store:MemoryStorage,key:string,value:unknown)=>store.values.set(key,JSON.stringify(value));

it('a pre-repair save with an empty shuttle beside its guest boards after reload and reloads identically',async()=>{
 const store=new MemoryStorage(),save=pickupSave();
 expect(saveSnapshot(store,save).ok).toBe(true);
 let loaded=loadSave(store)!;
 // Boot repairs must be no-ops for an already-upgraded, playable save.
 expect(await upgradeRescueShuttles(loaded,noProvider)).toBe(loaded);expect(recoverPracticeMoves(loaded)).toBe(loaded);
 const session=new CampaignSession(loaded,store);
 const result=session.dispatch({type:'swap',from:{r:0,c:3},to:{r:0,c:2}});
 expect(result?.accepted).toBe(true);
 const pod=campaign(session.save).pieces.find(p=>p.kind==='pod')!;
 expect(pod).toMatchObject({passengerIds:['crew']});
 expect(campaign(session.save).crew[0]).toMatchObject({carrierId:pod.id,at:pod.at});
 loaded=loadSave(store)!;expect(loaded).toEqual(session.save);
 expect(loaded.wallet.coins).toBeGreaterThanOrEqual(save.wallet.coins);expect(loaded.wallet.inventory).toEqual(save.wallet.inventory);
 expect(await upgradeRescueShuttles(loaded,noProvider)).toBe(loaded);expect(recoverPracticeMoves(loaded)).toBe(loaded);
});

it('an occupied shuttle loaded from a save keeps its guest through a further flight and another reload',()=>{
 const store=new MemoryStorage();
 const first=new CampaignSession(pickupSave(),store);
 expect(first.dispatch({type:'swap',from:{r:0,c:2},to:{r:0,c:3}})?.accepted).toBe(true);
 const second=new CampaignSession(loadSave(store)!,store),pod=campaign(second.save).pieces.find(p=>p.kind==='pod')!;
 expect(pod).toMatchObject({passengerIds:['crew']});
 const flight=legalActions(campaign(second.save)).find(a=>a.type==='swap'&&(a.from.r===pod.at.r&&a.from.c===pod.at.c));
 expect(flight).toBeDefined();
 expect(second.dispatch(flight!)?.accepted).toBe(true);
 const reloaded=loadSave(store)!,crew=campaign(reloaded).crew[0]!;
 expect(reloaded).toEqual(second.save);
 if(crew.status==='active')expect(crew.carrierId).toBe(pod.id);else expect(crew.status).toBe('housed');
});

it('a historically moved corner station survives the whole boot repair chain unchanged, twice',async()=>{
 const store=new MemoryStorage(),save=movedStationSave();
 expect(saveSnapshot(store,save).ok).toBe(true);
 const loaded=loadSave(store)!;expect(loaded).toEqual(save);
 const upgraded=await upgradeRescueShuttles(loaded,noProvider),recovered=recoverPracticeMoves(upgraded);
 expect(recovered).toBe(loaded);
 expect(recoverPracticeMoves(await upgradeRescueShuttles(recovered,noProvider))).toBe(recovered);
 const state=campaign(recovered);
 expect(pieceAt(state,{r:2,c:0})?.kind).toBe('station');expect(state.turn).toBe(9);
 expect(legalActions(state).some(a=>a.type==='swap'&&[a.from,a.to].some(p=>p.r===2&&p.c===0))).toBe(false);
 // Rewriting the identical snapshot is accepted and does not bump or alter anything.
 expect(saveSnapshot(store,recovered).ok).toBe(true);expect(loadSave(store)).toEqual(save);
});

it('rejected station swaps on a reloaded old save write nothing and keep the save revision',()=>{
 const store=new MemoryStorage(),save=movedStationSave();expect(saveSnapshot(store,save).ok).toBe(true);
 const raw=store.values.get(SAVE_KEY),session=new CampaignSession(loadSave(store)!,store);
 for(const [from,to] of [[{r:2,c:0},{r:1,c:0}],[{r:1,c:0},{r:2,c:0}],[{r:2,c:0},{r:3,c:0}],[{r:2,c:0},{r:2,c:1}]] as const){
  const result=session.dispatch({type:'swap',from,to});
  expect(result?.accepted).toBe(false);expect(result?.rejection).toMatch(/Stations stay fixed/);
 }
 expect(session.save).toEqual(save);expect(store.values.get(SAVE_KEY)).toBe(raw);
});

it('recovery leaves legacy, finished and jelly-free practice saves untouched',()=>{
 const legacy=migrateRun(legacyRun());expect(recoverPracticeMoves(legacy)).toBe(legacy);
 for(const status of ['won','lost'] as const){
  const save=movedStationSave(),state=campaign(save);state.level.metadata.failurePolicy='no-failure';state.status=status;
  expect(recoverPracticeMoves(save)).toBe(save);
 }
 // No legal move and nothing to peel (every tile is boxed in by fixed stations):
 // recovery must terminate without inventing a change.
 const level=baseLevel([[1,'S',2,'S'],['S',3,'S',1],[2,'S',1,'S'],['S',3,'S',2]]);level.crew[0]!.at={r:0,c:0};
 const state=baseState(level),stuck=createCampaignSave(baseLevel());state.level.metadata.failurePolicy='no-failure';
 stuck.active={kind:'campaign',state,events:[]};
 expect(legalActions(state)).toEqual([]);
 const before=structuredClone(stuck);expect(recoverPracticeMoves(stuck)).toBe(stuck);expect(stuck).toEqual(before);
});

it('recovery refuses a peel that would expose a pending terrain match and leaves the save intact',()=>{
 const level=baseLevel([[1,1,1,2],[2,3,2,3],[3,2,3,2],[2,3,2,'S']]);level.crew[0]!.at={r:1,c:1};
 level.metadata.failurePolicy='no-failure';
 const coated=[{r:0,c:0},...[1,2,3].flatMap(r=>[0,1,2,3].map(c=>({r,c})))];
 const state=baseState(level);state.fixtures=[{id:'goo',at:{r:1,c:0},kind:'jelly',coatedCells:coated,preview:null}];
 const save=createCampaignSave(baseLevel());save.active={kind:'campaign',state,events:[]};
 expect(legalActions(state)).toEqual([]);expect(terrainMatches(state)).toEqual([]);
 // Sanity: peeling the first coated cell really would expose the 1-1-1 row.
 const peeled=structuredClone(state),goo=peeled.fixtures[0]!;if(goo.kind==='jelly')goo.coatedCells=goo.coatedCells.slice(1);
 expect(terrainMatches(peeled).length).toBeGreaterThan(0);
 const before=structuredClone(save);
 expect(recoverPracticeMoves(save)).toBe(save);expect(save).toEqual(before);
});

const corruptions:[string,(state:CampaignState)=>void][]=[
 ['a crew member claiming a station as carrier',s=>{s.crew[0]!.carrierId=s.pieces.find(p=>p.kind==='station')!.id;}],
 ['a shuttle listing a guest who does not reference it',s=>{const pod=s.pieces.find(p=>p.kind==='pod')!;if(pod.kind==='pod')pod.passengerIds=['crew'];}],
 ['a shuttle listing a housed guest',s=>{const pod=s.pieces.find(p=>p.kind==='pod')!;if(pod.kind==='pod')pod.passengerIds=['crew'];Object.assign(s.crew[0]!,{carrierId:pod.id,at:pod.at,status:'housed'});}],
 ['a boarded guest at a different cell from its shuttle',s=>{const pod=s.pieces.find(p=>p.kind==='pod')!;if(pod.kind==='pod')pod.passengerIds=['crew'];Object.assign(s.crew[0]!,{carrierId:pod.id,at:{r:3,c:0},rescueMoves:null});}],
 ['a station without its entrance facing',s=>{delete (s.pieces.find(p=>p.kind==='station') as {facing?:string}).facing;}],
 ['a station moved off the board',s=>{s.pieces.find(p=>p.kind==='station')!.at={r:4,c:3};}],
 ['a station stacked on another piece',s=>{s.pieces.find(p=>p.kind==='station')!.at={r:3,c:2};}],
 ['a shuttle whose passenger list is missing',s=>{delete (s.pieces.find(p=>p.kind==='pod') as {passengerIds?:string[]}).passengerIds;}],
];
it.each(corruptions)('a save with %s is rejected as corrupt, preserved, and never overwritten',(_label,corrupt)=>{
 const store=new MemoryStorage(),save=pickupSave(),bad=structuredClone(save);corrupt(campaign(bad));
 write(store,SAVE_KEY,bad);const raw=store.values.get(SAVE_KEY);
 const read=readSave(store);
 expect(read.status).toBe('corrupt');expect(read.save).toBeNull();
 expect(saveSnapshot(store,createCampaignSave(baseLevel())).ok).toBe(false);
 expect(store.values.get(SAVE_KEY)).toBe(raw);expect(store.values.has(BACKUP_KEY)).toBe(false);
});

it('a corrupt primary falls back to a valid backup that still holds a boarded shuttle',()=>{
 const store=new MemoryStorage(),session=new CampaignSession(pickupSave(),store);
 expect(session.dispatch({type:'swap',from:{r:0,c:2},to:{r:0,c:3}})?.accepted).toBe(true);
 const good=structuredClone(session.save),bad=structuredClone(good);bad.revision=good.revision+1;
 const pod=campaign(bad).pieces.find(p=>p.kind==='pod')!;if(pod.kind==='pod')pod.passengerIds=[];
 write(store,BACKUP_KEY,good);write(store,SAVE_KEY,bad);
 const read=readSave(store);
 expect(read.status).toBe('recovered');expect(read.save).toEqual(good);
 expect(campaign(read.save!).pieces.find(p=>p.kind==='pod')).toMatchObject({passengerIds:['crew']});
});
