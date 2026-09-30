import type {Pos} from '../../core/types';
import {doorCell} from '../../core/dome';
import type {CampaignFixture,CampaignLevel,CampaignState,MechanicModule,TurnContext,ValidationIssue} from '../types';
import {activeCell,cellKey,sameCell} from '../engine/geometry';
import {actorAt,crewAt,fixtureBlocks,fixtureCells,pieceAt} from '../engine/occupancy';
import {emit,stableIds} from '../engine/context';

export type JellyDef={id:'jelly';fixtureIds:string[]};
export type JellyRuntime={id:'jelly';turnsUntilSpread:number;cancelledThisTurn:boolean};
export type JellyFixture=Extract<CampaignFixture,{kind:'jelly'}>;
const adjacent=(a:Pos,b:Pos)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;

export function jellyEligible(state:CampaignState,at:Pos,source:JellyFixture):boolean {
 if(!activeCell(state.geometry,at)||source.coatedCells.some(p=>sameCell(p,at)))return false;
 if(!state.fixtures.some(f=>f.kind==='jelly'&&f.id===source.id))return false;
 if(!state.pieces.some(p=>p.kind==='tile'&&sameCell(p.at,at))||crewAt(state,at).length||actorAt(state,at))return false;
 if(state.fixtures.some(f=>[f.at,...('cells'in f?f.cells:f.kind==='portal'?[f.receiver]:[])].some(p=>sameCell(p,at))))return false;
 if(state.geometry.endpoints.some(e=>sameCell(e.at,at))||state.geometry.routes.some(r=>r.cells.some(p=>sameCell(p,at))))return false;
 if(state.actors.some(a=>'routeId'in a&&a.routeId&&state.geometry.routes.find(r=>r.id===a.routeId)?.cells.some(p=>sameCell(p,at))))return false;
 return true;
}
function rawJellyTarget(state:CampaignState,source:JellyFixture):Pos|null {
 const origins=[source.at,...source.coatedCells],seen=new Set<string>();
 const candidates=origins.flatMap(p=>[{r:p.r-1,c:p.c},{r:p.r,c:p.c-1},{r:p.r,c:p.c+1},{r:p.r+1,c:p.c}])
  .filter(p=>{const key=cellKey(p);if(seen.has(key))return false;seen.add(key);return jellyEligible(state,p,source);})
  .sort((a,b)=>a.r-b.r||a.c-b.c);
 return candidates[0]??null;
}
/** A practice guest retains a path to at least one currently usable station door. */
export function practiceRouteDisconnected(state:CampaignState):boolean {
 if(state.level.metadata.failurePolicy!=='no-failure'||!state.fixtures.some(f=>f.kind==='jelly'))return false;
 const stations=state.pieces.filter(p=>p.kind==='station');
 if(!stations.length)return false;
 const passable=(at:Pos,guestId:string,ignoreCoating:boolean):boolean=>{
  if(!activeCell(state.geometry,at))return false;
  const piece=pieceAt(state,at);
  if(!piece||piece.kind==='station'||piece.kind==='cargo'||actorAt(state,at)||crewAt(state,at).some(c=>c.id!==guestId))return false;
  return !state.fixtures.some(f=>f.kind==='jelly'
   ?!ignoreCoating&&f.coatedCells.some(p=>sameCell(p,at))
   :fixtureBlocks(f)&&fixtureCells(f).some(p=>sameCell(p,at)));
 };
 const reachable=(origin:Pos,guestId:string,doors:Pos[],ignoreCoating:boolean):boolean=>{
  const targets=new Set(doors.filter(at=>passable(at,guestId,ignoreCoating)).map(cellKey));
  if(!targets.size)return false;
  const seen=new Set([cellKey(origin)]),queue=[origin];
  for(let i=0;i<queue.length;i++){
   const at=queue[i]!;if(targets.has(cellKey(at)))return true;
   for(const next of [{r:at.r-1,c:at.c},{r:at.r,c:at.c-1},{r:at.r,c:at.c+1},{r:at.r+1,c:at.c}]){
    const key=cellKey(next);if(seen.has(key)||!passable(next,guestId,ignoreCoating))continue;
    seen.add(key);queue.push(next);
   }
  }
  return false;
 };
 const doors=stations.map(s=>doorCell(s.at.r,s.at.c,s.facing));
 return state.crew.some(guest=>guest.status==='active'&&
  reachable(guest.at,guest.id,doors,true)&&!reachable(guest.at,guest.id,doors,false));
}
function blocksPracticeRoute(state:CampaignState,source:JellyFixture,at:Pos):boolean {
 if(state.level.metadata.failurePolicy!=='no-failure')return false;
 source.coatedCells.push(at);
 try{return practiceRouteDisconnected(state);}finally{source.coatedCells.pop();}
}
export function nextJellyTarget(state:CampaignState,source:JellyFixture):Pos|null {
 const target=rawJellyTarget(state,source);
 return target&&!blocksPracticeRoute(state,source,target)?target:null;
}
/** Validate a saved forecast; canonicalize only an exact pre-guard practice target. */
export function jellyStateError(state:CampaignState):string|null {
 const clock=state.mechanics.find(m=>m.id==='jelly');
 if(!clock)return null;
 if(clock.turnsUntilSpread<1||clock.turnsUntilSpread>3)return 'spread clock must be 1–3 at a saved boundary';
 for(const fixture of state.fixtures.filter(f=>f.kind==='jelly')){
  for(const at of fixture.coatedCells){
   if(!jellyEligible(state,at,{...fixture,coatedCells:fixture.coatedCells.filter(p=>!sameCell(p,at))}))return 'coating must cover eligible ordinary terrain';
  }
  const next=nextJellyTarget(state,fixture);
  const matches=(at:Pos|null)=>at===null?fixture.preview===null:fixture.preview!==null&&sameCell(at,fixture.preview);
  // A prior practice save can forecast the raw deterministic candidate even
  // while its current route is still connected. If the new safeguard suppresses
  // exactly that candidate, clear the obsolete warning before display/save.
  const legacy=state.level.metadata.failurePolicy==='no-failure'&&next===null?rawJellyTarget(state,fixture):null;
  if(!matches(next)){
   if(!legacy||!matches(legacy))return 'preview must match the saved board';
   fixture.preview=null;
  }
 }
 return null;
}
function runtime(context:TurnContext):JellyRuntime {return context.state.mechanics.find(m=>m.id==='jelly') as JellyRuntime;}
function changeRuntime(context:TurnContext,patch:Partial<JellyRuntime>):void {
 const current=runtime(context),before=structuredClone(current);Object.assign(current,patch);
 if(JSON.stringify(before)!==JSON.stringify(current))emit(context,{type:'mechanic',before,after:current});
}
function setPreview(context:TurnContext,source:JellyFixture):void {
 const next=nextJellyTarget(context.state,source);if((next===null&&source.preview===null)||(next&&source.preview&&sameCell(next,source.preview)))return;
 const before=structuredClone(source);source.preview=next;emit(context,{type:'fixture',fixtureId:source.id,before,after:source});
 emit(context,{type:'jelly',fixtureId:source.id,phase:'preview',at:next});
}
/** No-failure practice only: peel one coating in stable fixture, row, column order. */
export function peelPracticeCoating(context:TurnContext):boolean {
 if(context.state.level.metadata.failurePolicy!=='no-failure')return false;
 for(const fixture of stableIds(context.state.fixtures.filter(f=>f.kind==='jelly'))){
  const at=[...fixture.coatedCells].sort((a,b)=>a.r-b.r||a.c-b.c)[0];
  if(!at)continue;
  const before=structuredClone(fixture);
  fixture.coatedCells=fixture.coatedCells.filter(p=>!sameCell(p,at));
  emit(context,{type:'fixture',fixtureId:fixture.id,before,after:fixture});
  emit(context,{type:'jelly',fixtureId:fixture.id,phase:'cleared',at});
  emit(context,{type:'jelly',fixtureId:fixture.id,phase:'practice-assisted',at});
  return true;
 }
 return false;
}
export const jelly:MechanicModule={id:'jelly',validate(level:CampaignLevel):ValidationIssue[]{
 return level.fixtures.filter(f=>f.kind==='jelly').flatMap(f=>{const preview=f.preview;return preview&&f.coatedCells.some(p=>sameCell(p,preview))?[{code:'jelly',levelId:level.id,entityId:f.id,message:'Preview cannot already be coated'}]:[];});
},beginTurn(context){changeRuntime(context,{cancelledThisTurn:false});},onMerge(context,event){
 for(const fixture of stableIds(context.state.fixtures.filter(f=>f.kind==='jelly'))){
  const cleared=fixture.coatedCells.filter(p=>event.cells.some(cell=>adjacent(cell,p)));
  if(!cleared.length)continue;
  const before=structuredClone(fixture);fixture.coatedCells=fixture.coatedCells.filter(p=>!cleared.some(c=>sameCell(c,p)));
  emit(context,{type:'fixture',fixtureId:fixture.id,before,after:fixture});
  for(const at of cleared)emit(context,{type:'jelly',fixtureId:fixture.id,phase:'cleared',at});
  changeRuntime(context,{cancelledThisTurn:true});
 }
},finalize(context){
 const current=runtime(context),remaining=Math.max(0,current.turnsUntilSpread-1);
 if(current.cancelledThisTurn){changeRuntime(context,{turnsUntilSpread:remaining||3});return;}
 if(remaining){changeRuntime(context,{turnsUntilSpread:remaining});return;}
 for(const fixture of stableIds(context.state.fixtures.filter(f=>f.kind==='jelly'))){
  const target=rawJellyTarget(context.state,fixture);
  if(target&&blocksPracticeRoute(context.state,fixture,target))emit(context,{type:'jelly',fixtureId:fixture.id,phase:'practice-waited',at:target});
  else if(target){const before=structuredClone(fixture);fixture.coatedCells.push(target);fixture.coatedCells.sort((a,b)=>a.r-b.r||a.c-b.c);
   fixture.preview=null;emit(context,{type:'fixture',fixtureId:fixture.id,before,after:fixture});emit(context,{type:'jelly',fixtureId:fixture.id,phase:'coated',at:target});}
  else emit(context,{type:'jelly',fixtureId:fixture.id,phase:'waiting',at:null});
 }
 changeRuntime(context,{turnsUntilSpread:3});
},snapshot(context){for(const fixture of stableIds(context.state.fixtures.filter(f=>f.kind==='jelly')))setPreview(context,fixture);}};
