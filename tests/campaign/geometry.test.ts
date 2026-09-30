import { it,expect } from 'vitest';
import { activeCell,gravitySegments } from '../../src/campaign/engine/geometry';
import { fallPieces,refillPieces } from '../../src/campaign/engine/settle';
import { baseState,context } from './fixtures/base';
import { loadCampaignLevel } from '../../src/campaign/engine/load';
import { shuffleTerrain,ensureLegalActions } from '../../src/campaign/engine/recovery';
import { legalActions } from '../../src/campaign/engine/actions';

it('effective geometry excludes inactive cells and rebuilds segments on activation',()=>{
  const state=baseState();state.geometry.inactiveCells=[{r:1,c:0}];state.pieces=state.pieces.filter(p=>p.at.r!==1||p.at.c!==0);
  expect(activeCell(state.geometry,{r:1,c:0})).toBe(false);
  expect(gravitySegments(state).filter(s=>s.cells.some(p=>p.c===0)).map(s=>s.cells.length)).toEqual([1,2]);
  state.geometry.inactiveCells=[];expect(gravitySegments(state).find(s=>s.cells[0]!.c===0)!.cells).toHaveLength(4);
});
it('gaps stop falls and a missing source is an authoring error rather than a refill fallback',()=>{
  const state=baseState();state.geometry.inactiveCells=[{r:1,c:0}];state.pieces=state.pieces.filter(p=>p.at.c!==0||p.at.r===0);state.crew=[];
  const top=state.pieces.find(p=>p.at.c===0)!;fallPieces(context(state));expect(top.at).toEqual({r:0,c:0});
  expect(()=>refillPieces(context(state))).toThrow(/refill|source/i);
});
it('fixed stations split gravity and refill locally without falling',()=>{
  const state=baseState();const station=state.pieces.find(p=>p.kind==='station')!;station.at={r:1,c:3};state.pieces=state.pieces.filter(p=>p===station||p.at.c!==3);state.crew=[];
  const ctx=context(state);fallPieces(ctx);refillPieces(ctx);expect(station.at).toEqual({r:1,c:3});expect(state.pieces.filter(p=>p.at.c===3)).toHaveLength(4);
});

it('load rejects incomplete authored gravity coverage and unavailable mechanics',()=>{
  const state=baseState();state.level.geometry.gravitySegments.pop();state.level.geometry.refillSources.pop();
  expect(()=>loadCampaignLevel(state.level)).toThrow(/coverage/);
  const other=baseState();other.level.id=4;other.level.fixtures=[{id:'box',kind:'crate',hp:1,at:{r:2,c:3}}];other.level.pieces=other.level.pieces.filter(p=>p.at.r!==2||p.at.c!==3);other.level.mechanics=[{id:'crates',fixtureIds:['box']}];
  expect(()=>loadCampaignLevel(other.level,[])).toThrow(/not implemented/);
});

it('wormhole recovery keeps fixed stations and actors in place and shuffles only within each region',()=>{
  const state=baseState();state.crew=[];
  for(const piece of state.pieces.filter(p=>p.at.c===1))Object.assign(piece,{kind:'station',facing:'left'});
  const fixed=structuredClone(state.pieces.filter(p=>p.kind==='station'));state.actors=[{id:'rover',kind:'rover',at:{r:0,c:3},routeId:null,routeIndex:0,passengerIds:[]}];
  const actors=structuredClone(state.actors),positions=new Map(state.pieces.map(p=>[p.id,p.at]));
  expect(shuffleTerrain(context(state))).toBe(true);
  expect(state.pieces.filter(p=>p.kind==='station')).toEqual(fixed);expect(state.actors).toEqual(actors);
  for(const piece of state.pieces)expect(piece.at.c<1).toBe(positions.get(piece.id)!.c<1);
});

it('dead-board recovery reports an unsolvable fixed population rather than hanging or declaring victory',()=>{
  const state=baseState();state.pieces=state.pieces.filter(p=>p.at.r===0&&p.at.c<2);state.crew=[];
  expect(legalActions(state)).toEqual([]);expect(()=>ensureLegalActions(context(state))).toThrow(/recovery exhausted/);
});
