import {levelFixture} from '../fixtures';
export function pirateLevel(){
 const l=levelFixture();l.id=327;l.chapter=7;l.crew=[];
 l.geometry.refillSources=[0,1,2].map(c=>({id:`source-${c}`,at:{r:0,c},segmentId:`col-${c}`}));
 l.geometry.gravitySegments=[0,1,2].map(c=>({id:`col-${c}`,cells:[0,1,2].map(r=>({r,c})),direction:'down' as const,chamberId:'room'}));
 l.geometry.chambers[0]!.cells=l.geometry.mask.flatMap((row,r)=>row.map((_,c)=>({r,c})));
 l.pieces=l.geometry.chambers[0]!.cells.map(at=>({id:`tile-${at.r}-${at.c}`,kind:'tile' as const,tier:([ [1,2,1],[2,1,3],[3,2,4] ] as const)[at.r]![at.c]!,at}));
 l.geometry.endpoints=[{id:'dock',kind:'supply-dock',at:{r:2,c:2},active:true}];
 l.geometry.routes=[{id:'track',loop:false,cells:[{r:2,c:0},{r:2,c:1},{r:2,c:2}]}];
 l.actors=[{id:'drone',kind:'pirate',at:{r:2,c:0},routeId:'track',routeIndex:0,dockId:'dock',distraction:2,parcelId:'parcel'}];
 l.mechanics=[{id:'pirates',actorIds:['drone']}];l.goals=[{id:'intercept',type:'interceptDrones',eligible:{type:'ids',ids:['drone']}}];return l;
}
