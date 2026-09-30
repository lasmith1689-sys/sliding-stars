import type { CampaignEvent,CampaignLevel,CampaignState,MechanicId } from '../campaign/types';
import type { Preferences,RunData,SaveStorage } from '../meta/run';
import type { Wallet } from '../meta/wallet';
import type { StationState } from '../meta/station';
export type { SaveStorage };
export type ActiveSave={kind:'legacy';rulesVersion:'legacy-1';run:RunData}|{kind:'campaign';state:CampaignState;events:CampaignEvent[]};
export interface SaveV2 {
 schemaVersion:2;revision:number;active:ActiveSave;
 /** Canonical account meta; legacy run's copies are synchronized on executor mutations. */
 wallet:Wallet;station:StationState;preferences:Preferences;seenTips:string[];
 completedCampaignIds:number[];rewardLedger:string[];assistedCompletions:number[];
 attempts:Record<string,{started:number;failed:number}>;activeAssisted:boolean;learnedMechanics:MechanicId[];
 annexLayouts:{chapter:number;theme:string;placements:{itemId:string;x:number;y:number}[]}[];
 migrationEntitlements:{legacyLevel:number|null;legacyClaimed:boolean;unlockedThrough:number;catchUp:boolean;chapterKitClaims:string[]};
}
export interface SaveResult {ok:boolean;error?:string}
export type LevelProvider=(id:number)=>Promise<CampaignLevel>;
