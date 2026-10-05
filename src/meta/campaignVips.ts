import {STATIONS} from './roster';
/** Published VIP-bearing mission IDs. Earlier content used the starter portrait
 * for every VIP slot. Resolve that historical marker without rewriting saved
 * boards, so each existing resident and room is reachable in the campaign. */
export const CAMPAIGN_VIP_MISSIONS:readonly number[]=[3,12,23,30,42,90,120,165,192,201,207,222,246,264,297,336,342,363,387,408,432,465,489,537,644,837,869];
const roster=STATIONS.flatMap(station=>station.vips.map(vip=>vip.id));
export function campaignVip(levelId:number,vipId:string|null):string|null {
 const slot=CAMPAIGN_VIP_MISSIONS.indexOf(levelId);
 return vipId==='botanist'&&slot>=0?roster[slot%roster.length]!:vipId;
}
