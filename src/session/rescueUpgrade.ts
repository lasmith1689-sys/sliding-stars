import {loadCampaignLevel} from '../campaign/engine/load';
import type {LevelProvider,SaveV2} from './types';
const marker='rescue-shuttles-v2';
/** Old routes can rely on empty-shuttle free moves. Preserve all earned progress,
 * but prepare the active unfinished mission from the revised, verified catalog. */
export async function upgradeRescueShuttles(save:SaveV2,provider:LevelProvider):Promise<SaveV2>{
 if(save.active.kind!=='campaign'||save.seenTips.includes(marker))return save;
 const next=structuredClone(save);
 if(save.active.state.status==='playing'){
  next.active={kind:'campaign',state:loadCampaignLevel(await provider(save.active.state.levelId)),events:[]};
  next.activeAssisted=false;
 }
 next.seenTips.push(marker);next.revision++;
 return next;
}
