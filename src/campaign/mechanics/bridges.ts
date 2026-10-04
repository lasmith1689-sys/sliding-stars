import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,cellKey,gravitySegments,sameCell,validateGravityCoverage} from '../engine/geometry';
import {creditGoal} from '../engine/goals';
import {touches} from './wear';
import {completedRepairCells} from './repair';
export interface BridgesDef {id:'bridges';fixtureIds:string[]}
export interface BridgesRuntime {id:'bridges';activatedIds:string[]}
export type Bridge=Extract<CampaignFixture,{kind:'bridge'}>;

export function validateBridges(level:CampaignLevel):ValidationIssue[]{
 const bridges=level.fixtures.filter(f=>f.kind==='bridge');if(!bridges.length)return [];
 const issues:ValidationIssue[]=[],add=(id:string,message:string)=>issues.push({code:'bridge-topology',levelId:level.id,entityId:id,message});
 const claimed=new Map<string,string>(level.fixtures.flatMap(f=>f.kind==='gate'?f.cells.map(p=>[cellKey(p),f.id] as [string,string]):[])),links=new Set<string>(level.fixtures.flatMap(f=>f.kind==='gate'?f.connectionIds:[]));
 for(const bridge of bridges){
  if(bridge.active||bridge.hits!==0)add(bridge.id,'Bridge must start folded with zero charges');
  for(const cell of bridge.cells){const key=cellKey(cell);if(claimed.has(key)||activeCell(level.geometry,cell))add(bridge.id,'Bridge cells must be uniquely owned inactive cells');claimed.set(key,bridge.id);}
  const reached=[bridge.at],pending=[...bridge.cells];
  while(pending.length){const i=pending.findIndex(p=>reached.some(q=>Math.abs(p.r-q.r)+Math.abs(p.c-q.c)===1));if(i<0){add(bridge.id,'Bridge footprint must connect to its anchored switch');break;}reached.push(pending.splice(i,1)[0]!);}
  for(const id of bridge.connectionIds){
   const link=level.geometry.connections.find(c=>c.id===id);
   if(links.has(id)||!link||link.active||![link.from,link.to].some(p=>bridge.cells.some(q=>sameCell(p,q)))||![link.from,link.to].every(p=>activeCell(level.geometry,p)||bridge.cells.some(q=>sameCell(p,q))))add(bridge.id,'Bridge connection must uniquely join its own footprint to available terrain');
   links.add(id);
  }
 }
 try{
  validateGravityCoverage(level);
  // A bridge opens atomically, but other footprints may remain folded. Every
  // absent cell between its supply and footprint must therefore share its owner.
  // Independent footprints need separate sourced segments (or portal receivers).
  for(const segment of level.geometry.gravitySegments){
   const upstreamOwners=new Set<string|undefined>();
   for(const cell of segment.cells){
    if(activeCell(level.geometry,cell))continue;
    const owner=claimed.get(cellKey(cell));
    if(owner&&[...upstreamOwners].some(id=>id!==owner))add(owner,`Bridge refill at ${cellKey(cell)} depends on another inactive footprint; split independently sourced segments`);
    upstreamOwners.add(owner);
   }
  }
  // Every active run must be refillable even before opening. A source beyond an
  // inactive gap must be authored as a separate segment, never silently starved.
  for(const run of gravitySegments(level))if(!run.refill&&!level.fixtures.some(f=>f.kind==='portal'&&f.segmentId===run.segmentId))add(bridges[0]!.id,'Bridge leaves active terrain without reachable refill');
 }catch(error){add(bridges[0]!.id,`Bridge refill coverage: ${error instanceof Error?error.message:String(error)}`);}
 return issues;
}
/** Only the bridge-owned activation may differ; routes can include absent cells. */
export function bridgeStateError(state:CampaignState):string|null {
 const authored=state.level.fixtures.filter(f=>f.kind==='bridge');if(!authored.length)return null;
 const runtime=state.mechanics.find(m=>m.id==='bridges');if(!runtime)return 'missing activation ledger';
 const opened=new Set<string>(),openedLinks=new Set<string>();
 for(const original of authored){
  const live=state.fixtures.find(f=>f.id===original.id);
  if(live?.kind!=='bridge'||!sameCell(live.at,original.at)||JSON.stringify(live.cells)!==JSON.stringify(original.cells)||JSON.stringify(live.connectionIds)!==JSON.stringify(original.connectionIds))return 'authored switch, footprint or connection identity changed';
  if(live.active!==(live.hits===2)||live.active!==runtime.activatedIds.includes(live.id))return 'charges, activation and ledger disagree';
  if(live.cells.some(p=>activeCell(state.geometry,p)!==live.active))return 'footprint activation disagrees with switch';
  if(live.active){live.cells.forEach(p=>opened.add(cellKey(p)));live.connectionIds.forEach(id=>openedLinks.add(id));}
  for(const goal of state.level.goals.filter(g=>g.type==='restoreInfrastructure')){
   const ids=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;
   if(ids.includes(live.id)&&state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.includes(live.id)!==live.active)return 'restoration goal disagrees with activation';
  }
 }
 for(const gate of state.fixtures.filter(f=>f.kind==='gate'))if(gate.open){gate.cells.forEach(p=>opened.add(cellKey(p)));gate.connectionIds.forEach(id=>openedLinks.add(id));}
 for(const cell of completedRepairCells(state))opened.add(cell);
 const expected=structuredClone(state.level.geometry);expected.inactiveCells=expected.inactiveCells.filter(p=>!opened.has(cellKey(p)));
 expected.connections=expected.connections.map(c=>openedLinks.has(c.id)?{...c,active:true}:c);
 if(JSON.stringify(state.geometry.inactiveCells)!==JSON.stringify(expected.inactiveCells)||JSON.stringify(state.geometry.connections)!==JSON.stringify(expected.connections))return 'activation changed unrelated absent cells or connections';
 const cells=new Set(authored.flatMap(b=>b.cells.map(cellKey)));
 for(const segment of expected.gravitySegments.filter(s=>s.cells.some(p=>cells.has(cellKey(p))))){
  if(JSON.stringify(state.geometry.gravitySegments.find(s=>s.id===segment.id))!==JSON.stringify(segment)||JSON.stringify(state.geometry.refillSources.filter(s=>s.segmentId===segment.id))!==JSON.stringify(expected.refillSources.filter(s=>s.segmentId===segment.id)))return 'bridge refill topology changed';
 }
 try{validateGravityCoverage(state);}catch{return 'bridge refill coverage changed';}
 return null;
}
export const bridges:MechanicModule={id:'bridges',validate:validateBridges,onMerge(context,event){
 const {state}=context;
 for(const bridge of stableIds(state.fixtures.filter(f=>f.kind==='bridge'))){
  if(bridge.active||!touches([bridge.at],event)||context.events.some(e=>e.type==='bridge'&&e.bridgeId===bridge.id&&e.mergeId===event.mergeId))continue;
  const before=structuredClone(bridge),group=context.events.length;bridge.hits++;bridge.active=bridge.hits===2;
  emit(context,{type:'fixture',fixtureId:bridge.id,before,after:bridge},group);
  if(bridge.active){
   const geometry=structuredClone(state.geometry);state.geometry.inactiveCells=state.geometry.inactiveCells.filter(p=>!bridge.cells.some(q=>sameCell(p,q)));
   for(const link of state.geometry.connections)if(bridge.connectionIds.includes(link.id))link.active=true;
   emit(context,{type:'geometry',before:geometry,after:state.geometry},group);
   const runtime=state.mechanics.find(m=>m.id==='bridges')!;const prior=structuredClone(runtime);runtime.activatedIds.push(bridge.id);runtime.activatedIds.sort();emit(context,{type:'mechanic',before:prior,after:runtime},group);
  }
  emit(context,{type:'bridge',bridgeId:bridge.id,mergeId:event.mergeId,phase:bridge.active?'opened':'charged',cells:bridge.cells},group);
  if(bridge.active)for(const goal of state.level.goals)if(goal.type==='restoreInfrastructure')creditGoal(context,goal.id,bridge.id);
 }
}};
