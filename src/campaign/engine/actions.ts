import type { Pos } from '../../core/types';
import type { CampaignAction,CampaignState } from '../types';
import { activeCell,sameCell } from './geometry';
import { actorAt,blocksTerrain,pieceAt } from './occupancy';
import { terrainMatches } from './matches';
import { canMoveActor } from './transport';
import { stableIds } from './context';

export function canSlide(state:CampaignState,at:Pos):boolean {
  return activeCell(state.geometry,at)&&!!pieceAt(state,at)&&!blocksTerrain(state,at)&&!actorAt(state,at);
}
export function isLegalSwap(state:CampaignState,from:Pos,to:Pos):boolean {
  if(state.status!=='playing'||Math.abs(from.r-to.r)+Math.abs(from.c-to.c)!==1||!canSlide(state,from)||!canSlide(state,to))return false;
  const a=pieceAt(state,from)!,b=pieceAt(state,to)!;
  if(a.kind==='cargo'||b.kind==='cargo')return false;
  if(a.kind!=='tile'||b.kind!=='tile')return true;
  const candidate={...state,pieces:state.pieces.map(p=>p.id===a.id?{...p,at:to}:p.id===b.id?{...p,at:from}:p)};
  return terrainMatches(candidate).some(m=>m.cells.some(p=>sameCell(p,from)||sameCell(p,to)));
}
export function isLegalTranslation(state:CampaignState,actorId:string,dr:number,dc:number):boolean {
  const actor=state.actors.find(a=>a.id===actorId);
  return state.status==='playing'&&Number.isInteger(dr)&&Number.isInteger(dc)&&Math.abs(dr)+Math.abs(dc)===1&&
    actor?.kind==='tether'&&!actor.released&&canMoveActor(state,actorId,{r:actor.at.r+dr,c:actor.at.c+dc});
}
/** Non-consumable actions only; hints and booster-free replay share this definition. */
export function legalActions(state:CampaignState):CampaignAction[] {
  if(state.status!=='playing')return [];
  const actions:CampaignAction[]=[];
  for(let r=0;r<state.geometry.rows;r++)for(let c=0;c<state.geometry.cols;c++){
    // Directed actions: the destination is the preferred merge anchor.
    const from={r,c};for(const to of [{r:r-1,c},{r,c:c-1},{r,c:c+1},{r:r+1,c}])if(isLegalSwap(state,from,to))actions.push({type:'swap',from,to});
  }
  for(const actor of stableIds(state.actors))for(const [dr,dc] of [[-1,0],[0,-1],[0,1],[1,0]] as const){
    if(isLegalTranslation(state,actor.id,dr,dc))actions.push({type:'translate',actorId:actor.id,dr,dc});
  }
  return actions;
}
