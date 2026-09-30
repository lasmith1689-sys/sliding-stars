import { describe,it,expect } from 'vitest';
import { transition,createCampaignEngine } from '../../src/campaign/engine/turn';
import { loadCampaignLevel } from '../../src/campaign/engine/load';
import { legalActions } from '../../src/campaign/engine/actions';
import { resolveTerrainMatches,settle } from '../../src/campaign/engine/settle';
import { parseCampaignLevel,parseCampaignState,parseCampaignEvents } from '../../src/campaign/schema';
import { resolveMatchesOnce } from '../../src/core/resolve';
import type { BoardState,Tier } from '../../src/core/types';
import type { GameEvent } from '../../src/core/events';
import { baseLevel,baseState,context,mergeSwap,legacyBoard } from './fixtures/base';
import { trySwap } from '../../src/core/game';

describe('campaign turn kernel',()=>{
  it('accepts a merge exactly once and preserves parsable state and event boundaries',()=>{
    const state=loadCampaignLevel(baseLevel()),result=transition(state,mergeSwap);
    expect(result.accepted).toBe(true);expect(result.state.turn).toBe(state.turn+1);
    expect(result.events.some(e=>e.type==='merge')).toBe(true);
    expect(parseCampaignState(result.state)).toEqual(result.state);expect(parseCampaignEvents(result.events)).toEqual(result.events);
    expect(result.events.map(e=>e.sequenceId)).toEqual(result.events.map((_,i)=>i));
  });
  it('rejects a nonmatch without changing clocks or state; legalActions excludes consumables',()=>{
    const state=baseState(),result=transition(state,{type:'swap',from:{r:0,c:2},to:{r:0,c:3}});
    expect(result.accepted).toBe(false);expect(result.state).toBe(state);expect(result.events).toEqual([]);
    expect(legalActions(state).every(a=>a.type!=='booster')).toBe(true);
    for(const action of legalActions(state))expect(transition(state,action).accepted).toBe(true);
  });
  it('a booster resolves terrain without ticking turn, needs or environment',()=>{
    const state=baseState(),result=transition(state,{type:'booster',kind:'demo',at:{r:0,c:3}});
    expect(result.accepted).toBe(true);expect(result.state.turn).toBe(0);expect(result.state.crew[0]!.rescueMoves).toBe(20);
    expect(result.events.some(e=>e.type==='remove'&&e.reason==='booster')).toBe(true);
  });
  it.each([{tier:1 as Tier,length:3,after:2},{tier:1 as Tier,length:4,after:'pod'},{tier:4 as Tier,length:4,after:'station'},{tier:5 as Tier,length:3,after:'station'}])('matches legacy outcome, facing and scoring for $tier/$length',({tier,length,after})=>{
    const level=baseLevel([[1,2,3,2],[2,3,1,2],[3,1,2,3],[1,2,3,'S']]);
    for(let c=0;c<length;c++)level.pieces.find(p=>p.at.r===0&&p.at.c===c)!.kind==='tile'&&Object.assign(level.pieces.find(p=>p.at.r===0&&p.at.c===c)!,{tier});
    const ctx=context(baseState(level));const grid=Array.from({length:4},()=>Array<BoardState['grid'][number][number]>(4).fill(null));
    for(const p of level.pieces)grid[p.at.r]![p.at.c]=p.kind==='station'?{kind:'dome',facing:p.facing}:p.kind==='tile'?{kind:'tile',tier:p.tier}:{kind:'pod'};
    const legacy:BoardState={rows:4,cols:4,mask:level.geometry.mask,grid,overlays:grid.map(row=>row.map(()=>null)),survivors:[],rovers:[],rescued:0,collected:0,points:0,movesLeft:null,goal:{type:'rescueN',n:1},needMoves:20,rngState:7,status:'playing'};
    const events:GameEvent[]=[];resolveMatchesOnce(legacy,null,events);resolveTerrainMatches(ctx,null,[]);
    const merge=ctx.events.find(e=>e.type==='merge');expect(merge?.type==='merge'&&merge.after).toBe(after);
    const anchor=merge?.type==='merge'?merge.at:{r:-1,c:-1},piece=ctx.state.pieces.find(p=>p.at.r===anchor.r&&p.at.c===anchor.c)!;
    const old=legacy.grid[anchor.r]![anchor.c]!;
    expect(piece.kind==='station'?{kind:'dome',facing:piece.facing}:piece.kind==='tile'?{kind:'tile',tier:piece.tier}:{kind:piece.kind}).toEqual(old);
    const score=events.reduce((sum,e)=>sum+(e.type==='merge'?10*e.newTier+(e.cells.length>=4?20:0):e.type==='podCreated'?30:e.type==='domeCreated'?100:0),0);
    expect(ctx.state.points).toBe(score);expect(ctx.state.rngState).toBe(legacy.rngState);
  });
  it('runs each real merge hook once, before refill, then transfer and environment once',()=>{
    const seen:string[]=[];const engine=createCampaignEngine([{id:'crates',validate:()=>[],onMerge:(_,event)=>seen.push(event.mergeId),beforeRefill:ctx=>{seen.push(`refill:${ctx.state.pieces.length}`);return false;},transfer:()=>{seen.push('transfer');},environment:()=>{seen.push('environment');}}]);
    const level=baseLevel();level.id=4;level.mechanics=[{id:'crates',fixtureIds:['crate']}];level.fixtures=[{id:'crate',kind:'crate',hp:3,at:{r:2,c:3}}];level.pieces=level.pieces.filter(p=>p.at.r!==2||p.at.c!==3);
    const state=engine.loadCampaignLevel(level);seen.length=0;const result=engine.transition(state,mergeSwap);
    const merges=result.events.filter(e=>e.type==='merge');expect(seen.filter(s=>s.startsWith('merge-'))).toHaveLength(merges.length);
    expect(seen.indexOf('transfer')).toBeGreaterThan(seen.findIndex(s=>s.startsWith('refill:')));expect(seen.filter(s=>s==='environment')).toHaveLength(1);
    expect(parseCampaignState(result.state)).toEqual(result.state);
  });

  it.each([1,4] as Tier[])('L junction tier %s produces one result and houses merged crew on a station',tier=>{
    const level=baseLevel([[1,2,3,2],[2,3,1,3],[3,1,2,1],[1,2,3,'S']]);
    for(const at of [{r:0,c:0},{r:0,c:1},{r:0,c:2},{r:1,c:0},{r:2,c:0}])Object.assign(level.pieces.find(p=>p.at.r===at.r&&p.at.c===at.c)!,{tier});
    level.crew[0]!.at={r:0,c:1};const ctx=context(baseState(level));resolveTerrainMatches(ctx,null,[]);
    expect(ctx.events.filter(e=>e.type==='merge')).toHaveLength(1);const result=ctx.state.pieces.find(p=>p.id==='entity-1')!;
    expect(result.kind).toBe(tier===4?'station':'pod');expect(result.at).toEqual({r:0,c:0});
    settle(ctx,[]);expect(ctx.state.crew[0]!.status).toBe(tier===4?'housed':'active');
    expect(parseCampaignState(ctx.state)).toEqual(ctx.state);expect(parseCampaignEvents(ctx.events)).toEqual(ctx.events);
  });

  it('a three-merge may stack independent terrain crew and round-trip the resulting state',()=>{
    const level=baseLevel([[2,2,2,1],[1,3,1,2],[3,1,2,3],[1,2,3,'S']]);
    level.crew[0]!.at={r:0,c:0};level.crew.push({...level.crew[0]!,id:'second',at:{r:0,c:2}});
    level.goals[0]!.eligible={type:'ids',ids:['crew','second']};
    const ctx=context(baseState(level));resolveTerrainMatches(ctx,null,[]);settle(ctx,[]);
    expect(ctx.state.crew[0]!.at).toEqual(ctx.state.crew[1]!.at);expect(parseCampaignState(ctx.state)).toEqual(ctx.state);
    level.crew[1]!.at={...level.crew[0]!.at};expect(()=>parseCampaignLevel(level)).toThrow(/crew.cells/);
  });

  it('safe tier four terrain pauses rescue and scores grounding only once',()=>{
    const state=baseState();Object.assign(state.pieces.find(p=>p.at.r===3&&p.at.c===0)!,{tier:4});
    const ctx=context(state);settle(ctx,[]);expect(state.crew[0]!.rescueMoves).toBeNull();expect(state.points).toBe(50);
    settle(ctx,[]);expect(state.points).toBe(50);
  });

  it('a non-converging immediate hook fails visibly instead of truncating resolution',()=>{
    expect(()=>settle(context(),[{id:'crates',validate:()=>[],settle:()=>true}])).toThrow(/did not converge/);
  });

  it('beforeRefill transport gets the empty receiving cell before ordinary spawn',()=>{
    const state=baseState();state.crew=[];state.pieces=state.pieces.filter(p=>p.at.c!==3||p.at.r!==0);
    let transferred=false;const ctx=context(state);
    settle(ctx,[{id:'portals',validate:()=>[],beforeRefill:c=>{
      if(transferred)return false;
      expect(c.state.pieces.some(p=>p.at.r===0&&p.at.c===3)).toBe(false);
      const sender=c.state.pieces.find(p=>p.at.r===0&&p.at.c===0)!;
      sender.at={r:0,c:3};transferred=true;return true;
    }}]);
    expect(ctx.events.some(e=>e.type==='spawn'&&e.piece.at.r===0&&e.piece.at.c===3)).toBe(false);
  });

  it.each(['merge','door'] as const)('base %s turn matches legacy terrain, scoring, crew and RNG',scenario=>{
    const state=baseState();const action=scenario==='merge'?mergeSwap:{type:'swap' as const,from:{r:3,c:3},to:{r:3,c:2}};
    if(scenario==='door')state.crew[0]!.at={r:3,c:1};
    const legacy=trySwap(legacyBoard(state),action.from,action.to),campaign=transition(state,action);
    expect(campaign.accepted).toBe(legacy.legal);
    const mapped=legacyBoard(campaign.state);
    expect(mapped.grid).toEqual(legacy.state.grid);expect(mapped.survivors).toEqual(legacy.state.survivors);
    expect(mapped.points).toBe(legacy.state.points);expect(mapped.rescued).toBe(legacy.state.rescued);expect(mapped.rngState).toBe(legacy.state.rngState);
  });
});
