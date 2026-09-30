import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {canSlide,legalActions} from '../../../src/campaign/engine/actions';
import {parseCampaignLevel,parseCampaignState} from '../../../src/campaign/schema';
import {readFileSync} from 'node:fs';
import {hashState} from '../../../src/campaign/engine/hash';
import {jelly,jellyEligible,nextJellyTarget,peelPracticeCoating,practiceRouteDisconnected} from '../../../src/campaign/mechanics/jelly';
import {createContext} from '../../../src/campaign/engine/context';
import {terrainMatches} from '../../../src/campaign/engine/matches';
import {validateCandidate} from '../../../src/campaign/validator';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {priorJellyWarningState} from '../fixtures/jelly-prior-warning';

it('coats once on the third accepted turn, with a serialized next-cell preview',()=>{
 const level=getAuthoredLessonLevel(711)!;
 let state=loadCampaignLevel(level);
 const fixture=()=>state.fixtures.find(f=>f.kind==='jelly')!;
 expect(fixture().preview).not.toBeNull();
 for(let n=0;n<3;n++){
  const result=transition(state,legalActions(state)[0]!);
  expect(result.accepted).toBe(true);state=result.state;
  if(n<2)expect(fixture().coatedCells).toHaveLength(0);
 }
 expect(fixture().coatedCells).toHaveLength(1);
 expect(parseCampaignState(JSON.parse(JSON.stringify(state)))).toEqual(state);
});

it('does not advance the spread on rejected actions or boosters',()=>{
 const level=getAuthoredLessonLevel(711)!;
 const state=loadCampaignLevel(level);
 const rejected=transition(state,{type:'swap',from:{r:99,c:99},to:{r:99,c:98}});
 expect(rejected).toMatchObject({accepted:false,state,events:[]});
 const booster=transition(state,{type:'booster',kind:'wormhole',at:{r:0,c:0}});
 if(booster.accepted)expect(booster.state.mechanics.find(m=>m.id==='jelly')).toEqual(state.mechanics.find(m=>m.id==='jelly'));
});

it('clears an adjacent coating on the third turn and cancels that turn spread',()=>{
 const level=getAuthoredLessonLevel(714)!;
 let state=loadCampaignLevel(level);
 for(const action of lessonTeachingActions[714]!.slice(0,2)){const result=transition(state,action);expect(result.accepted).toBe(true);state=result.state;}
 expect(state.mechanics.find(m=>m.id==='jelly')).toMatchObject({turnsUntilSpread:1});
 expect(canSlide(state,{r:4,c:2})).toBe(false);
 const third=transition(state,lessonTeachingActions[714]![2]!);expect(third.accepted).toBe(true);
 expect(third.events.some(e=>e.type==='jelly'&&e.phase==='cleared'&&e.at?.r===4&&e.at.c===2)).toBe(true);
 expect(third.events.filter(e=>e.type==='jelly'&&e.phase==='coated')).toHaveLength(0);
 const fixture=third.state.fixtures.find(f=>f.kind==='jelly')!;
 expect(fixture.coatedCells).toHaveLength(0);
 expect(canSlide(third.state,{r:4,c:2})).toBe(true);
 expect(third.state.status).toBe('playing');
 expect(transition(third.state,lessonTeachingActions[714]![3]!).state.status).toBe('won');
});

it('suppresses a due third-turn coating when that turn clears a neighboring cell',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(711)!);
 for(const action of lessonTeachingActions[711]!.slice(0,2))state=transition(state,action).state;
 const due=state.mechanics.find(m=>m.id==='jelly')!;expect(due.turnsUntilSpread).toBe(1);
 const action=lessonTeachingActions[711]![2]!,dry=transition(state,action);
 expect(dry.accepted).toBe(true);
 const merged=dry.events.filter(e=>e.type==='merge').flatMap(e=>e.type==='merge'?e.cells:[]);
 const source=state.fixtures.find(f=>f.kind==='jelly')!;
 let cancelled:null|ReturnType<typeof transition>=null;
 for(const piece of state.pieces.filter(p=>p.kind==='tile')){
  const at=piece.at;
  if(!jellyEligible(state,at,source)||merged.some(p=>p.r===at.r&&p.c===at.c)||
   action.type!=='swap'||[action.from,action.to].some(p=>p.r===at.r&&p.c===at.c)||
   !merged.some(p=>Math.abs(p.r-at.r)+Math.abs(p.c-at.c)===1))continue;
  const candidate=structuredClone(state),fixture=candidate.fixtures.find(f=>f.kind==='jelly')!;
  fixture.coatedCells=[at];fixture.preview=null;
  const result=transition(candidate,action);
  if(result.accepted&&result.events.some(e=>e.type==='jelly'&&e.phase==='cleared')){cancelled=result;break;}
 }
 expect(cancelled).not.toBeNull();
 expect(cancelled!.events.filter(e=>e.type==='jelly'&&e.phase==='coated')).toHaveLength(0);
 expect(cancelled!.state.mechanics.find(m=>m.id==='jelly')).toMatchObject({turnsUntilSpread:3,cancelledThisTurn:true});
});

