import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {buildHintRoutes} from '../../src/campaign/hint-authoring';
import {loadCampaignLevel} from '../../src/campaign/engine/load';
import {transition} from '../../src/campaign/engine/turn';
import {hashState} from '../../src/campaign/engine/hash';
import type {CampaignAction,CampaignLevel,SolutionTrace} from '../../src/campaign/types';
const levels:CampaignLevel[]=Array.from({length:20},(_,i)=>JSON.parse(readFileSync(new URL(`../../src/campaign/content/chapter-${String(i+1).padStart(2,'0')}.json`,import.meta.url),'utf8'))).flat();
const maps:Record<string,CampaignAction>[]=Array.from({length:20},(_,i)=>JSON.parse(readFileSync(new URL(`../../src/campaign/content/hints-${String(i+1).padStart(2,'0')}.json`,import.meta.url),'utf8')));
const proofs:SolutionTrace[]=JSON.parse(readFileSync(new URL('../../validation/campaign/generated/proofs.json',import.meta.url),'utf8'));

it('all 1000 missions reach victory by following only committed next-move advice, with no terminal advice',()=>{
 const visited=new Set<string>();
 for(const level of levels){
  let state=loadCampaignLevel(level),moves=0;const map=maps[level.chapter-1]!;
  while(state.status==='playing'&&moves<12){
   const key=hashState(state),action=map[key];expect(action,`missing advice at mission ${level.id}, move ${moves}`).toBeDefined();
   expect(action!.type).not.toBe('booster');visited.add(key);
   const next=transition(state,action!);expect(next.accepted).toBe(true);state=next.state;moves++;
  }
  expect(state.status,`mission ${level.id}`).toBe('won');expect(map[hashState(state)]).toBeUndefined();
 }
 expect(visited.size).toBe(maps.reduce((sum,map)=>sum+Object.keys(map).length,0));
},30000);

it('advice projection is reproducible from verified routes and contains only hash-to-action entries',()=>{
 expect(buildHintRoutes(levels,proofs)).toEqual(maps);
 for(const map of maps)for(const [key,action] of Object.entries(map)){
  expect(key).toMatch(/^[0-9a-f]{16}$/);expect(['swap','translate']).toContain(action.type);
  expect(action).not.toHaveProperty('actions');expect(action).not.toHaveProperty('levelId');
 }
},30000);

it('rejects stale, incomplete, consumable, and duplicate source routes rather than publishing unreliable advice',()=>{
 const level=levels[0]!,proof=proofs[0]!;
 expect(()=>buildHintRoutes([level],[])).toThrow(/Missing/);
 expect(()=>buildHintRoutes([level],[proof,proof])).toThrow(/Duplicate/);
 expect(()=>buildHintRoutes([level],[{...proof,initialHash:'stale'}])).toThrow(/Initial/);
 expect(()=>buildHintRoutes([level],[{...proof,finalHash:'stale'}])).toThrow(/finish/);
 expect(()=>buildHintRoutes([level],[{...proof,actions:[{type:'booster',kind:'demo',at:{r:0,c:0}}]}])).toThrow(/Invalid route/);
});
