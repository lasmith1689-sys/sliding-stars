import type {CampaignLevel,CampaignState} from '../campaign/types';
import {eligibleIds} from '../campaign/references';
import {recordWin} from '../meta/station';
import {campaignVip} from '../meta/campaignVips';
import type {LevelProvider,SaveV2} from './types';

export const campaignRewardClaim=(level:CampaignLevel)=>`${level.campaignVersion}:${level.id}:${level.rewardId}`;
export const homeRewardClaim=(claim:string)=>`home:${claim}`;
export function rescuedOutcome(state:CampaignState):{count:number;vips:string[]}{
 const crew=state.crew.filter(c=>c.status==='housed'||c.status==='evacuated');
 return {count:crew.length,vips:crew.flatMap(c=>{const vip=campaignVip(state.levelId,c.vipId);return vip?[vip]:[];})};
}
/** Old completed saves do not retain every optional rescue. Credit only what a
 * victory guarantees; quota goals cannot establish which optional VIP got home. */
function guaranteedOutcome(level:CampaignLevel):{count:number;vips:string[]}{
 const goals=level.goals.filter(g=>g.type==='homeCrew'||g.type==='evacuate'||g.type==='simultaneousDepartures');
 const exact=new Set(goals.flatMap(g=>g.eligible.type==='ids'||g.eligible.target===eligibleIds(g,level).length?eligibleIds(g,level):[]));
 const groups:{ids:Set<string>;count:number}[]=[];
 for(const goal of goals){
  if(goal.eligible.type!=='sources')continue;
  let ids=new Set(eligibleIds(goal,level).filter(id=>!exact.has(id))),count=Math.max(0,goal.eligible.target-(eligibleIds(goal,level).length-ids.size));
  // Overlapping quotas establish a lower bound; disjoint arrival groups add.
  for(let i=groups.length-1;i>=0;i--)if([...ids].some(id=>groups[i]!.ids.has(id))){
   count=Math.max(count,groups[i]!.count);ids=new Set([...ids,...groups[i]!.ids]);groups.splice(i,1);
  }
  if(count)groups.push({ids,count});
 }
 const crew=[...level.crew,...level.arrivals.flatMap(a=>a.crew)];
 return {count:exact.size+groups.reduce((sum,g)=>sum+g.count,0),vips:crew.flatMap(c=>{const vip=campaignVip(level.id,c.vipId);return exact.has(c.id)&&vip?[vip]:[];})};
}
/** Repair old completion markers that never banked home-station rewards.
 * Account fields and the committed active board remain intact, and each payment
 * gets its own durable claim so a reload, replay or failed save cannot pay twice. */
export async function repairCampaignRewards(save:SaveV2,provider:LevelProvider):Promise<SaveV2>{
 const paid=new Set(save.rewardLedger),completed=new Set(save.completedCampaignIds);
 const pending=save.rewardLedger.flatMap(claim=>{
  const id=Number(/^[^:]+:(\d+):/.exec(claim)?.[1]);
  return completed.has(id)&&!paid.has(homeRewardClaim(claim))?[{id,claim}]:[];
 });
 if(!pending.length)return save;
 const next=structuredClone(save);
 for(const {id,claim} of pending){
  const active=save.active.kind==='campaign'&&save.active.state.levelId===id?save.active.state:null;
  const level=active?.level??await provider(id);
  // Preserve incompatible historical claims rather than guessing a reward from
  // a replacement mission (for example a retired portal board).
  if(level.id!==id||campaignRewardClaim(level)!==claim)continue;
  const outcome=active?.status==='won'?rescuedOutcome(active):guaranteedOutcome(level);
  next.station=recordWin(next.station,outcome.vips,outcome.count);next.rewardLedger.push(homeRewardClaim(claim));
 }
 if(next.rewardLedger.length===save.rewardLedger.length)return save;
 next.revision++;return next;
}
