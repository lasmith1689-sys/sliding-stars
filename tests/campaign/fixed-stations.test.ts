import {expect,it} from 'vitest';
import {canSlide,legalActions} from '../../src/campaign/engine/actions';
import {transition} from '../../src/campaign/engine/turn';
import {movePiece,movePieces} from '../../src/campaign/engine/transport';
import {pieceAt} from '../../src/campaign/engine/occupancy';
import {CampaignInput,actionBetween} from '../../src/input/campaign';
import {dragFrame} from '../../src/input/campaignDrag';
import {baseLevel,baseState,context} from './fixtures/base';
import type {CampaignAction} from '../../src/campaign/types';
import {CampaignSession,createCampaignSave} from '../../src/session/campaignSession';
import {MemoryStorage} from '../session/fixtures/legacy';
import {loadSave,saveSnapshot} from '../../src/session/storage';

it.each([false,true])('rejects a station swap in either direction without spending a move (reverse=%s)',reverse=>{
 const state=baseState(),before=structuredClone(state);
 const station={r:3,c:3},neighbor={r:3,c:2};
 const result=transition(state,{type:'swap',from:reverse?neighbor:station,to:reverse?station:neighbor});
 expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
 expect(state).toEqual(before);
 expect(legalActions(state).some(a=>a.type==='swap'&&[a.from,a.to].some(p=>p.r===3&&p.c===3))).toBe(false);
});

it('keeps a station fixed even when its displaced terrain would make a match',()=>{
 const state=baseState(baseLevel([[1,1,'S',1],[2,3,2,3],[3,2,3,2],[1,3,2,1]]));
 const before=structuredClone(state);
 expect(transition(state,{type:'swap',from:{r:0,c:2},to:{r:0,c:3}}).accepted).toBe(false);
 expect(state).toEqual(before);
});

it('requires an occupied shuttle to use the station entrance instead of displacing the station',()=>{
 const state=baseState(baseLevel([[1,2,1,3],[2,'S','P',2],[3,2,1,3],[1,3,2,1]]));
 const pod=pieceAt(state,{r:1,c:2})!;if(pod.kind!=='pod')throw Error('Expected shuttle');
 pod.passengerIds=['crew'];Object.assign(state.crew[0]!,{at:{r:1,c:2},carrierId:pod.id,rescueMoves:null});
 const before=structuredClone(state);
 const result=transition(state,{type:'swap',from:{r:1,c:2},to:{r:1,c:1}});
 expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
 expect(state).toEqual(before);
});

it('refuses station relocation through a direct or bulk transport path',()=>{
 const single=baseState(),station=pieceAt(single,{r:3,c:3})!;
 single.pieces=single.pieces.filter(p=>p.at.r!==2||p.at.c!==3);
 const singleBefore=structuredClone(single),singleContext=context(single);
 expect(movePiece(singleContext,station.id,{r:2,c:3})).toBe(false);
 expect(single).toEqual(singleBefore);expect(singleContext.events).toEqual([]);
 const bulk=baseState(),bulkBefore=structuredClone(bulk),bulkContext=context(bulk);
 expect(movePieces(bulkContext,[{id:'piece-3-3',to:{r:2,c:3}},{id:'piece-2-3',to:{r:3,c:3}}])).toBe(false);
 expect(bulk).toEqual(bulkBefore);expect(bulkContext.events).toEqual([]);
});

it.each([false,true])('keeps touch dragging and two-tile selection from moving a station (reverse=%s)',reverse=>{
 const state=baseState(),station={r:3,c:3},neighbor={r:3,c:2};
 const from=reverse?neighbor:station,to=reverse?station:neighbor;
 const frame=dragFrame(state,from,reverse?42:-42,0,84);
 expect(canSlide(state,station)).toBe(false);expect(frame.movable).toBe(false);expect(frame.progress).toBe(0);
 expect(actionBetween(state,from,to)).toBeNull();
 const dispatched:CampaignAction[]=[],input=new CampaignInput(()=>state,()=>false,a=>dispatched.push(a));
 input.start(from);input.end(to);input.start(from);input.end(from);input.start(to);input.end(to);
 expect(dispatched).toEqual([]);expect(state.turn).toBe(0);
});

it('preserves a previously moved station at its saved position and rejects further moves after reload',()=>{
 const save=createCampaignSave(baseLevel()),store=new MemoryStorage();
 if(save.active.kind!=='campaign')throw Error('Expected campaign');
 const station=pieceAt(save.active.state,{r:3,c:3})!,tile=pieceAt(save.active.state,{r:3,c:2})!;
 station.at={r:3,c:2};tile.at={r:3,c:3};save.active.state.turn=19;save.revision=24;save.wallet.coins=3660;
 expect(saveSnapshot(store,save).ok).toBe(true);
 const session=new CampaignSession(loadSave(store)!,store),before=structuredClone(session.save);
 expect(session.dispatch({type:'swap',from:{r:3,c:2},to:{r:3,c:1}})?.accepted).toBe(false);
 expect(session.save).toEqual(before);expect(loadSave(store)).toEqual(before);
 expect(pieceAt(session.save.active.kind==='campaign'?session.save.active.state:save.active.state,{r:3,c:2})?.kind).toBe('station');
});
