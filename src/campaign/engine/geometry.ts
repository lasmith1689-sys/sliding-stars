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

/** Rebuild on every physics pass: geometry switches/activation cannot leave stale runs. */
export function gravitySegments(state:Pick<CampaignState,'geometry'|'fixtures'|'pieces'>):GravityRun[] {
  const runs:GravityRun[]=[];
  for(const segment of state.geometry.gravitySegments){
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
