import {expect,it} from 'vitest';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {transition} from '../../../src/campaign/engine/turn';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {parseCampaignLevel} from '../../../src/campaign/schema';
import {readFileSync} from 'node:fs';

it('erupts and spreads before rescue, then clears the coating and reactor together',()=>{
 const level=getAuthoredLessonLevel(715)!;
 let state=loadCampaignLevel(level);
 for(const [index,action] of lessonTeachingActions[715]!.entries()){
  const result=transition(state,action);expect(result.accepted).toBe(true);state=result.state;
  if(index===2){
   const terrain=result.events.filter(e=>e.type==='terrain'&&e.causeId==='jelly-reactor');
   const spread=result.events.filter(e=>e.type==='jelly'&&e.phase==='coated');
   expect(terrain.length).toBeGreaterThan(0);expect(spread).toMatchObject([{at:{r:2,c:2}}]);
   expect(terrain.at(-1)!.sequenceId).toBeLessThan(spread[0]!.sequenceId);
   expect(state.status).toBe('playing');expect(state.fixtures.find(f=>f.id==='jelly-reactor')).toBeDefined();
  }
  if(index===3){
   expect(result.events.some(e=>e.type==='jelly'&&e.phase==='cleared'&&e.at?.r===2&&e.at.c===2)).toBe(true);
   expect(result.events.some(e=>e.type==='fixture'&&e.fixtureId==='jelly-reactor'&&e.after===null)).toBe(true);
   expect(state.status).toBe('playing');
  }
 }
 expect(state.status).toBe('won');
});

it('cancels a due spread when reactor cooling creates a late adjacent merge',()=>{
 const level=parseCampaignLevel(JSON.parse(readFileSync(new URL('../fixtures/jelly-711-original.json',import.meta.url),'utf8')));
 const reactor={id:'late-reactor',kind:'reactor' as const,at:{r:2,c:3},hp:4,fuse:1,period:3};
 let state=loadCampaignLevel(level);
 for(const action of [{type:'swap' as const,from:{r:2,c:0},to:{r:2,c:1}},{type:'swap' as const,from:{r:2,c:2},to:{r:2,c:3}}]){
  const result=transition(state,action);expect(result.accepted).toBe(true);state=result.state;
 }
 state.level.fixtures.push(structuredClone(reactor));state.level.mechanics.push({id:'reactors',fixtureIds:[reactor.id]});
 state.fixtures.push(structuredClone(reactor));state.mechanics.push({id:'reactors',overloadCount:0});
 const coating={r:2,c:1};
 const source=state.fixtures.find(f=>f.kind==='jelly')!;
 source.coatedCells=[coating];source.preview=null;
 for(const [column,tier] of [[1,2],[2,2],[3,3]] as const){
  const tile=state.pieces.find(p=>p.kind==='tile'&&p.at.r===1&&p.at.c===column);
  expect(tile?.kind).toBe('tile');if(tile?.kind==='tile')tile.tier=tier;
 }
 const result=transition(state,{type:'swap',from:{r:3,c:3},to:{r:4,c:3}});
 expect(result.accepted,result.rejection).toBe(true);
 const eruption=result.events.find(e=>e.type==='terrain'&&e.causeId===reactor.id&&e.at.r===1&&e.at.c===3);
 const clear=result.events.find(e=>e.type==='jelly'&&e.phase==='cleared'&&e.at?.r===coating.r&&e.at.c===coating.c);
 expect(eruption).toBeDefined();expect(clear).toBeDefined();
 expect(eruption!.sequenceId).toBeLessThan(clear!.sequenceId);
 expect(result.events.filter(e=>e.type==='jelly'&&e.phase==='coated')).toHaveLength(0);
 expect(result.state.mechanics.find(m=>m.id==='jelly')).toMatchObject({turnsUntilSpread:3,cancelledThisTurn:true});
});
