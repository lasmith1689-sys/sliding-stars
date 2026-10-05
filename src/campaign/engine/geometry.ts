import type { Pos } from '../../core/types';
import type { CampaignState,GeometryDef } from '../types';
import { CampaignContentError } from './context';
import { blocksTerrain,pieceAt } from './occupancy';
export const cellKey=(p:Pos):string=>`${p.r},${p.c}`;
export const sameCell=(a:Pos,b:Pos):boolean=>a.r===b.r&&a.c===b.c;
export function activeCell(geometry:GeometryDef,at:Pos):boolean {
  return geometry.mask[at.r]?.[at.c]===true&&!geometry.inactiveCells.some(p=>sameCell(p,at));
}
export function activeMask(geometry:GeometryDef):boolean[][] {return geometry.mask.map((row,r)=>row.map((_,c)=>activeCell(geometry,{r,c})));}
export interface GravityRun {segmentId:string;cells:Pos[];refill:boolean}

/** A missing footprint cell is empty space to fall through, never a new source.
 * Keep authored chamber/portal boundaries and save definitions unchanged. */
function fallLanes(geometry:GeometryDef):GeometryDef['gravitySegments'] {
  const remaining=geometry.gravitySegments.map(s=>({...s,cells:[...s.cells]})),lanes:GeometryDef['gravitySegments']=[];
  const sourced=(id:string)=>geometry.refillSources.some(s=>s.segmentId===id);
  const crossesGap=(a:typeof remaining[number],b:typeof remaining[number])=>{
    if(a.chamberId!==b.chamberId||a.direction!==b.direction||!sourced(a.id)||!sourced(b.id))return false;
    const tail=a.cells.at(-1)!,head=b.cells[0]!,down=a.direction==='down';
    if(down?tail.c!==head.c||head.r<=tail.r+1:tail.r!==head.r||head.c>=tail.c-1)return false;
    for(let p=down?{r:tail.r+1,c:tail.c}:{r:tail.r,c:tail.c-1};down?p.r<head.r:p.c>head.c;p=down?{r:p.r+1,c:p.c}:{r:p.r,c:p.c-1}){
      if(geometry.mask[p.r]?.[p.c])return false;
    }
    return true;
  };
  // Find upstream heads even if a saved definition lists its segments out of order.
  while(remaining.length){
    const start=remaining.findIndex(b=>!remaining.some(a=>a!==b&&crossesGap(a,b)));
    const lane=remaining.splice(start,1)[0]!;
    for(let next=remaining.findIndex(b=>crossesGap(lane,b));next>=0;next=remaining.findIndex(b=>crossesGap(lane,b))){lane.cells.push(...remaining.splice(next,1)[0]!.cells);}
    lanes.push(lane);
  }
  return lanes;
}

/** Rebuild on every physics pass: geometry switches/activation cannot leave stale runs. */
export function gravitySegments(state:Pick<CampaignState,'geometry'|'fixtures'|'pieces'>):GravityRun[] {
  const runs:GravityRun[]=[];
  // Retired portal definitions retain their original independently supplied lanes.
  const lanes=state.fixtures.some(f=>f.kind==='portal')?state.geometry.gravitySegments:fallLanes(state.geometry);
  for(const segment of lanes){
    const sourced=state.geometry.refillSources.some(s=>s.segmentId===segment.id);
    let cells:Pos[]=[],refill=sourced;
    const flush=()=>{if(cells.length)runs.push({segmentId:segment.id,cells,refill});cells=[];};
    for(const p of segment.cells){
      if(!activeCell(state.geometry,p)){flush();refill=false;continue;}
      if(blocksTerrain(state,p)||pieceAt(state,p)?.kind==='station'){flush();continue;}
      cells.push(p);
    }
    flush();
  }
  return runs;
}
export function validateGravityCoverage(state:Pick<CampaignState,'geometry'|'fixtures'>):void {
  const seen=new Set<string>();
  for(const segment of state.geometry.gravitySegments){
    for(const cell of segment.cells){const key=cellKey(cell);if(seen.has(key))throw new CampaignContentError(`overlapping gravity coverage at ${key}`);seen.add(key);}
    const sources=state.geometry.refillSources.filter(s=>s.segmentId===segment.id);
    const portal=state.fixtures.find(f=>f.kind==='portal'&&f.segmentId===segment.id);
    if(sources.length>1||(!sources.length&&!portal))throw new CampaignContentError(`segment ${segment.id} requires exactly one refill source or a portal receiver`);
    if(portal?.kind==='portal'&&(sources.length||!sameCell(portal.receiver,segment.cells[0]!)))throw new CampaignContentError(`portal receiver must head its unsourced segment ${segment.id}`);
  }
  state.geometry.mask.forEach((row,r)=>row.forEach((present,c)=>{if(present&&!seen.has(cellKey({r,c})))throw new CampaignContentError(`missing gravity coverage at ${r},${c}`);}));
}
