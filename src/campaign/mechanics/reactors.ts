import type { Tier } from '../../core/types';
import type { MechanicModule } from '../types';
import { emit,stableIds } from '../engine/context';
import { touches,wear } from './wear';
export type ReactorsDef={id:'reactors';fixtureIds:string[]};
export type ReactorsRuntime={id:'reactors';overloadCount:number};
const lower:Record<Tier,Tier>={1:1,2:1,3:2,4:3,5:4};
export const reactors:MechanicModule={id:'reactors',validate:()=>[],onMerge(context,event){
  for(const fixture of stableIds(context.state.fixtures.filter(f=>f.kind==='reactor')))if(touches([fixture.at],event))wear(context,fixture);
},environment(context){
  for(const reactor of stableIds(context.state.fixtures.filter(f=>f.kind==='reactor'))){
    const before=structuredClone(reactor);reactor.fuse=Math.max(0,reactor.fuse-1);
    const erupted=reactor.fuse===0;if(erupted)reactor.fuse=reactor.period;
    emit(context,{type:'fixture',fixtureId:reactor.id,before,after:reactor});
    if(!erupted)continue;
    const runtime=context.state.mechanics.find(m=>m.id==='reactors');
    if(runtime){const before=structuredClone(runtime);runtime.overloadCount++;emit(context,{type:'mechanic',before,after:runtime});}
    for(const tile of stableIds(context.state.pieces)){
      if(tile.kind!=='tile'||tile.tier===1||Math.abs(tile.at.r-reactor.at.r)+Math.abs(tile.at.c-reactor.at.c)!==1)continue;
      const before=tile.tier;tile.tier=lower[tile.tier];
      emit(context,{type:'terrain',pieceId:tile.id,at:tile.at,before,after:tile.tier,causeId:reactor.id});
    }
  }
}};
