import { GameSession,RUN_KEY,type RunData } from '../meta/run';
import type { LevelDef,Pos } from '../core/types';
import type { PowerUpKind } from '../core/powerups';
import { BETA_CAMPAIGN_IDS,RETIRED_BETA_CAMPAIGN_IDS,getCampaignLevel,isBetaCampaignId } from '../campaign/catalog';
import { loadCampaignLevel } from '../campaign/engine/load';
import { parseSaveV2,saveSnapshot } from './storage';
import { nextAvailableCampaignId,nextCampaignId } from './migrate';
import { CampaignSession } from './campaignSession';
import type { SaveV2,SaveStorage,LevelProvider } from './types';
const meta=(run:RunData|SaveV2)=>({wallet:structuredClone(run.wallet),station:structuredClone(run.station),preferences:structuredClone(run.preferences),seenTips:[...run.seenTips]});
type Meta=ReturnType<typeof meta>;
export class LegacySession extends GameSession {
 save:SaveV2;saveWarning:string|null=null;private baseline:Meta;
 constructor(input:SaveV2,private canonicalStorage:SaveStorage){
  const save=parseSaveV2(input);if(save.active.kind!=='legacy'||save.active.rulesVersion!=='legacy-1')throw Error('Legacy executor requires legacy-1');
  const raw=JSON.stringify(save.active.run);
  // The old constructor must see ONLY canonical V2 run data, never stale browser V1.
  super(save.active.run.initial,{getItem:key=>key===RUN_KEY?raw:null,setItem:()=>{throw Error('Legacy writes must use the V2 bridge');}});
  this.save=save;this.baseline=meta(this.data);
 }
 private syncMeta():void {
  // Direct legacy UI edits remain supported when their canonical field has not changed.
  const local=meta(this.data);
  for(const key of ['wallet','station','preferences','seenTips'] as const){
   if(JSON.stringify(this.save[key])===JSON.stringify(this.baseline[key])){
    switch(key){case 'wallet':this.save.wallet=local.wallet;break;case 'station':this.save.station=local.station;break;case 'preferences':this.save.preferences=local.preferences;break;case 'seenTips':this.save.seenTips=local.seenTips;break;}
   }
  }
  Object.assign(this.data,meta(this.save));this.baseline=meta(this.data);
 }
 override persist():void {
  this.syncMeta();this.save.active={kind:'legacy',rulesVersion:'legacy-1',run:structuredClone(this.data)};this.save.revision++;
  const result=saveSnapshot(this.canonicalStorage,this.save);this.saveError=!result.ok;this.saveWarning=result.ok?null:result.error??'Save failed';
 }
 override swap(a:Pos,b:Pos){this.syncMeta();return super.swap(a,b);}
 override purchase(kind:PowerUpKind){this.syncMeta();return super.purchase(kind);}
 override pick(kind:PowerUpKind){this.syncMeta();return super.pick(kind);}
 override target(pos:Pos){this.syncMeta();return super.target(pos);}
 override replaceLevel(def:LevelDef):void {
  if(def.id!==this.data.level)throw Error('Use advanceToCampaign after finishing the legacy board');
  if(this.mode==='animating'||this.data.claimed)return;
  this.syncMeta();super.replaceLevel(def);
 }
}
export function openExecutor(save:SaveV2,storage:SaveStorage):{kind:'legacy';session:LegacySession}|{kind:'campaign';session:CampaignSession} {
 const checked=parseSaveV2(save);
 return checked.active.kind==='legacy'?{kind:'legacy',session:new LegacySession(checked,storage)}:{kind:'campaign',session:new CampaignSession(checked,storage)};
}
export async function advanceToCampaign(save:SaveV2,storage:SaveStorage,provider:LevelProvider=getCampaignLevel):Promise<SaveV2> {
 const checked=parseSaveV2(save),active=checked.active;
 if(active.kind==='legacy'&&(!active.run.claimed||active.run.board.status!=='won'))throw Error('Finish the active legacy board first');
 if(active.kind==='campaign'&&active.state.status!=='won')throw Error('Finish the active campaign board first');
 const id=provider===getCampaignLevel?nextAvailableCampaignId(checked,BETA_CAMPAIGN_IDS):nextCampaignId(checked);
 if(id===null)throw Error(provider===getCampaignLevel?'All released beta missions are complete; choose a replay':'All campaign levels are complete; choose a replay');
 return startCampaignLevel(save,checked,storage,id,provider);
}
/** Explicit beta mission selection supports replay without inventing wins for
 * the gaps in the canonical 1–1000 campaign. Existing rewards stay claimed. */
export async function selectBetaCampaignMission(save:SaveV2,storage:SaveStorage,id:number):Promise<SaveV2> {
 const checked=parseSaveV2(save);
 if(checked.active.kind!=='campaign')throw Error('Finish the active legacy board before choosing a beta mission');
 if(!isBetaCampaignId(id))throw Error(`Mission ${id} is not in this beta release`);
 return startCampaignLevel(save,checked,storage,id,getCampaignLevel);
}
/** Retired boards never replay on launch. Carry every account field forward,
 * without awarding a completion for the removed board or replaying its events. */
export async function migrateRetiredBetaMission(save:SaveV2,storage:SaveStorage):Promise<SaveV2> {
 const checked=parseSaveV2(save);
 if(checked.active.kind!=='campaign')return save;
 const current=checked.active.state;
 if(current.turn===0&&current.status==='playing'&&current.levelId<=3){
  const revised=await getCampaignLevel(current.levelId);
  if(JSON.stringify(current.level.crew)!==JSON.stringify(revised.crew))return startCampaignLevel(save,checked,storage,current.levelId,async()=>revised,false);
 }
 if(!RETIRED_BETA_CAMPAIGN_IDS.includes(current.levelId))return save;
 const retiredId=checked.active.state.levelId;
 const id=BETA_CAMPAIGN_IDS.find(candidate=>candidate>retiredId&&!checked.completedCampaignIds.includes(candidate))
  ??BETA_CAMPAIGN_IDS.find(candidate=>!checked.completedCampaignIds.includes(candidate))??BETA_CAMPAIGN_IDS[0]!;
 return startCampaignLevel(save,checked,storage,id,getCampaignLevel);
}
async function startCampaignLevel(save:SaveV2,checked:SaveV2,storage:SaveStorage,id:number,provider:LevelProvider,countAttempt=true):Promise<SaveV2> {
 const fingerprint=JSON.stringify(save),level=await provider(id);
 if(level.id!==id)throw Error('Level provider returned the wrong campaign number');
 if(JSON.stringify(save)!==fingerprint)throw Error('Save changed while loading campaign content; retry');
 const state=loadCampaignLevel(level),prior=checked.attempts[String(id)]??{started:0,failed:0};
 const next:SaveV2={...checked,revision:checked.revision+1,active:{kind:'campaign',state,events:[]},activeAssisted:false,
  attempts:{...checked.attempts,[String(id)]:{...prior,started:prior.started+(countAttempt?1:0)}}};
 // No legacy station reward is paid here: claimed legacy boards already paid it.
 const result=saveSnapshot(storage,next);if(!result.ok)throw Error(result.error??'Could not save campaign start');return next;
}