it('resets a prior clear only at the next accepted ordinary-turn boundary',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(714)!);
 for(const action of lessonTeachingActions[714]!.slice(0,3))state=transition(state,action).state;
 expect(state.mechanics.find(m=>m.id==='jelly')).toMatchObject({cancelledThisTurn:true});
 const rejected=transition(state,{type:'swap',from:{r:99,c:99},to:{r:99,c:98}});
 expect(rejected.state).toBe(state);
 const booster=transition(state,{type:'booster',kind:'wormhole',at:{r:0,c:0}});
 if(booster.accepted)expect(booster.state.mechanics.find(m=>m.id==='jelly')).toMatchObject({cancelledThisTurn:true});
 const next=transition(state,lessonTeachingActions[714]![3]!);
 expect(next.accepted).toBe(true);
 expect(next.state.mechanics.find(m=>m.id==='jelly')).toMatchObject({cancelledThisTurn:false});
});

it('retains a valid saved preview after every replayed turn, and reloads exactly',()=>{
 for(const id of [711,712,713,714,715]){
  let state=loadCampaignLevel(getAuthoredLessonLevel(id)!);
  for(const action of lessonTeachingActions[id]!){
   const result=transition(state,action);expect(result.accepted).toBe(true);state=result.state;
   const fixture=state.fixtures.find(f=>f.kind==='jelly')!;
   expect(fixture.preview).toEqual(nextJellyTarget(state,fixture));
   expect(hashState(parseCampaignState(JSON.parse(JSON.stringify(state))))).toBe(hashState(state));
  }
 }
});

it('makes the introductory spread a playable obstruction before the next clear and rescue',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(711)!);
 for(const action of lessonTeachingActions[711]!.slice(0,2))state=transition(state,action).state;
 const forecast=state.fixtures.find(f=>f.kind==='jelly')!.preview;
 expect(state.mechanics.find(m=>m.id==='jelly')).toMatchObject({turnsUntilSpread:1});
 const spread=transition(state,lessonTeachingActions[711]![2]!);
 expect(spread.state.status).toBe('playing');
 expect(spread.events.some(e=>e.type==='jelly'&&e.phase==='coated'&&e.at?.r===forecast?.r&&e.at?.c===forecast?.c)).toBe(true);
 expect(canSlide(spread.state,forecast!)).toBe(false);
 const clear=transition(spread.state,lessonTeachingActions[711]![3]!);
 expect(clear.state.status).toBe('playing');
 expect(clear.events.some(e=>e.type==='jelly'&&e.phase==='cleared'&&e.at?.r===forecast?.r&&e.at?.c===forecast?.c)).toBe(true);
 expect(canSlide(clear.state,forecast!)).toBe(true);
 expect(transition(clear.state,lessonTeachingActions[711]![4]!).state.status).toBe('won');
});

it('requires clearing the guided coating before using its tile, then spreads before rescue',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(712)!);
 const covered={r:2,c:2};
 expect(canSlide(state,covered)).toBe(false);
 const first=transition(state,lessonTeachingActions[712]![0]!);
 expect(first.events.some(e=>e.type==='jelly'&&e.phase==='cleared'&&e.at?.r===covered.r&&e.at.c===covered.c)).toBe(true);
 state=first.state;expect(canSlide(state,covered)).toBe(true);
 const second=transition(state,lessonTeachingActions[712]![1]!);expect(second.accepted).toBe(true);state=second.state;
 const third=transition(state,lessonTeachingActions[712]![2]!);
 expect(third.state.status).toBe('playing');
 expect(third.events.some(e=>e.type==='jelly'&&e.phase==='coated')).toBe(true);
 expect(transition(third.state,lessonTeachingActions[712]![3]!).state.status).toBe('won');
});

