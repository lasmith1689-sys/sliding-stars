import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,ValidationIssue} from '../types';
import {emit,stableIds} from '../engine/context';
import {activeCell,sameCell} from '../engine/geometry';
import {actorAt,blocksTerrain,crewAt,pieceAt} from '../engine/occupancy';
import {movePiece} from '../engine/transport';
import {creditGoal} from '../engine/goals';
import {touches} from './wear';
export interface MagnetsDef {id:'magnets';fixtureIds:string[]}
export interface MagnetsRuntime {id:'magnets';deliveredIds:string[]}
export type Magnet=Extract<CampaignFixture,{kind:'magnet'}>;
export function magnetTarget(state:Pick<CampaignState,'geometry'|'pieces'>,magnet:Magnet){const cargo=state.pieces.find(p=>p.id===magnet.cargoId),route=state.geometry.routes.find(r=>r.id===magnet.routeId);if(!cargo||!route)return null;const index=route.cells.findIndex(p=>sameCell(p,cargo.at));return index<0?null:route.cells[index+1]??null;}
export function canPullMagnet(state:Pick<CampaignState,'geometry'|'pieces'|'fixtures'|'actors'|'crew'>,magnet:Magnet):boolean {const at=magnetTarget(state,magnet);return !!at&&activeCell(state.geometry,at)&&!blocksTerrain(state,at)&&!pieceAt(state,at)&&!actorAt(state,at)&&crewAt(state,at).length===0;}
export function validateMagnets(level:CampaignLevel):ValidationIssue[]{
 const magnets=level.fixtures.filter((f):f is Magnet=>f.kind==='magnet'),issues:ValidationIssue[]=[];
 const add=(id:string,message:string)=>issues.push({code:'magnet-route',levelId:level.id,entityId:id,message});
 const owners=new Set<string>();
 for(const magnet of magnets){const route=level.geometry.routes.find(r=>r.id===magnet.routeId),cargo=level.pieces.find(p=>p.id===magnet.cargoId),dock=level.geometry.endpoints.find(e=>e.id===magnet.dockId);
  if(owners.has(magnet.cargoId))add(magnet.id,'Magnet cargo requires one winch owner');owners.add(magnet.cargoId);
  if(!route||route.loop||route.cells.length<2||route.cells.some((p,i)=>!activeCell(level.geometry,p)||(i>0&&Math.abs(p.r-route.cells[i-1]!.r)+Math.abs(p.c-route.cells[i-1]!.c)!==1)))add(magnet.id,'Magnet route must be a connected active path of at least two cells');
  if(cargo?.kind!=='cargo'||cargo.cargoKind!=='capsule'||cargo.passengerIds.length||cargo.destinationId!==magnet.dockId||!route||!sameCell(cargo.at,route.cells[0]!))add(magnet.id,'Magnet requires its exact empty supply capsule at the route start');
  if(dock?.kind!=='supply-dock'||!dock.active||!route||!sameCell(dock.at,route.cells.at(-1)!))add(magnet.id,'Magnet route must end at its active supply dock');
  if(route&&level.actors.some(a=>'routeId'in a&&a.routeId===route.id))add(magnet.id,'Magnet route cannot also be an actor track');
 }
 return issues;
}
export function magnetStateError(state:CampaignState):string|null{
 const originals=state.level.fixtures.filter((f):f is Magnet=>f.kind==='magnet');if(!originals.length)return null;
 const runtime=state.mechanics.find(m=>m.id==='magnets');if(!runtime)return 'missing magnet delivery ledger';
 for(const source of originals){const live=state.fixtures.find(f=>f.id===source.id),cargo=state.pieces.find(p=>p.id===source.cargoId),authored=state.level.pieces.find(p=>p.id===source.cargoId)!;
  if(!live||JSON.stringify(live)!==JSON.stringify(source))return 'magnet identity changed';
  const route=state.geometry.routes.find(r=>r.id===source.routeId),originalRoute=state.level.geometry.routes.find(r=>r.id===source.routeId),dock=state.geometry.endpoints.find(e=>e.id===source.dockId);
  if(JSON.stringify(route)!==JSON.stringify(originalRoute)||JSON.stringify(dock)!==JSON.stringify(state.level.geometry.endpoints.find(e=>e.id===source.dockId)))return 'magnet route or supply dock changed';
  const delivered=runtime.deliveredIds.includes(source.cargoId);if(delivered===!!cargo)return 'magnet cargo presence and delivery ledger disagree';
  if(cargo&&(cargo.kind!=='cargo'||JSON.stringify({...cargo,at:authored.at})!==JSON.stringify(authored)||!route?.cells.some(p=>sameCell(p,cargo.at))))return 'magnet exact cargo identity or route position changed';
  for(const goal of state.level.goals.filter(g=>g.type==='recoverSupplies')){const ids=goal.eligible.type==='ids'?goal.eligible.ids:goal.eligible.sourceIds;if(ids.includes(source.cargoId)&&state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.includes(source.cargoId)!==delivered)return 'magnet goal disagrees with delivery';}
 }
 return null;
}
export const magnets:MechanicModule={id:'magnets',validate:validateMagnets,onMerge(context,event){
 if(context.processedMergeIds.has(`magnets:${event.mergeId}`))return;context.processedMergeIds.add(`magnets:${event.mergeId}`);
 const {state}=context,runtime=state.mechanics.find(m=>m.id==='magnets');if(!runtime)return;
 for(const magnet of stableIds(state.fixtures.filter((f):f is Magnet=>f.kind==='magnet'))){
  const cargo=state.pieces.find(p=>p.id===magnet.cargoId),to=magnetTarget(state,magnet);if(!cargo||!to||!touches([magnet.at],event))continue;
  const from={...cargo.at};if(!canPullMagnet(state,magnet)||!movePiece(context,cargo.id,to)){emit(context,{type:'magnet',magnetId:magnet.id,cargoId:cargo.id,phase:'waiting',from,to,mergeId:event.mergeId});continue;}
  const dock=state.geometry.endpoints.find(e=>e.id===magnet.dockId)!,delivered=sameCell(to,dock.at);
  emit(context,{type:'magnet',magnetId:magnet.id,cargoId:cargo.id,phase:delivered?'delivered':'pulled',from,to,mergeId:event.mergeId});
  if(!delivered)continue;
  state.pieces=state.pieces.filter(p=>p.id!==cargo.id);emit(context,{type:'remove',piece:cargo,reason:'departure'});
  const before=structuredClone(runtime);runtime.deliveredIds.push(cargo.id);runtime.deliveredIds.sort();emit(context,{type:'mechanic',before,after:runtime});
  for(const goal of state.level.goals)if(goal.type==='recoverSupplies')creditGoal(context,goal.id,cargo.id);
 }
}};
