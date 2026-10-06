import type {SaveV2} from './types';
import {legalActions} from '../campaign/engine/actions';
import {createContext} from '../campaign/engine/context';
import {terrainMatches} from '../campaign/engine/matches';
import {jelly,peelPracticeCoating} from '../campaign/mechanics/jelly';
import {parseCampaignState} from '../campaign/schema';

/** A prior practice save may have relied on station slides to remain playable.
 * Remove only enough jelly to restore a terrain move. Loading spends no turn,
 * relocates no entity, and never settles a match or awards a rescue.
 */
export function recoverPracticeMoves(save:SaveV2):SaveV2 {
 const active=save.active;
 if(active.kind!=='campaign'||active.state.status!=='playing'||active.state.level.metadata.failurePolicy!=='no-failure'||legalActions(active.state).length)return save;
 const context=createContext(structuredClone(active.state));
 while(peelPracticeCoating(context)){
  // Exposed matches require a real settled transition; retain that snapshot for Restart.
  if(terrainMatches(context.state).length)return save;
  if(!legalActions(context.state).length)continue;
  jelly.snapshot?.(context);
  const state=parseCampaignState(context.state);
  return {...save,revision:save.revision+1,active:{kind:'campaign',state,events:[]}};
 }
 return save;
}
