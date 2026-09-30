import {getAuthoredLessonLevel} from '../../../src/campaign/lessons';
import type {Tier} from '../../../src/core/types';

export const waitingMerge={type:'swap' as const,from:{r:0,c:1},to:{r:1,c:1}};
export const openingMerge={type:'swap' as const,from:{r:2,c:1},to:{r:3,c:1}};

/** Top merge leaves the blocker intact; the bottom merge opens it and clears the exit.
 * Garden mode has a fixed station above the output so terrain cannot fall into the
 * newly opened cell before production. Cargo mode puts the live crop there instead.
 */
export function harvestCrateLevel(source:'garden'|'cargo'){
 const level=getAuthoredLessonLevel(520)!;
 const rows=['12132',source==='cargo'?'21C21':'21S21','21X32','12113'];
 level.pieces=rows.flatMap((row,r)=>[...row].flatMap((value,c)=>value==='X'||value==='C'?[]:[value==='S'?{id:'shelf-station',kind:'station' as const,facing:'left' as const,at:{r,c}}:{id:`tile-${r}-${c}`,kind:'tile' as const,tier:Number(value) as Tier,at:{r,c}}]));
 level.fixtures=[{id:'crop-crate',kind:'crate',hp:1,at:{r:2,c:2}}];
 level.mechanics=[{id:'crates',fixtureIds:['crop-crate']},{id:'exits',endpointIds:['harvest-exit-0']}];
 if(source==='garden'){
  level.fixtures.push({id:'plot',kind:'garden',at:{r:1,c:1},stage:0,harvestId:'harvest-0',exitId:'harvest-exit-0',outputAt:{r:2,c:2}});
  level.mechanics.push({id:'gardens',fixtureIds:['plot']});
 }else level.pieces.push({id:'harvest-0',kind:'cargo',cargoKind:'harvest',at:{r:1,c:2},destinationId:'harvest-exit-0',passengerIds:[]});
 return level;
}
