import type { CampaignLevel,CampaignState,MechanicModule } from '../types';
import { parseCampaignLevel,parseCampaignState } from '../schema';
import { campaignModules,initialRuntime,selectModules } from '../mechanics/registry';
import { CampaignContentError,createContext } from './context';
import { validateGravityCoverage } from './geometry';
import { settle } from './settle';
import { creditGoals,goalsComplete,setStatus } from './goals';
import { ensureLegalActions } from './recovery';

export function loadCampaignLevel(definition:CampaignLevel,available:readonly MechanicModule[]=campaignModules):CampaignState {
  const level=parseCampaignLevel(definition),modules=selectModules(level,available);
  for(const module of modules){const issues=module.validate(level);if(issues.length)throw new CampaignContentError(issues.map(i=>i.message).join('; '));}
  const runtime=structuredClone(level);
  const state:CampaignState={level,levelId:level.id,campaignVersion:level.campaignVersion,rulesVersion:level.rulesVersion,
    turn:0,nextEntityId:1,rngState:level.seed,geometry:runtime.geometry,pieces:runtime.pieces,crew:runtime.crew,actors:runtime.actors,fixtures:runtime.fixtures,
    arrivals:runtime.arrivals,mechanics:modules.map(m=>initialRuntime(m.id)),goalProgress:level.goals.map(g=>({goalId:g.id,completedIds:[]})),
    movesRemaining:level.moveLimit,points:0,status:'playing',transportedThisTurn:[],pendingTransfers:[]};
  validateGravityCoverage(state);
  const context=createContext(state);settle(context,modules);creditGoals(context);if(goalsComplete(state))setStatus(context,'won');
  while(ensureLegalActions(context)){
    settle(context,modules);creditGoals(context);
    if(state.status==='playing'&&goalsComplete(state))setStatus(context,'won');
  }
  for(const module of modules)module.snapshot?.(context);
  return parseCampaignState(state);
}
