import { loadRun,RUN_KEY,type RunData } from '../meta/run';
import type { SaveV2 } from './types';
/** Reuse the installed legacy validator without consulting or writing browser storage. */
export function parseLegacyRun(input:unknown):RunData {
 const raw=JSON.stringify(input),run=loadRun({getItem:key=>key===RUN_KEY?raw:null,setItem:()=>{throw Error('Read-only validator');}});
 if(!run)throw Error('Invalid legacy run');return run;
}
export function migrateRun(input:RunData):SaveV2 {
 const run=parseLegacyRun(input),next=run.level+(run.claimed?1:0);
 return {schemaVersion:2,revision:0,active:{kind:'legacy',rulesVersion:'legacy-1',run},
 wallet:structuredClone(run.wallet),station:structuredClone(run.station),preferences:structuredClone(run.preferences),seenTips:[...run.seenTips],
 completedCampaignIds:[],rewardLedger:[],assistedCompletions:[],attempts:{},activeAssisted:false,learnedMechanics:[],annexLayouts:[],
 migrationEntitlements:{legacyLevel:run.level,legacyClaimed:run.claimed,unlockedThrough:Math.min(1000,next),catchUp:next>1000,chapterKitClaims:[]}};
}
/** Historical access is not proof of completion. Wrap into catch-up after the end. */
export function nextCampaignId(save:SaveV2):number|null {
 const start=save.active.kind==='legacy'?save.active.run.level+(save.active.run.claimed?1:0):save.active.state.levelId+1;
 for(let id=Math.min(start,1001);id<=1000;id++)if(!save.completedCampaignIds.includes(id))return id;
 for(let id=1;id<=1000;id++)if(!save.completedCampaignIds.includes(id))return id;
 return null;
}

/** Release navigation follows authored IDs; it never marks skipped canonical
 * numbers complete or changes the full 1–1000 campaign calculation above. */
export function nextAvailableCampaignId(save:SaveV2,availableIds:readonly number[]):number|null {
 const ids=[...availableIds];
 if(ids.some((id,index)=>!Number.isInteger(id)||id<1||id>1000||(index>0&&id<=ids[index-1]!)))throw Error('Available campaign IDs must be unique, sorted and within 1–1000');
 const start=save.active.kind==='legacy'?save.active.run.level+(save.active.run.claimed?1:0):save.active.state.levelId+1;
 const completed=new Set(save.completedCampaignIds);
 return ids.find(id=>id>=start&&!completed.has(id))??ids.find(id=>!completed.has(id))??null;
}
