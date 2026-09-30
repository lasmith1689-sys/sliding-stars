import type { CampaignLevel } from '../../../src/campaign/types';
import { baseLevel } from './base';
export const exitMove={type:'swap' as const,from:{r:0,c:2},to:{r:1,c:2}};
export function exitLevel():CampaignLevel {
 const level=baseLevel();level.id=112;level.chapter=3;level.metadata.failurePolicy=undefined;
 const mask=[[true,true,true],[true,true,true]],cells=mask.flatMap((row,r)=>row.map((_,c)=>({r,c})));
 level.geometry={rows:2,cols:3,mask,inactiveCells:[],chambers:[{id:'room',cells,directions:['down']}],
  gravitySegments:[0,1,2].map(c=>({id:`fall-${c}`,cells:[{r:0,c},{r:1,c}],direction:'down',chamberId:'room'})),
  refillSources:[0,1,2].map(c=>({id:`source-${c}`,at:{r:0,c},segmentId:`fall-${c}`})),routes:[],connections:[],endpoints:[{id:'exit-a',kind:'exit',at:{r:1,c:0},active:true}]};
 level.pieces=[{id:'capsule-a',kind:'cargo',cargoKind:'capsule',at:{r:0,c:0},destinationId:'exit-a',passengerIds:['passenger']},
  ...[[0,1,2],[0,2,1],[1,0,1],[1,1,1],[1,2,2]].map(([r,c,tier])=>({id:`tile-${r}-${c}`,kind:'tile' as const,at:{r:r!,c:c!},tier:tier as 1|2}))];
 level.crew=[{id:'passenger',at:{r:0,c:0},status:'active',carrierId:'capsule-a',rescueMoves:null,shelterMoves:null,shelterStarted:false,vipId:null}];
 level.fixtures=[];level.actors=[];level.arrivals=[];level.mechanics=[{id:'exits',endpointIds:['exit-a']}];
 level.goals=[{id:'evacuation',type:'evacuate',eligible:{type:'ids',ids:['capsule-a']}}];return level;
}