it('makes a forecasted tall-board coating remove a formerly legal move before the alternate rescue path',()=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(713)!);
 for(const action of lessonTeachingActions[713]!.slice(0,2))state=transition(state,action).state;
 const target=state.fixtures.find(f=>f.kind==='jelly')!.preview!;
 const third=transition(state,lessonTeachingActions[713]![2]!);
 expect(third.state.status).toBe('playing');
 expect(third.events.some(e=>e.type==='jelly'&&e.phase==='coated'&&e.at?.r===target.r&&e.at.c===target.c)).toBe(true);
 const uncovered=structuredClone(third.state);uncovered.fixtures.find(f=>f.kind==='jelly')!.coatedCells=[];
 const open=legalActions(uncovered),blocked=legalActions(third.state);
 expect(open.some(action=>action.type==='swap'&&[action.from,action.to].some(p=>p.r===target.r&&p.c===target.c)&&
  !blocked.some(other=>JSON.stringify(other)===JSON.stringify(action)))).toBe(true);
 state=third.state;for(const action of lessonTeachingActions[713]!.slice(3))state=transition(state,action).state;
 expect(state.status).toBe('won');
});

it('never targets riders, specials, cargo, fixtures, exits or routes',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(711)!);
 const source=state.fixtures.find(f=>f.kind==='jelly')!;
 for(const at of [state.crew[0]!.at,source.at])expect(jellyEligible(state,at,source)).toBe(false);
 const target=nextJellyTarget(state,source)!;expect(jellyEligible(state,target,source)).toBe(true);
 const special=structuredClone(state);special.pieces=special.pieces.map(p=>p.at.r===target.r&&p.at.c===target.c?{id:p.id,at:p.at,kind:'pod' as const,passengerIds:[]}:p);
 expect(jellyEligible(special,target,source)).toBe(false);
 const route=structuredClone(state);route.geometry.routes.push({id:'forbidden',cells:[target],loop:false});expect(jellyEligible(route,target,source)).toBe(false);
 const exit=structuredClone(state);exit.geometry.endpoints.push({id:'exit',kind:'exit',at:target,active:true});expect(jellyEligible(exit,target,source)).toBe(false);
});

it('waits without mutating occupancy when every neighboring tile is ineligible',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(711)!);
 const source=state.fixtures.find(f=>f.kind==='jelly')!;
 state.pieces=state.pieces.map(p=>p.kind==='tile'&&Math.abs(p.at.r-source.at.r)+Math.abs(p.at.c-source.at.c)===1?{id:p.id,kind:'pod' as const,at:p.at,passengerIds:[]}:p);
 expect(nextJellyTarget(state,source)).toBeNull();
 const timer=state.mechanics.find(m=>m.id==='jelly')!;timer.turnsUntilSpread=1;
 const context=createContext(state);jelly.finalize!(context);
 expect(source.coatedCells).toHaveLength(0);
 expect(context.events.filter(e=>e.type==='jelly')).toMatchObject([{phase:'waiting',at:null}]);
 expect(timer.turnsUntilSpread).toBe(3);
});

it('rejects a jelly coating over a crew tile before search',()=>{
 const level=getAuthoredLessonLevel(711)!;
 const jelly=level.fixtures.find(f=>f.kind==='jelly')!;jelly.coatedCells=[level.crew[0]!.at];
 expect(validateCandidate(level).some(i=>i.message.includes('Jelly requires'))).toBe(true);
});

