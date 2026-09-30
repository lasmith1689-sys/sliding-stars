import type { CampaignAction,CampaignLevel,CampaignTransition } from '../campaign/types';
import { transition } from '../campaign/engine/turn';
import { loadCampaignLevel } from '../campaign/engine/load';
import { earn,useCharge,buy,canBuy,emptyWallet } from '../meta/wallet';
import { emptyStation } from '../meta/station';
import type { PowerUpKind } from '../core/powerups';
import { parseSaveV2,saveSnapshot } from './storage';
import type { SaveV2,SaveStorage,SaveResult } from './types';
/** Fresh account construction requires an authored definition, never a generated fallback. */
export function createCampaignSave(level:CampaignLevel):SaveV2 {
 return {schemaVersion:2,revision:0,active:{kind:'campaign',state:loadCampaignLevel(level),events:[]},wallet:emptyWallet(),station:emptyStation(),
  preferences:{sound:false,reducedMotion:false,hints:true},seenTips:[],completedCampaignIds:[],rewardLedger:[],assistedCompletions:[],
  attempts:{[String(level.id)]:{started:1,failed:0}},activeAssisted:false,learnedMechanics:[],annexLayouts:[],
  migrationEntitlements:{legacyLevel:null,legacyClaimed:false,unlockedThrough:1,catchUp:false,chapterKitClaims:[]}};
}
export class CampaignSession {
 locked=false;saveError:string|null=null;
 save:SaveV2;
 constructor(save:SaveV2,private storage:SaveStorage){
  this.save=parseSaveV2(save);if(this.save.active.kind!=='campaign')throw Error('Campaign executor requires campaign rules');
  // A reload displays the committed final state; events are never replayed as actions.
 }
 dispatch(action:CampaignAction):CampaignTransition|null {
  const active=this.save.active;if(this.locked||active.kind!=='campaign'||active.state.status!=='playing')return null;
  if(action.type==='booster'&&!(this.save.wallet.inventory[action.kind]>0))return {accepted:false,state:active.state,events:[],rejection:'No owned booster charge'};
  const result=transition(active.state,action);if(!result.accepted)return result;
  this.locked=true;
  const next=structuredClone(this.save),id=String(result.state.levelId);
  next.wallet=earn(next.wallet,result.state.points-active.state.points);
  if(action.type==='booster'){next.wallet=useCharge(next.wallet,action.kind);next.activeAssisted=true;}
  next.active={kind:'campaign',state:structuredClone(result.state),events:structuredClone(result.events)};
  const attempts=next.attempts[id]??{started:1,failed:0};next.attempts[id]=attempts;
  if(result.state.status==='lost')attempts.failed++;
  if(result.state.status==='won'){
   if(!next.completedCampaignIds.includes(result.state.levelId))next.completedCampaignIds.push(result.state.levelId);
   const claim=`${result.state.campaignVersion}:${result.state.levelId}:${result.state.level.rewardId}`;
   if(!next.rewardLedger.includes(claim))next.rewardLedger.push(claim);
   if(next.activeAssisted&&!next.assistedCompletions.includes(result.state.levelId))next.assistedCompletions.push(result.state.levelId);
  }
  next.revision++;this.save=next;this.persist();return result;
 }
 finishPresentation():void {this.locked=false;}
 /** Explicit meta transaction: persist() itself is deliberately retry-only. */
 updatePreferences(patch:Partial<SaveV2['preferences']>):void {
  if(this.locked)return;
  this.save={...this.save,revision:this.save.revision+1,preferences:{...this.save.preferences,...patch}};this.persist();
 }
 /** Retry durability without reapplying a move, debit, reward or revision increment. */
 persist():SaveResult {const result=saveSnapshot(this.storage,this.save);this.saveError=result.ok?null:result.error??'Save failed';return result;}
 restart():void {
  if(this.locked||this.save.active.kind!=='campaign')return;
  const state=loadCampaignLevel(this.save.active.state.level),id=String(state.levelId),prior=this.save.attempts[id]??{started:1,failed:0};
  this.save={...this.save,revision:this.save.revision+1,active:{kind:'campaign',state,events:[]},activeAssisted:false,
   attempts:{...this.save.attempts,[id]:{...prior,started:prior.started+1}}};this.persist();
 }
 markAssisted():void {
  if(this.locked||this.save.active.kind!=='campaign'||this.save.active.state.status!=='playing'||this.save.activeAssisted)return;
  this.save.activeAssisted=true;this.save.revision++;this.persist();
 }
 purchase(kind:PowerUpKind):boolean {
  if(this.locked||!canBuy(this.save.wallet,kind))return false;
  this.save.wallet=buy(this.save.wallet,kind);this.save.revision++;this.persist();return true;
 }
}
