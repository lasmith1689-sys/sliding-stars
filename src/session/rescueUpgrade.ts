import {loadCampaignLevel} from '../campaign/engine/load';
import type {LevelProvider,SaveV2} from './types';
import {nextCampaignId} from './migrate';
const marker='rescue-shuttles-v2';
/** Old routes can rely on empty-shuttle free moves. Preserve all earned progress,
 * but prepare the active unfinished mission from the revised, verified catalog. */
export async function upgradeRescueShuttles(save:SaveV2,provider:LevelProvider):Promise<SaveV2>{
 if(save.seenTips.includes(marker))return save;
 // Keep unclaimed legacy victory rewards available. All other old sessions
 // enter the campaign directly, retaining their existing account balances.
 if(save.active.kind==='legacy'&&save.active.run.board.status==='won'&&!save.active.run.claimed)return save;
 const next=structuredClone(save);
 if(save.active.kind==='legacy'){
  const id=nextCampaignId(save)??1;
  next.active={kind:'campaign',state:loadCampaignLevel(await provider(id)),events:[]};
  next.activeAssisted=false;
 }else if(save.active.state.status==='playing'){
  next.active={kind:'campaign',state:loadCampaignLevel(await provider(save.active.state.levelId)),events:[]};
  next.activeAssisted=false;
 }
 next.seenTips.push(marker);next.revision++;
 return next;
}
