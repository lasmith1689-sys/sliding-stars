import type { CampaignAction,CampaignLevel,CampaignState,CampaignTransition,MechanicModule,TurnContext } from '../types';
import { parseCampaignAction,parseCampaignEvents,parseCampaignState } from '../schema';
import { campaignModules,selectModules } from '../mechanics/registry';
import { loadCampaignLevel } from './load';
import { createContext,emit } from './context';
import { activeCell } from './geometry';
import { actorAt,blocksTerrain,crewAt,isRendezvousPod,pieceAt } from './occupancy';
import { isLegalSwap,isLegalTranslation,legalActions } from './actions';
import { moveActor,movePieces } from './transport';
import { settle } from './settle';
import { safeTerrain,tickNeeds } from './needs';
import { creditGoals,goalsComplete,setStatus } from './goals';
import { ensureLegalActions,shuffleTerrain } from './recovery';
import { hashState } from './hash';
import { stepActors } from './actors';

function applyBooster(context:TurnContext,action:Extract<CampaignAction,{type:'booster'}>):boolean {
  const {state}=context;
  if(action.kind==='wormhole')return shuffleTerrain(context);

  const piece=pieceAt(state,action.at);
  if(!piece||!activeCell(state.geometry,action.at)||blocksTerrain(state,action.at)||actorAt(state,action.at)){
    return false;
  }
  if(action.kind==='demo'){
    if(piece.kind!=='tile'||crewAt(state,action.at).length)return false;
    state.pieces=state.pieces.filter(p=>p.id!==piece.id);
    emit(context,{type:'remove',piece,reason:'booster'});
    return true;
  }

  if(piece.kind!=='pod'&&piece.kind!=='station'&&(piece.kind!=='tile'||piece.tier<4)){
    return false;
  }
  if(piece.kind==='pod'&&isRendezvousPod(state,piece.id))return false;
  let changed=false;
  for(const crew of state.crew){
    if(crew.status!=='active'||crew.carrierId!==null||safeTerrain(state,crew)||
      Math.abs(crew.at.r-action.at.r)+Math.abs(crew.at.c-action.at.c)!==1){
      continue;
    }
    const from={...crew.at};
    crew.at={...action.at};
    emit(context,{type:'move',entityId:crew.id,from,to:crew.at,passengerIds:[]});
    changed=true;
  }
  return changed;
}
function runTransition(state:CampaignState,input:CampaignAction,available:readonly MechanicModule[]):CampaignTransition {
  const reject=(rejection:string):CampaignTransition=>({accepted:false,state,events:[],rejection});
  if(state.status!=='playing')return reject('Level is not playing');
  let action:CampaignAction;
  try{action=parseCampaignAction(input);}catch{return reject('Malformed action');}
  if(action.type==='swap'&&!isLegalSwap(state,action.from,action.to))return reject(
    [action.from,action.to].some(at=>pieceAt(state,at)?.kind==='station')
      ?'Stations stay fixed. Bring crew to the glowing side entrance.'
      :'Make a match of three. Empty shuttles need a match; occupied shuttles can fly to a station entrance.',
  );
  if(action.type==='translate'&&!isLegalTranslation(state,action.actorId,action.dr,action.dc))return reject('Carrier destination is blocked');
  const modules=selectModules(state.level,available),context=createContext(structuredClone(state)),draft=context.state;
  const turnStartActorIds=state.actors.map(a=>a.id);
  const ticking=action.type!=='booster';
  draft.transportedThisTurn=[];
  // 1. Apply one player action. Rejections return the exact original snapshot.
  if(action.type==='swap'){
    const from=pieceAt(draft,action.from)!,to=pieceAt(draft,action.to)!;
    if(!movePieces(context,[{id:from.id,to:action.to},{id:to.id,to:action.from}]))return reject('Destination is occupied');
  }else if(action.type==='translate'){
    const actor=draft.actors.find(a=>a.id===action.actorId)!;
    if(!moveActor(context,actor.id,{r:actor.at.r+action.dr,c:actor.at.c+action.dc}))return reject('Carrier destination is blocked');
    context.steppedActorIds.add(actor.id);
  }else if(!applyBooster(context,action))return reject('Booster has no valid effect');
  if(ticking){const before=draft.turn;draft.turn++;emit(context,{type:'turn',before,after:draft.turn});if(draft.movesRemaining!==null)draft.movesRemaining=Math.max(0,draft.movesRemaining-1);}
  if(ticking)for(const module of modules)module.beginTurn?.(context);
  // 2. Immediate matching, fall/portal/refill, departures and safety.
  settle(context,modules,action.type==='swap'?action.to:null);
  if(ticking){
    // 3. Non-actor transport in registry order, then actor transfer+step in global ID order.
    for(const module of modules)module.transfer?.(context);
    stepActors(context,modules,turnStartActorIds);
    settle(context,modules);
    // 4. Each environment hook runs once, regardless of the number of cascades.
    for(const module of modules)module.environment?.(context);
    settle(context,modules);
    // 5. End-of-turn simultaneous effects precede success and unresolved needs.
    for(const module of modules)module.finalize?.(context);
  }
  creditGoals(context);
  if(draft.status==='playing'&&goalsComplete(draft))setStatus(context,'won');
  else if(ticking&&draft.status==='playing'){
    tickNeeds(context);
    if(draft.crew.some(c=>c.status==='lost')||draft.movesRemaining===0)setStatus(context,'lost');
  }
  // 6. Newly admitted crew get safety but no counter tick on their arrival turn.
  if(ticking&&draft.status==='playing'){
    for(const module of modules)module.admit?.(context);
    settle(context,modules);creditGoals(context);if(goalsComplete(draft))setStatus(context,'won');
  }
  // Practice peeling can uncover an ordinary match after the earlier settle.
  // Resolve its immediate cascade and safety before saving, without ticking
  // actors, environment or needs again.
  while(ensureLegalActions(context)){
    settle(context,modules);creditGoals(context);
    if(draft.status==='playing'&&goalsComplete(draft))setStatus(context,'won');
  }
  for(const module of modules)module.snapshot?.(context);
  // 7. The session saves this exact immutable boundary before animating these events.
  return {accepted:true,state:parseCampaignState(draft),events:parseCampaignEvents(context.events)};
}
export function transition(state:CampaignState,action:CampaignAction):CampaignTransition {return runTransition(state,action,campaignModules);}
/** Per-engine registry injection also supports offline validators without global mutation. */
export function createCampaignEngine(modules:readonly MechanicModule[]){
  const available=[...modules];
  return {loadCampaignLevel:(level:CampaignLevel)=>loadCampaignLevel(level,available),transition:(state:CampaignState,action:CampaignAction)=>runTransition(state,action,available),legalActions,hashState};
}
