import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,cellKey,gravitySegments,sameCell,validateGravityCoverage} from '../engine/geometry';
import {creditGoal} from '../engine/goals';
import {completedRepairCells} from './repair';
export interface KeysDef {id:'keys';fixtureIds:string[]}
export interface KeysRuntime {id:'keys';unlockedIds:string[]}
export type Gate=Extract<CampaignFixture,{kind:'gate'}>;
export function validateKeys(level:CampaignLevel):ValidationIssue[]{
 const gates=level.fixtures.filter(f=>f.kind==='gate'),locks=level.fixtures.filter(f=>f.kind==='lock');
 if(!gates.length&&!locks.length)return [];
 const issues:ValidationIssue[]=[],add=(id:string,message:string)=>issues.push({code:'key-topology',levelId:level.id,entityId:id,message});
 const owners=new Map<string,string>(),links=new Set<string>();
 for(const fixture of level.fixtures.filter(f=>f.kind==='gate'||f.kind==='bridge')){
  for(const p of fixture.cells){const key=cellKey(p);if(owners.has(key)||activeCell(level.geometry,p))add(fixture.id,'Gate/bridge footprints must uniquely own inactive cells');owners.set(key,fixture.id);}
  for(const id of fixture.connectionIds){
   const link=level.geometry.connections.find(c=>c.id===id);
   if(links.has(id)||!link||link.active||![link.from,link.to].some(p=>fixture.cells.some(q=>sameCell(p,q)))||![link.from,link.to].every(p=>activeCell(level.geometry,p)||fixture.cells.some(q=>sameCell(p,q))))add(fixture.id,'Gate/bridge links must uniquely join their own footprint to available terrain');
   links.add(id);
  }
 }
 const keyIds=new Set<string>();
 for(const gate of gates){
  const linked=locks.filter(l=>l.gateId===gate.id);if(gate.open||linked.length!==1)add(gate.id,'Closed gate requires exactly one authored lock');
  const reached=[gate.at],pending=[...gate.cells];while(pending.length){const i=pending.findIndex(p=>reached.some(q=>Math.abs(p.r-q.r)+Math.abs(p.c-q.c)===1));if(i<0){add(gate.id,'Gate footprint must connect to its anchor');break;}reached.push(pending.splice(i,1)[0]!);}
 }
 for(const lock of locks){
  const key=level.pieces.find(p=>p.id===lock.keyId);
  if(keyIds.has(lock.keyId)||key?.kind!=='cargo'||key.cargoKind!=='key'||key.destinationId!==lock.id)add(lock.id,'Lock requires its own exact authored key and destination');keyIds.add(lock.keyId);
  if(key){
   const queue=[key.at],seen=new Set<string>();
   for(let i=0;i<queue.length;i++){
    const at=queue[i]!;if(seen.has(cellKey(at)))continue;seen.add(cellKey(at));
    for(const segment of level.geometry.gravitySegments){const index=segment.cells.findIndex(p=>sameCell(p,at));if(index>=0&&index+1<segment.cells.length)queue.push(segment.cells[index+1]!);}
    for(const portal of level.fixtures)if(portal.kind==='portal'&&sameCell(portal.at,at))queue.push(portal.receiver);
    for(const current of level.mechanics.filter(m=>m.id==='currents'))for(const route of level.geometry.routes.filter(r=>current.routeIds.includes(r.id))){const index=route.cells.findIndex(p=>sameCell(p,at));if(index>=0)queue.push(route.cells[(index+1)%route.cells.length]!);}
   }
   if(!seen.has(cellKey(lock.at)))add(key.id,'Key cannot reach its lock by authored gravity or transport');
  }
 }
 for(const key of level.pieces.filter(p=>p.kind==='cargo'&&p.cargoKind==='key'))if(!keyIds.has(key.id))add(key.id,'Every key must be assigned to an authored lock');
 try{
  validateGravityCoverage(level);
  for(const segment of level.geometry.gravitySegments){const upstream=new Set<string|undefined>();for(const p of segment.cells){if(activeCell(level.geometry,p))continue;const owner=owners.get(cellKey(p));if(owner&&[...upstream].some(id=>id!==owner))add(owner,'Independent gate/bridge refill depends on another inactive footprint; split sourced segments');upstream.add(owner);}}
  for(const run of gravitySegments(level))if(!run.refill&&!level.fixtures.some(f=>f.kind==='portal'&&f.segmentId===run.segmentId))add(gates[0]?.id??locks[0]!.id,'Gate leaves active terrain without reachable refill');
 }catch(error){add(gates[0]?.id??locks[0]!.id,`Gate refill coverage: ${String(error)}`);}
 return issues;
}
/** Check immutable delivery identity and the exact permanent activation ledger. */
export function keyStateError(state:CampaignState):string|null{
 const originals=state.level.fixtures.filter(f=>f.kind==='gate'||f.kind==='lock');if(!originals.length)return null;
 const runtime=state.mechanics.find(m=>m.id==='keys');if(!runtime)return 'missing key ledger';
 if(runtime.unlockedIds.some(id=>!originals.some(f=>f.kind==='gate'&&f.id===id)))return 'key ledger contains a non-gate ID';
 for(const original of originals){
  const live=state.fixtures.find(f=>f.id===original.id);
  if(!live||live.kind!==original.kind)return 'missing authored gate or lock';
  if(original.kind==='lock'){
   if(JSON.stringify(live)!==JSON.stringify(original))return 'authored lock identity changed';
   const gate=state.fixtures.find(f=>f.id===original.gateId),key=state.pieces.find(p=>p.id===original.keyId),authored=state.level.pieces.find(p=>p.id===original.keyId)!;
   if(gate?.kind!=='gate'||gate.open===!!key)return 'key presence and gate opening disagree';
   if(key&&(key.kind!=='cargo'||key.cargoKind!=='key'||key.destinationId!==original.id||authored.kind!=='cargo'||key.passengerIds.length))return 'authored key identity changed';
  }else if(live.kind==='gate'){
   if(JSON.stringify({...live,open:original.open})!==JSON.stringify(original))return 'authored gate footprint or links changed';
   if(live.open!==runtime.unlockedIds.includes(live.id)||live.cells.some(p=>activeCell(state.geometry,p)!==live.open))return 'gate activation and ledger disagree';
   for(const goal of state.level.goals.filter(g=>g.type==='restoreInfrastructure')){const ids=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;if(ids.includes(live.id)&&state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.includes(live.id)!==live.open)return 'gate goal and activation disagree';}
  }
 }
 // Bridges perform the same combined ownership check when present. Keys also
 // need this protection on their own; neither feature may activate another's cells.
 const activated=state.fixtures.filter(f=>(f.kind==='gate'&&f.open)||(f.kind==='bridge'&&f.active));
 const cells=new Set([...activated.flatMap(f=>'cells'in f?f.cells.map(cellKey):[]),...completedRepairCells(state)]),links=new Set(activated.flatMap(f=>'connectionIds'in f?f.connectionIds:[]));
 const expected=structuredClone(state.level.geometry);expected.inactiveCells=expected.inactiveCells.filter(p=>!cells.has(cellKey(p)));expected.connections=expected.connections.map(c=>links.has(c.id)?{...c,active:true}:c);
 if(JSON.stringify(state.geometry.inactiveCells)!==JSON.stringify(expected.inactiveCells)||JSON.stringify(state.geometry.connections)!==JSON.stringify(expected.connections))return 'gate changed unrelated activation';
 const owned=new Set(originals.flatMap(f=>f.kind==='gate'?f.cells.map(cellKey):[]));
 for(const segment of expected.gravitySegments.filter(s=>s.cells.some(p=>owned.has(cellKey(p)))))if(JSON.stringify(state.geometry.gravitySegments.find(s=>s.id===segment.id))!==JSON.stringify(segment)||JSON.stringify(state.geometry.refillSources.filter(s=>s.segmentId===segment.id))!==JSON.stringify(expected.refillSources.filter(s=>s.segmentId===segment.id)))return 'gate refill topology changed';
 try{validateGravityCoverage(state);}catch{return 'gate refill coverage changed';}
 return null;
}
export const keys:MechanicModule={id:'keys',validate:validateKeys,beforeRefill(context){
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='keys');if(!runtime)return false;let changed=false;
 for(const lock of stableIds(state.fixtures.filter(f=>f.kind==='lock'))){
  const gate=state.fixtures.find(f=>f.id===lock.gateId);if(gate?.kind!=='gate'||gate.open)continue;
  const key=state.pieces.find(p=>sameCell(p.at,lock.at));
  if(!key)continue;
  if(key.id!==lock.keyId||key.kind!=='cargo'||key.cargoKind!=='key'||key.destinationId!==lock.id){if(key.kind==='cargo'&&!context.events.some(e=>e.type==='key'&&e.lockId===lock.id&&e.phase==='waiting'))emit(context,{type:'key',keyId:key.id,lockId:lock.id,gateId:gate.id,at:lock.at,phase:'waiting'});continue;}
  const group=context.events.length,before=structuredClone(gate),geometry=structuredClone(state.geometry),ledger=structuredClone(runtime);
  state.pieces=state.pieces.filter(p=>p.id!==key.id);emit(context,{type:'remove',piece:key,reason:'consumed'},group);
  gate.open=true;emit(context,{type:'fixture',fixtureId:gate.id,before,after:gate},group);
  state.geometry.inactiveCells=state.geometry.inactiveCells.filter(p=>!gate.cells.some(q=>sameCell(p,q)));for(const link of state.geometry.connections)if(gate.connectionIds.includes(link.id))link.active=true;
  emit(context,{type:'geometry',before:geometry,after:state.geometry},group);runtime.unlockedIds.push(gate.id);runtime.unlockedIds.sort();emit(context,{type:'mechanic',before:ledger,after:runtime},group);
  emit(context,{type:'key',keyId:key.id,lockId:lock.id,gateId:gate.id,at:lock.at,phase:'opened'},group);
  for(const goal of state.level.goals)if(goal.type==='restoreInfrastructure')creditGoal(context,goal.id,gate.id);changed=true;
 }
 return changed;
}};
