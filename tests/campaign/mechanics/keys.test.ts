import {expect,it} from 'vitest';
import {bridgeState} from '../fixtures/bridges';
import {createContext} from '../../../src/campaign/engine/context';
import {campaignModules} from '../../../src/campaign/mechanics/registry';
import {parseCampaignState,parseCampaignEvents,parseCampaignLevel} from '../../../src/campaign/schema';
import {fallPieces,refillPieces} from '../../../src/campaign/engine/settle';
import {transition} from '../../../src/campaign/engine/turn';
import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import {lessonTeachingActions} from '../../../src/campaign/content/lesson-solutions.dev';
import {loadCampaignLevel} from '../../../src/campaign/engine/load';
import {createCampaignEngine} from '../../../src/campaign/engine/turn';
import {makeScene,applySceneEvents} from '../../../src/render/campaign/snapshot';
function keyState(){
 const s=bridgeState(),l=s.level;l.id=562;l.chapter=12;
 l.fixtures=[{id:'gate',kind:'gate',at:{r:1,c:1},cells:[{r:2,c:1}],connectionIds:['bridge-link'],open:false},{id:'lock',kind:'lock',at:{r:1,c:0},gateId:'gate',keyId:'key'}];
 l.pieces=[{id:'key',kind:'cargo',cargoKind:'key',at:{r:0,c:0},destinationId:'lock',passengerIds:[]}];
 l.mechanics=[{id:'keys',fixtureIds:['gate','lock']}];l.goals=[{id:'restore',type:'restoreInfrastructure',eligible:{type:'ids',ids:['gate']}}];
 return {...s,levelId:562,pieces:structuredClone(l.pieces),fixtures:structuredClone(l.fixtures),mechanics:[{id:'keys' as const,unlockedIds:[]}]};
}
const module=()=>campaignModules.find(m=>m.id==='keys');
it('consumes only the exact delivered key once and permanently opens its owned cells and links',()=>{
 const c=createContext(keyState());c.state.pieces[0]!.at={r:1,c:0};const before=structuredClone(c.state.geometry);
 expect(module()?.beforeRefill?.(c)).toBe(true);
 expect(c.state.fixtures[0]).toMatchObject({open:true});expect(c.state.pieces).toEqual([]);
 expect(c.state.geometry.inactiveCells).toEqual([]);expect(c.state.geometry.connections[0]!.active).toBe(true);
 expect(c.state.goalProgress[0]!.completedIds).toEqual(['gate']);expect(module()?.beforeRefill?.(c)).toBe(false);
 expect(c.events.filter(e=>e.type==='remove')).toHaveLength(1);expect(parseCampaignEvents(c.events)).toEqual(c.events);
 expect(before.inactiveCells).toHaveLength(1);expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
});
it('wrong identity or destination neither consumes cargo nor opens or credits',()=>{
 for(const wrong of ['identity','destination']){const c=createContext(keyState());const key=c.state.pieces[0]!;key.at={r:1,c:0};if(wrong==='identity')key.id='wrong';else if(key.kind==='cargo')key.destinationId='other';
 expect(module()?.beforeRefill?.(c)).toBe(false);expect(c.state.fixtures[0]).toMatchObject({open:false});expect(c.state.pieces).toHaveLength(1);expect(c.state.goalProgress[0]!.completedIds).toEqual([]);}
});
it('opening preserves unrelated occupants and rebuilds gravity before refill',()=>{
 const c=createContext(keyState());c.state.pieces[0]!.at={r:1,c:0};c.state.pieces.push({id:'falling',kind:'tile',tier:4,at:{r:1,c:1}});
 module()?.beforeRefill?.(c);expect(c.state.pieces.find(p=>p.id==='falling')!.at).toEqual({r:1,c:1});fallPieces(c);refillPieces(c);
 expect(c.state.pieces.find(p=>p.id==='falling')!.at).toEqual({r:2,c:1});expect(new Set(c.state.pieces.map(p=>`${p.at.r},${p.at.c}`)).size).toBe(c.state.pieces.length);
});
it('rejects direct cargo swaps in either orientation, including a station',()=>{
 const s=keyState();s.pieces.push({id:'station',kind:'station',at:{r:0,c:1},facing:'left'});
 for(const [from,to] of [[{r:0,c:0},{r:0,c:1}],[{r:0,c:1},{r:0,c:0}]]){const r=transition(s,{type:'swap',from:from!,to:to!});expect(r.accepted).toBe(false);expect(r.state).toBe(s);}
});
it('round-trips unopened and opened state while rejecting forged identity, consumption and activation',()=>{
 const c=createContext(keyState());expect(parseCampaignState(c.state)).toEqual(c.state);c.state.pieces[0]!.at={r:1,c:0};module()?.beforeRefill?.(c);
 expect(c.state.fixtures[0]).toMatchObject({open:true});expect(parseCampaignState(JSON.parse(JSON.stringify(c.state)))).toEqual(c.state);
 for(const change of [(s:typeof c.state)=>{s.geometry.inactiveCells=[{r:2,c:1}]},(s:typeof c.state)=>{s.mechanics=[{id:'keys',unlockedIds:[]}]},(s:typeof c.state)=>{s.pieces.push(...s.level.pieces)},(s:typeof c.state)=>{const f=s.fixtures[1]!;if(f.kind==='lock')f.at={r:0,c:1}}]){const bad=structuredClone(c.state);change(bad);expect(()=>parseCampaignState(bad)).toThrow();}
});
it('rejects a gate without an exact authored key link',()=>{const l=keyState().level;l.fixtures=l.fixtures.filter(f=>f.kind!=='lock');l.pieces=[];l.mechanics=[{id:'keys',fixtureIds:['gate']}];expect(()=>parseCampaignLevel(l)).toThrow(/key|lock/i);});
it.each([false,true])('rejects a lock ID added to the gate ledger with open=%s',open=>{
 let state=loadCampaignLevel(getAuthoredLessonLevel(561)!);
 if(open){const result=transition(state,lessonTeachingActions[561]![0]!);expect(result.accepted).toBe(true);state=result.state;}
 expect(state.fixtures.find(f=>f.kind==='gate')).toMatchObject({open});
 expect(parseCampaignState(JSON.parse(JSON.stringify(state)))).toEqual(state);
 const runtime=state.mechanics.find(m=>m.id==='keys')!;runtime.unlockedIds.push('lock-0');
 expect(()=>parseCampaignState(JSON.parse(JSON.stringify(state)))).toThrow(/key ledger contains a non-gate ID/);
});
it('gravity delivers a key at its lock before it could overshoot through a longer empty run',()=>{
 const c=createContext(keyState());fallPieces(c);
 expect(c.state.pieces[0]!.at).toEqual({r:1,c:0});expect(module()?.beforeRefill?.(c)).toBe(true);
 expect(c.state.fixtures[0]).toMatchObject({open:true});
});
it('rejects an authored key stranded below its lock',()=>{
 const l=keyState().level;l.pieces[0]!.at={r:2,c:0};expect(()=>parseCampaignLevel(l)).toThrow(/key.*reach|reach.*lock/i);
});
it('anchors permanent gate artwork to its actual route cell through ordered scene events',()=>{
 const c=createContext(keyState()),scene=makeScene(c.state);expect(scene.entityPositions.gate).toEqual({r:2,c:1});
 c.state.pieces[0]!.at={r:1,c:0};module()?.beforeRefill?.(c);
 const rendered=applySceneEvents(makeScene(keyState()),c.events);expect(rendered.entityPositions.gate).toEqual({r:2,c:1});expect(rendered.fixtures.find(f=>f.id==='gate')).toMatchObject({open:true});
});
it('a valid wrong key waits at another lock and survives the serialized boundary unchanged',()=>{
 const state=loadCampaignLevel(getAuthoredLessonLevel(563)!),key=state.pieces.find(p=>p.id==='key-1')!,tile=state.pieces.find(p=>p.at.r===1&&p.at.c===0)!;
 tile.at={...key.at};key.at={r:1,c:0};const restored=parseCampaignState(JSON.parse(JSON.stringify(state))),c=createContext(restored);
 expect(module()?.beforeRefill?.(c)).toBe(false);expect(c.state.fixtures.filter(f=>f.kind==='gate').every(g=>!g.open)).toBe(true);expect(c.state.pieces).toEqual(state.pieces);
 expect(c.events).toContainEqual(expect.objectContaining({type:'key',keyId:'key-1',lockId:'lock-0',phase:'waiting'}));expect(parseCampaignState(c.state)).toEqual(c.state);
});
it.each([561,562,563,564,565])('lesson %s needs its key delivery and saves every causal booster-free turn',id=>{
 const level=getAuthoredLessonLevel(id)!,disabled=createCampaignEngine(campaignModules.map(m=>m.id==='keys'?{...m,beforeRefill:undefined}:m));
 let state=loadCampaignLevel(level),without=disabled.loadCampaignLevel(level);const consumed:string[]=[];
 for(const action of lessonTeachingActions[id]!){const result=transition(state,action);expect(result.accepted).toBe(true);expect(transition(parseCampaignState(JSON.parse(JSON.stringify(state))),action)).toEqual(result);
  consumed.push(...result.events.flatMap(e=>e.type==='remove'&&e.reason==='consumed'?[e.piece.id]:[]));state=result.state;
  const no=disabled.transition(without,action);if(no.accepted)without=no.state;
 }
 expect(state.status).toBe('won');expect(without.status).not.toBe('won');
 expect(consumed.sort()).toEqual(level.pieces.filter(p=>p.kind==='cargo'&&p.cargoKind==='key').map(p=>p.id).sort());
 expect(state.fixtures.filter(f=>f.kind==='gate').every(g=>g.open)).toBe(true);expect(parseCampaignState(JSON.parse(JSON.stringify(state)))).toEqual(state);
 // The authored station has no active exit from its alcove until a gate/bridge
 // opens. Merely keeping a restoration counter beside a free rescue is not enough.
 const station=level.pieces.find(p=>p.kind==='station')!;
 expect([{r:station.at.r-1,c:station.at.c},{r:station.at.r+1,c:station.at.c},{r:station.at.r,c:station.at.c-1},{r:station.at.r,c:station.at.c+1}].every(p=>!level.geometry.mask[p.r]?.[p.c]||level.geometry.inactiveCells.some(q=>q.r===p.r&&q.c===p.c))).toBe(true);
});
