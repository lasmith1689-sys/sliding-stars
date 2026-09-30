import type { MechanicModule } from '../types';
import { awardPoints,emit,stableIds } from '../engine/context';
import { creditGoal } from '../engine/goals';
import { touches,wear } from './wear';
export type CratesDef={id:'crates';fixtureIds:string[]};
export type CratesRuntime={id:'crates';openedIds:string[]};
export const crates:MechanicModule={id:'crates',validate:()=>[],onMerge(context,event){
  for(const crate of stableIds(context.state.fixtures.filter(f=>f.kind==='crate'))){
    if(!touches([crate.at],event)||!wear(context,crate))continue;
    const runtime=context.state.mechanics.find(m=>m.id==='crates');
    if(runtime){const before=structuredClone(runtime);runtime.openedIds.push(crate.id);emit(context,{type:'mechanic',before,after:runtime});}
    awardPoints(context,40);
    for(const goal of context.state.level.goals)if(goal.type==='recoverSupplies')creditGoal(context,goal.id,crate.id);
  }
}};