it('protects the historical forty-one-swap prefix before coatings sever the rescue route',()=>{
 const original=parseCampaignLevel(JSON.parse(readFileSync(new URL('../fixtures/jelly-711-original.json',import.meta.url),'utf8')));
 const repeated:[number,number,number,number,number][]=[
  [3,3,4,3,1],[2,3,3,3,1],[1,3,2,3,10],[2,2,2,3,1],
  [2,1,2,2,1],[2,0,2,1,1],[2,0,3,0,3],[3,0,3,1,6],
  [3,0,4,0,3],[4,0,4,1,9],[4,1,4,2,3],[4,2,4,3,2],
 ];
 let state=loadCampaignLevel(original),practiceWaits=0;
 for(const [fromR,fromC,toR,toC,count] of repeated)for(let i=0;i<count;i++){
  const result=transition(state,{type:'swap',from:{r:fromR,c:fromC},to:{r:toR,c:toC}});
  expect(result.accepted).toBe(true);
  practiceWaits+=result.events.filter(e=>e.type==='jelly'&&e.phase==='practice-waited').length;
  state=parseCampaignState(JSON.parse(JSON.stringify(result.state)));
 }
 expect(state.turn).toBe(41);
 expect(hashState(state)).toBe('293d7d2363c56bcb');
 expect(practiceWaits).toBeGreaterThan(0);
 expect(practiceRouteDisconnected(state)).toBe(false);
 expect(state.status).toBe('playing');
 expect(legalActions(state).length).toBeGreaterThan(0);
});

it('loads the exact connected old turn-13 warning as a guarded forecast before play',()=>{
 const old=priorJellyWarningState();
 expect(old.turn).toBe(13);
 expect(hashState(old)).toBe('04c3257bb2e0b53f');
 expect(practiceRouteDisconnected(old)).toBe(false);
 const fixture=old.fixtures.find(f=>f.kind==='jelly');
 if(fixture?.kind!=='jelly')throw Error('Missing jelly');
 expect(fixture.preview).toEqual({r:1,c:0});
 expect(nextJellyTarget(old,fixture)).toBeNull();
 const restored=parseCampaignState(JSON.parse(JSON.stringify(old)));
 expect(restored.fixtures.find(f=>f.kind==='jelly')?.preview).toBeNull();
 expect(old.fixtures.find(f=>f.kind==='jelly')?.preview).toEqual({r:1,c:0});
 const savedAgain=parseCampaignState(JSON.parse(JSON.stringify(restored)));
 expect(savedAgain).toEqual(restored);
 const action={type:'swap' as const,from:{r:0,c:0},to:{r:1,c:0}};
 const next=transition(savedAgain,action);
 expect(next.accepted).toBe(true);
 expect(parseCampaignState(JSON.parse(JSON.stringify(next.state)))).toEqual(next.state);
});

it('repairs a saved practice route hidden behind legal two-cell shuffling',()=>{
 const saved=JSON.parse(readFileSync(new URL('../../../validation/campaign/receipts/jelly/fix1-reauthored-711-adverse-state.json',import.meta.url),'utf8'));
 const state=parseCampaignState(saved.state);
 expect(hashState(saved.state)).toBe('9a875ddba9610b17');
 expect(state.fixtures.find(f=>f.kind==='jelly')?.preview).toBeNull();
 expect(practiceRouteDisconnected(state)).toBe(true);
 expect(legalActions(state)).toHaveLength(2);
 const next=transition(state,legalActions(state)[0]!);
 expect(next.accepted).toBe(true);
 expect(next.events.filter(e=>e.type==='jelly'&&e.phase==='practice-assisted').length).toBeGreaterThanOrEqual(5);
 expect(next.state.fixtures.find(f=>f.kind==='jelly')?.coatedCells.length).toBeLessThanOrEqual(6);
 let recovered=parseCampaignState(JSON.parse(JSON.stringify(next.state)));
 expect(practiceRouteDisconnected(recovered)).toBe(false);
 for(const action of [
  {type:'swap' as const,from:{r:1,c:0},to:{r:1,c:1}},
  {type:'swap' as const,from:{r:1,c:1},to:{r:2,c:1}},
 ]){const move=transition(recovered,action);expect(move.accepted).toBe(true);recovered=parseCampaignState(JSON.parse(JSON.stringify(move.state)));}
 expect(recovered.status).toBe('won');
 expect(recovered.crew[0]?.status).toBe('housed');
 expect(hashState(recovered)).toBe('dbca8a712b48a21e');
});

