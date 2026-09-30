import type { MechanicModule } from '../types';
import { emit,stableIds } from '../engine/context';
import { sameCell } from '../engine/geometry';
import { touches,wear } from './wear';
export type CometsDef={id:'comets';fixtureIds:string[]};
export type CometsRuntime={id:'comets';clearedIds:string[]};
export const comets:MechanicModule={id:'comets',validate(level){
  return level.fixtures.filter(f=>f.kind==='comet').flatMap(f=>{
    if(level.fixtures.some(other=>other.kind==='comet'&&other.id!==f.id&&other.cells.some(a=>f.cells.some(b=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1))))return [{code:'comet-shared-pool',levelId:level.id,entityId:f.id,message:'A connected comet must have one shared fixture and HP pool'}];
    const reached=[f.cells[0]!];
    for(let i=0;i<reached.length;i++)for(const cell of f.cells)if(!reached.some(p=>sameCell(p,cell))&&Math.abs(reached[i]!.r-cell.r)+Math.abs(reached[i]!.c-cell.c)===1)reached.push(cell);
    return reached.length!==f.cells.length||!f.cells.some(p=>sameCell(p,f.at))?[{code:'comet-connected',levelId:level.id,entityId:f.id,message:'A comet must be one connected footprint containing its anchor'}]:[];
  });
},onMerge(context,event){
  for(const fixture of stableIds(context.state.fixtures.filter(f=>f.kind==='comet'))){
    if(!touches(fixture.cells,event)||!wear(context,fixture))continue;
    const runtime=context.state.mechanics.find(m=>m.id==='comets');
    if(runtime){const before=structuredClone(runtime);runtime.clearedIds.push(fixture.id);emit(context,{type:'mechanic',before,after:runtime});}
  }
}};
