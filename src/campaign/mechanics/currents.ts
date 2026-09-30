import type {CampaignFixture,CampaignState,GeometryDef,MechanicModule,ValidationIssue} from '../types';
import {activeCell,sameCell} from '../engine/geometry';
import {pieceAt} from '../engine/occupancy';
import {canMovePieces,movePieces} from '../engine/transport';
import {emit} from '../engine/context';
export interface CurrentsDef {id:'currents';routeIds:string[]}
export interface CurrentsRuntime {id:'currents';shiftCount:number}
type CurrentLayers=Pick<CampaignState,'geometry'|'pieces'|'crew'|'actors'|'fixtures'>;
type Route=GeometryDef['routes'][number];
export const currentFixtureCells=(f:CampaignFixture)=>[f.at,...('cells'in f?f.cells:f.kind==='portal'?[f.receiver]:f.kind==='jelly'?f.coatedCells:[])];
/** Preview and rule share the complete preflight. No cell changes until all destinations pass. */
export function currentMoves(state:CurrentLayers,route:Route):{id:string;to:{r:number;c:number}}[]|null {
 const cells=route.cells;
 if(cells.some(at=>!activeCell(state.geometry,at)||state.fixtures.some(f=>currentFixtureCells(f).some(p=>sameCell(p,at)))||pieceAt(state,at)?.kind==='station'))return null;
 const moves=cells.flatMap((at,i)=>{const piece=pieceAt(state,at);return piece?[{id:piece.id,to:{...cells[(i+1)%cells.length]!}}]:[];});
 return canMovePieces(state,moves)?moves:null;
}
export const currents:MechanicModule={id:'currents',validate(level){
 const issues:ValidationIssue[]=[],seen=new Set<string>(),def=level.mechanics.find(m=>m.id==='currents');if(!def)return issues;
 const add=(id:string,message:string)=>issues.push({code:'current-lane',levelId:level.id,entityId:id,message});
 for(const id of def.routeIds){const route=level.geometry.routes.find(r=>r.id===id);if(!route)continue;
  if(!route.loop||route.cells.length<2||route.cells.some((p,i)=>{const next=route.cells[(i+1)%route.cells.length]!;return !activeCell(level.geometry,p)||Math.abs(p.r-next.r)+Math.abs(p.c-next.c)!==1;}))add(id,'Current lanes must be closed orthogonal cycles of at least two active cells');
  for(const p of route.cells){const key=`${p.r},${p.c}`;if(seen.has(key))add(id,'Current lanes must be disjoint without repeated cells');seen.add(key);
   if(level.fixtures.some(f=>currentFixtureCells(f).some(at=>sameCell(at,p)))||pieceAt(level,p)?.kind==='station')add(id,'Current lanes cannot contain fixed stations, fixtures or frozen cells');
  }
 }
 return issues;
},environment(context){
 const {state}=context,def=state.level.mechanics.find(m=>m.id==='currents'),runtime=state.mechanics.find(m=>m.id==='currents');if(!def||!runtime)return;
 for(const id of [...def.routeIds].sort()){
  const route=state.geometry.routes.find(r=>r.id===id)!,moves=currentMoves(state,route),group=context.events.length;
  if(moves===null||!movePieces(context,moves)){emit(context,{type:'current',routeId:id,phase:'waiting'},group);continue;}
  const before={...runtime};runtime.shiftCount++;emit(context,{type:'mechanic',before,after:runtime},group);emit(context,{type:'current',routeId:id,phase:'shifted'},group);
 }
}};
