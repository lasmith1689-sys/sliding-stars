import type { MechanicModule } from '../types';
import { emit,stableIds } from '../engine/context';
import { touches,wear } from './wear';
export type IceDef={id:'ice';fixtureIds:string[]};
export type IceRuntime={id:'ice';thawedIds:string[]};
export const ice:MechanicModule={id:'ice',validate:()=>[],onMerge(context,event){
  for(const fixture of stableIds(context.state.fixtures.filter(f=>f.kind==='ice'))){
    if(!touches([fixture.at],event)||!wear(context,fixture))continue;
    const runtime=context.state.mechanics.find(m=>m.id==='ice');
    if(runtime){const before=structuredClone(runtime);runtime.thawedIds.push(fixture.id);emit(context,{type:'mechanic',before,after:runtime});}
  }
}};
