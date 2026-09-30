import type {Pos} from '../../core/types';
import type {CampaignFixture,CampaignLevel,CampaignState,GeometryDef,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,cellKey,sameCell,validateGravityCoverage} from '../engine/geometry';
export interface GravityDef {id:'gravity';fixtureIds:string[]}
export interface GravityRuntime {id:'gravity';toggleCount:number;flippedIds:string[]}
export type GravitySwitch=Extract<CampaignFixture,{kind:'gravity-switch'}>;
type Direction=GravitySwitch['direction'];
export const nextGravity=(direction:Direction):Direction=>direction==='down'?'left':'down';
/** Maximal directed runs over the complete authored footprint, including gaps. */
function runs(cells:Pos[],direction:Direction):Pos[][] {
 const keys=new Set(cells.map(cellKey)),step=direction==='down'?{r:1,c:0}:{r:0,c:-1};
 return cells.filter(p=>!keys.has(cellKey({r:p.r-step.r,c:p.c-step.c}))).sort((a,b)=>a.r-b.r||a.c-b.c).map(head=>{
  const result:Pos[]=[];for(let p={...head};keys.has(cellKey(p));p={r:p.r+step.r,c:p.c+step.c})result.push(p);return result;
 });
}
/** Derive both orientations from immutable authoring; portal discharge IDs never change. */
export function gravityTopology(level:Pick<CampaignLevel,'geometry'|'fixtures'>,sw:GravitySwitch,direction:Direction):Pick<GeometryDef,'gravitySegments'|'refillSources'> {
 const chamber=level.geometry.chambers.find(c=>c.id===sw.chamberId);if(!chamber)throw Error('Gravity chamber missing');
 const originals=level.geometry.gravitySegments.filter(s=>s.chamberId===sw.chamberId),originalIds=new Set(originals.map(s=>s.id));
 const portals=level.fixtures.filter(f=>f.kind==='portal').filter(f=>originalIds.has(f.segmentId));
 const gravitySegments=runs(chamber.cells,direction).map((cells,index)=>{
  const portal=portals.find(p=>sameCell(p.receiver,cells[0]!));
  const original=direction===sw.direction?originals.find(s=>JSON.stringify(s.cells)===JSON.stringify(cells)):undefined;
  return {id:portal?.segmentId??original?.id??`${sw.id}-${direction}-${index}`,cells,direction,chamberId:sw.chamberId};
 });
 for(const portal of portals)if(!gravitySegments.some(s=>s.id===portal.segmentId))throw Error('Portal receiver must head its unsourced segment in both gravity orientations');
 const refillSources=gravitySegments.filter(s=>!portals.some(p=>p.segmentId===s.id)).map(segment=>({id:level.geometry.refillSources.find(s=>s.segmentId===segment.id)?.id??`${segment.id}-source`,at:{...segment.cells[0]!},segmentId:segment.id}));
 return {gravitySegments,refillSources};
}
function applyTopology(geometry:GeometryDef,chamberId:string,topology:ReturnType<typeof gravityTopology>):void {
 const ids=new Set(geometry.gravitySegments.filter(s=>s.chamberId===chamberId).map(s=>s.id));
 geometry.gravitySegments=[...geometry.gravitySegments.filter(s=>!ids.has(s.id)),...topology.gravitySegments];
 geometry.refillSources=[...geometry.refillSources.filter(s=>!ids.has(s.segmentId)),...topology.refillSources];
}
const sorted=(items:{id:string}[])=>[...items].sort((a,b)=>a.id.localeCompare(b.id));
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function validateGravity(level:CampaignLevel):ValidationIssue[]{
 const switches=level.fixtures.filter(f=>f.kind==='gravity-switch');if(!switches.length)return [];
 const issues:ValidationIssue[]=[],add=(id:string,message:string)=>issues.push({code:'gravity-topology',levelId:level.id,entityId:id,message});
 for(const sw of switches)try{
  const chamber=level.geometry.chambers.find(c=>c.id===sw.chamberId)!;
  if(!chamber||!chamber.directions.includes('down')||!chamber.directions.includes('left')||!chamber.cells.some(p=>sameCell(p,sw.at)))throw Error('Switch requires its own down/left chamber');
  if(switches.filter(f=>f.chamberId===sw.chamberId).length!==1)throw Error('One switch owns each switched chamber');
  if(new Set(chamber.cells.map(cellKey)).size!==chamber.cells.length||level.geometry.chambers.some(c=>c.id!==chamber.id&&c.cells.some(p=>chamber.cells.some(q=>sameCell(p,q)))))throw Error('Switch chamber membership must be unique');
  // Activation mechanics may coexist outside the chamber. Partial switched
  // footprints are deliberately unsupported until their supply proof is authored.
  if(chamber.cells.some(p=>!activeCell(level.geometry,p)))throw Error('Switched chamber must have fully active terrain');
  for(const direction of ['down','left'] as const){
   const topology=gravityTopology(level,sw,direction),geometry=structuredClone(level.geometry);
   if(direction===sw.direction&&(!equal(sorted(topology.gravitySegments),sorted(geometry.gravitySegments.filter(s=>s.chamberId===sw.chamberId)))||!equal(sorted(topology.refillSources),sorted(geometry.refillSources.filter(s=>geometry.gravitySegments.some(g=>g.chamberId===sw.chamberId&&g.id===s.segmentId))))))throw Error('Authored gravity must match maximal ordered chamber runs and opposite-edge sources');
   applyTopology(geometry,sw.chamberId,topology);validateGravityCoverage({geometry,fixtures:level.fixtures});
   if(new Set(geometry.gravitySegments.map(s=>s.id)).size!==geometry.gravitySegments.length||new Set(geometry.refillSources.map(s=>s.id)).size!==geometry.refillSources.length)throw Error('Gravity topology IDs collide');
  }
 }catch(error){add(sw.id,String(error));}
 return issues;
}
export function gravityStateError(state:CampaignState):string|null {
 const originals=state.level.fixtures.filter(f=>f.kind==='gravity-switch');if(!originals.length)return null;
 const runtime=state.mechanics.find(m=>m.id==='gravity');if(!runtime)return 'missing gravity ledger';
 if(runtime.toggleCount<runtime.flippedIds.length||(runtime.toggleCount-runtime.flippedIds.length)%2!==0)return 'gravity parity mismatch';
 const expected=structuredClone(state.level.geometry);
 for(const original of originals){
  const live=state.fixtures.find(f=>f.id===original.id),direction=runtime.flippedIds.includes(original.id)?nextGravity(original.direction):original.direction;
  if(live?.kind!=='gravity-switch'||!equal(live,{...original,direction}))return 'gravity switch identity or direction mismatch';
  applyTopology(expected,original.chamberId,gravityTopology(state.level,original,direction));
 }
 if(!equal(sorted(expected.gravitySegments),sorted(state.geometry.gravitySegments))||!equal(sorted(expected.refillSources),sorted(state.geometry.refillSources))||!equal(expected.chambers,state.geometry.chambers))return 'gravity ordered topology or source ownership mismatch';
 return null;
}
export const gravity:MechanicModule={id:'gravity',validate:validateGravity,onMerge(context,event){
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='gravity');if(!runtime)return;
 for(const sw of stableIds(state.fixtures.filter(f=>f.kind==='gravity-switch'))){
  if(!event.cells.some(p=>sameCell(p,sw.at))||context.events.some(e=>e.type==='gravity'&&e.switchId===sw.id&&e.mergeId===event.mergeId))continue;
  const before=structuredClone(sw),geometry=structuredClone(state.geometry),ledger=structuredClone(runtime),group=context.events.length;
  sw.direction=nextGravity(sw.direction);const authored=state.level.fixtures.find(f=>f.id===sw.id) as GravitySwitch;
  applyTopology(state.geometry,sw.chamberId,gravityTopology(state.level,authored,sw.direction));
  runtime.toggleCount++;runtime.flippedIds=runtime.flippedIds.includes(sw.id)?runtime.flippedIds.filter(id=>id!==sw.id):[...runtime.flippedIds,sw.id].sort();
  emit(context,{type:'fixture',fixtureId:sw.id,before,after:sw},group);emit(context,{type:'geometry',before:geometry,after:state.geometry},group);emit(context,{type:'mechanic',before:ledger,after:runtime},group);
  emit(context,{type:'gravity',switchId:sw.id,chamberId:sw.chamberId,mergeId:event.mergeId,at:sw.at,before:before.direction,after:sw.direction},group);
 }
}};
