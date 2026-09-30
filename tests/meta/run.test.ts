import { GameSession, loadRun, RUN_KEY } from '../../src/meta/run';
import type { LevelDef } from '../../src/core/types';

const fixture:LevelDef={id:1,mask:['###','###','###'],tiles:['313','132','245'],survivors:[{r:0,c:2}],goal:{type:'rescueN',n:1},seed:7,needMoves:12};
function storage() { const data:Record<string,string>={}; return {getItem:(k:string)=>data[k]??null,setItem:(k:string,v:string)=>{data[k]=v;}}; }

test('a committed move and reward restore together before its animation finishes',()=>{
  const store=storage(), game=new GameSession(fixture,store);
  const res=game.swap({r:1,c:1},{r:0,c:1})!;
  expect(res.legal).toBe(true);
  const saved=loadRun(store)!;
  expect(saved.board).toEqual(game.data.board);
  expect(saved.wallet.coins).toBe(300+res.state.points);
  expect(saved.moves).toBe(1);
  expect(saved.board.rngState).toBe(res.state.rngState);
});

test('modal and in-flight animation modes reject extra gestures',()=>{
  const game=new GameSession(fixture,storage());
  game.mode='modal'; expect(game.swap({r:1,c:1},{r:0,c:1})).toBeNull();
  game.mode='playing'; game.swap({r:1,c:1},{r:0,c:1});
  expect(game.mode).toBe('animating');
  expect(game.swap({r:1,c:1},{r:0,c:1})).toBeNull();
});

test('a targeted booster remains armed after an invalid target and spends once on a valid one',()=>{
  const game=new GameSession(fixture,storage());
  game.pick('demo'); expect(game.selected).toBe('demo');
  expect(game.target({r:0,c:2})).toBeNull();
  expect(game.selected).toBe('demo'); expect(game.data.wallet.inventory.demo).toBe(1);
  expect(game.target({r:2,c:0})?.legal).toBe(true);
  expect(game.selected).toBeNull(); expect(game.data.wallet.inventory.demo).toBe(0);
  expect(game.target({r:2,c:1})).toBeNull();
});

test('winning is banked once across a reload at the result screen',()=>{
  const def:LevelDef={...fixture,tiles:['512','534','251'],survivors:[{r:0,c:0,vip:'botanist'}]};
  const store=storage(), game=new GameSession(def,store);
  expect(game.swap({r:2,c:0},{r:2,c:1})?.state.status).toBe('won');
  const restored=new GameSession(def,store);
  expect(restored.data.claimed).toBe(true);
  expect(restored.data.station.totalRescued).toBe(1);
  restored.finishAnimation();
  expect(restored.swap({r:2,c:0},{r:2,c:1})).toBeNull();
  expect(restored.data.station.totalRescued).toBe(1);
});

test('bad saves are rejected and the original app save key is never written',()=>{
  const store=storage(); store.setItem(RUN_KEY,JSON.stringify({version:1,board:{rows:99}}));
  expect(loadRun(store)).toBeNull();
  const game=new GameSession(fixture,store); game.persist();
  expect(store.getItem('sliding-stars-wallet')).toBeNull();
  const saved=JSON.parse(store.getItem(RUN_KEY)!); saved.board.grid[0][0]={kind:'tile',tier:99};
  store.setItem(RUN_KEY,JSON.stringify(saved)); expect(loadRun(store)).toBeNull();
});

test.each([
 ['archive list',(d:any)=>{d.station.archives='oops';}],
 ['archive entry',(d:any)=>{d.station.archives=[{catalogIndex:0,builtModules:'greenhouse',theme:'aurora',arrangement:'orbit'}];}],
 ['unknown theme',(d:any)=>{d.station.theme='broken';}],
 ['VIP object',(d:any)=>{d.board.survivors[0].vip={id:'botanist'};}],
 ['initial column mismatch',(d:any)=>{d.initial.mask=['####','####','####'];d.initial.tiles=['3134','1324','2451'];}],
 ['changed board mask',(d:any)=>{d.board.mask[2][2]=false;}],
])('reject malformed nested save: %s',(_label,mutate)=>{
 const store=storage(),game=new GameSession(fixture,store);game.persist();
 const d=JSON.parse(store.getItem(RUN_KEY)!);mutate(d);store.setItem(RUN_KEY,JSON.stringify(d));
 expect(loadRun(store)).toBeNull();
});
