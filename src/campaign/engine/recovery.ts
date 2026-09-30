import { createRng } from '../../core/rng';
import type { CampaignPiece,TurnContext } from '../types';
import { legalActions } from './actions';
import { actorAt,blocksTerrain } from './occupancy';
import { activeCell,cellKey } from './geometry';
import { terrainMatches } from './matches';
import { movePieces } from './transport';
import { CampaignContentError } from './context';
import { peelPracticeCoating,practiceRouteDisconnected } from '../mechanics/jelly';

/** Shuffle only terrain within each connected movable region. Fixed layers never relocate. */
export function shuffleTerrain(context:TurnContext):boolean {
  const state=context.state,candidates=state.pieces.filter(p=>p.kind==='tile'&&activeCell(state.geometry,p.at)&&!blocksTerrain(state,p.at)&&!actorAt(state,p.at));
  const remaining=new Map(candidates.map(p=>[cellKey(p.at),p])),groups:CampaignPiece[][]=[];
  while(remaining.size){
    const first=remaining.values().next().value!;const group=[first];remaining.delete(cellKey(first.at));
    for(let i=0;i<group.length;i++){
      const {r,c}=group[i]!.at;
      for(const at of [{r:r-1,c},{r:r+1,c},{r,c:c-1},{r,c:c+1}]){const piece=remaining.get(cellKey(at));if(piece){remaining.delete(cellKey(at));group.push(piece);}}
    }
    groups.push(group);
  }
  const rng=createRng(state.rngState);
  for(let attempt=0;attempt<120;attempt++){
    const moves=groups.flatMap(group=>{
      const destinations=group.map(p=>p.at);
      for(let i=destinations.length-1;i>0;i--){const j=rng.nextInt(i+1);[destinations[i],destinations[j]]=[destinations[j]!,destinations[i]!];}
      return group.map((p,i)=>({id:p.id,to:destinations[i]!}));
    });
    if(!moves.some(m=>cellKey(m.to)!==cellKey(state.pieces.find(p=>p.id===m.id)!.at)))continue;
    const locations=new Map(moves.map(m=>[m.id,m.to]));
    const candidate={...state,pieces:state.pieces.map(p=>({...p,at:locations.get(p.id)??p.at}))};
    if(terrainMatches(candidate).length||!legalActions(candidate).length)continue;
    if(!movePieces(context,moves))continue;
    state.rngState=rng.state();return true;
  }
  return false;
}
/** Returns whether practice assistance exposed terrain that needs immediate settling. */
export function ensureLegalActions(context:TurnContext):boolean {
  let peeled=false;
  if(context.state.status==='playing')while(practiceRouteDisconnected(context.state)&&peelPracticeCoating(context))peeled=true;
  if(context.state.status!=='playing'||legalActions(context.state).length||shuffleTerrain(context))return peeled;
  // Practice help is bounded by the number of coatings. Ordinary levels retain
  // the strict exhausted-recovery content error.
  while(peelPracticeCoating(context)){
    peeled=true;
    if(legalActions(context.state).length||shuffleTerrain(context))return peeled;
  }
  throw new CampaignContentError('no non-consumable legal action; terrain recovery exhausted');
}