it('repairs the exact historical forty-one-turn saved practice state beyond ordinary action recovery',()=>{
 const saved=JSON.parse(readFileSync(new URL('../../../validation/campaign/receipts/jelly/fix1-original-711-trapped-state.json',import.meta.url),'utf8'));
 const state=parseCampaignState(saved.state);
 expect(hashState(saved.state)).toBe('60457b136cc44c7c');
 expect(state.fixtures.find(f=>f.kind==='jelly')?.preview).toBeNull();
 expect(practiceRouteDisconnected(state)).toBe(true);
 const next=transition(state,legalActions(state)[0]!);
 expect(next.accepted).toBe(true);
 expect(next.events.filter(e=>e.type==='jelly'&&e.phase==='practice-assisted').length).toBeGreaterThan(3);
 expect(next.events.some((event,index)=>event.type==='merge'&&next.events.slice(0,index).some(prior=>prior.type==='jelly'&&prior.phase==='practice-assisted'))).toBe(true);
 let recovered=parseCampaignState(JSON.parse(JSON.stringify(next.state)));
 expect(practiceRouteDisconnected(recovered)).toBe(false);
 for(const action of [
  {type:'swap' as const,from:{r:2,c:0},to:{r:2,c:1}},
  {type:'swap' as const,from:{r:3,c:0},to:{r:3,c:1}},
  {type:'swap' as const,from:{r:3,c:1},to:{r:3,c:2}},
  {type:'swap' as const,from:{r:2,c:1},to:{r:2,c:2}},
 ]){const move=transition(recovered,action);expect(move.accepted).toBe(true);recovered=parseCampaignState(JSON.parse(JSON.stringify(move.state)));}
 expect(recovered.status).toBe('won');
 expect(recovered.crew[0]?.status).toBe('housed');
 expect(hashState(recovered)).toBe('a773715a4b84d65d');
});

it('settles a line exposed only by practice peeling before saving the next boundary',()=>{
 const saved=JSON.parse(readFileSync(new URL('../../../validation/campaign/receipts/jelly/fix1-original-711-trapped-state.json',import.meta.url),'utf8'));
 const state=parseCampaignState(saved.state);
 for(const piece of state.pieces){
  if(piece.kind==='tile'&&piece.at.r===1&&piece.at.c<3)piece.tier=1;
 }
 expect(terrainMatches(state)).toHaveLength(0);
 const next=transition(state,legalActions(state)[0]!);
 expect(next.accepted).toBe(true);
 expect(next.events.some(e=>e.type==='jelly'&&e.phase==='practice-assisted')).toBe(true);
 expect(next.events.some(e=>e.type==='merge'&&e.cells.some(p=>p.r===1&&p.c<=2))).toBe(true);
 expect(terrainMatches(next.state)).toHaveLength(0);
 expect(parseCampaignState(JSON.parse(JSON.stringify(next.state)))).toEqual(next.state);
});

it('replays the historical reauthored adverse prefix until prevention changes its next legal move',()=>{
 const saved=JSON.parse(readFileSync(new URL('../../../validation/campaign/receipts/jelly/fix1-reauthored-711-adverse-state.json',import.meta.url),'utf8'));
 let state=loadCampaignLevel(parseCampaignLevel(saved.level)),accepted=0,waits=0,rejectedAt:null|number=null;
 for(const action of saved.prefixActions){
  if(state.status!=='playing')break;
  const next=transition(state,action);
  if(!next.accepted){rejectedAt=accepted+1;break;}
  accepted++;waits+=next.events.filter(e=>e.type==='jelly'&&e.phase==='practice-waited').length;
  state=parseCampaignState(JSON.parse(JSON.stringify(next.state)));
 }
 expect(accepted).toBe(65);
 expect(rejectedAt).toBe(66);
 expect(waits).toBeGreaterThan(0);
 expect(state.status).toBe('playing');
 expect(practiceRouteDisconnected(state)).toBe(false);
 expect(legalActions(state).length).toBeGreaterThan(0);
});

it('never applies emergency practice peeling to an ordinary jelly puzzle',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(712)!);
 const before=structuredClone(state.fixtures.find(f=>f.kind==='jelly'));
 const context=createContext(state);
 expect(peelPracticeCoating(context)).toBe(false);
 expect(state.fixtures.find(f=>f.kind==='jelly')).toEqual(before);
 expect(context.events).toHaveLength(0);
});
