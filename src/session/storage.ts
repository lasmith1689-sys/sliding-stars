import { array,boolean,fail,integer,nullable,object,oneOf,record,text,union,type Decoder } from '../campaign/decode';
import { parseCampaignEvents,parseCampaignState } from '../campaign/schema';
import { CAMPAIGN_RULES_VERSION,CAMPAIGN_VERSION,MECHANIC_IDS } from '../campaign/types';
import { RUN_KEY } from '../meta/run';
import { STATIONS,stationDef,vipById } from '../meta/roster';
import type { StationState } from '../meta/station';
import { migrateRun,parseLegacyRun } from './migrate';
import type { ActiveSave,SaveV2,SaveStorage,SaveResult } from './types';
export const SAVE_KEY='sliding-stars-next-run-v2',BACKUP_KEY='sliding-stars-next-run-v2-backup';
const count=integer(),levelId=integer(1,1000),strings=array(text);
const optional=<T>(decode:Decoder<T>):Decoder<T|undefined>=>(input,path)=>input===undefined?undefined:decode(input,path);
function distinct<T>(decode:Decoder<T>):Decoder<T[]> {return(input,path)=>{const values=array(decode)(input,path);if(new Set(values).size!==values.length)fail(path,'duplicates');return values;};}
const theme=oneOf(['aurora','sunset','starlight']),arrangement=oneOf(['orbit','garden']);
const station:Decoder<StationState>=(input,path)=>{
 const decoded=object<StationState>({totalRescued:count,stationRescued:count,currentStation:integer(0,STATIONS.length-1),stationsCompleted:integer(0,STATIONS.length),
 collectedVips:distinct(text),builtModules:distinct(text),theme:optional(theme),arrangement:optional(arrangement),
 archives:optional(array(object({catalogIndex:integer(0,STATIONS.length-1),builtModules:distinct(text),theme,arrangement}),0,STATIONS.length))})(input,path);
 if(decoded.collectedVips.some(id=>!vipById(id)))fail(path,'unknown VIP');
 for(const entry of [{catalogIndex:decoded.currentStation,builtModules:decoded.builtModules},...(decoded.archives??[])])
  if(entry.builtModules.some(id=>!stationDef(entry.catalogIndex).modules.some(m=>m.id===id)))fail(path,'unknown room');
 // Preserve absent optional properties, as well as existing layouts, exactly.
 if(decoded.archives===undefined)delete decoded.archives;if(decoded.theme===undefined)delete decoded.theme;if(decoded.arrangement===undefined)delete decoded.arrangement;
 return decoded;
};
const attempts:Decoder<SaveV2['attempts']>=(input,path)=>Object.fromEntries(Object.entries(record(input,path)).map(([key,value])=>{
 if(!/^[1-9]\d*$/.test(key))fail(path,'invalid level key');levelId(Number(key),path);
 const entry=object({started:integer(1),failed:count})(value,`${path}.${key}`);if(entry.failed>entry.started)fail(path,'failed exceeds started');return[key,entry];
}));
const active=union<ActiveSave>('kind',{
 legacy:object({kind:oneOf(['legacy']),rulesVersion:oneOf(['legacy-1']),run:parseLegacyRun}),
 campaign:object({kind:oneOf(['campaign']),state:parseCampaignState,events:parseCampaignEvents}),
});
export function parseSaveV2(input:unknown):SaveV2 {
 const save=object<SaveV2>({schemaVersion:oneOf([2]),revision:count,active,
 wallet:object({coins:count,inventory:object({demo:count,tractor:count,wormhole:count})}),station,
 preferences:object({sound:boolean,reducedMotion:boolean,hints:boolean}),seenTips:strings,
 completedCampaignIds:distinct(levelId),rewardLedger:distinct(text),assistedCompletions:distinct(levelId),attempts,activeAssisted:boolean,learnedMechanics:distinct(oneOf(MECHANIC_IDS)),
 annexLayouts:array(object({chapter:integer(1,20),theme:text,placements:array(object({itemId:text,x:count,y:count}))})),
 migrationEntitlements:object({legacyLevel:nullable(integer(1)),legacyClaimed:boolean,unlockedThrough:levelId,catchUp:boolean,chapterKitClaims:distinct(text)}),
 })(input,'save');
 if(save.assistedCompletions.some(id=>!save.completedCampaignIds.includes(id)))fail('save.assistedCompletions','completion evidence missing');
 if(new Set(save.annexLayouts.map(a=>a.chapter)).size!==save.annexLayouts.length)fail('save.annexLayouts','duplicate chapter');
 for(const annex of save.annexLayouts)if(new Set(annex.placements.map(p=>p.itemId)).size!==annex.placements.length)fail('save.annexLayouts','duplicate item');
 return save;
}
type Candidate={kind:'empty'|'corrupt'|'unsupported'}|{kind:'valid';save:SaveV2};
function candidate(raw:string|null):Candidate {
 if(raw===null)return {kind:'empty'};
 let input:unknown;try{input=JSON.parse(raw);}catch{return {kind:'corrupt'};}
 try{
  const value=record(input,'save');
  if(value.schemaVersion!==undefined&&value.schemaVersion!==2)return {kind:'unsupported'};
  const a=record(value.active,'active');
  if(a.kind==='legacy'&&a.rulesVersion!==undefined&&a.rulesVersion!=='legacy-1')return {kind:'unsupported'};
  if(a.kind==='campaign'){
   const unsupportedVersion=(v:Record<string,unknown>)=>v.rulesVersion!==undefined&&v.rulesVersion!==CAMPAIGN_RULES_VERSION||v.campaignVersion!==undefined&&v.campaignVersion!==CAMPAIGN_VERSION;
   const state=record(a.state,'state');
   // Future rules may change or remove the embedded definition's current shape.
   if(unsupportedVersion(state))return {kind:'unsupported'};
   const level=record(state.level,'level');
   if(unsupportedVersion(level))return {kind:'unsupported'};
  }else if(a.kind!==undefined&&a.kind!=='legacy')return {kind:'unsupported'};
  return {kind:'valid',save:parseSaveV2(input)};
 }catch{return {kind:'corrupt'};}
}
function slots(storage:SaveStorage){return [candidate(storage.getItem(SAVE_KEY)),candidate(storage.getItem(BACKUP_KEY))];}
function latest(candidates:Candidate[]):SaveV2|null {
 return candidates.flatMap(c=>c.kind==='valid'?[c.save]:[]).sort((a,b)=>b.revision-a.revision)[0]??null;
}
export interface SaveRead {status:'loaded'|'recovered'|'migrated'|'empty'|'corrupt'|'unsupported'|'unavailable';save:SaveV2|null;error?:string}
export function readSave(storage:SaveStorage):SaveRead {
 try{
  const candidates=slots(storage);
  if(candidates.some(c=>c.kind==='unsupported'))return {status:'unsupported',save:null,error:'A newer or unknown save version is present; it has been preserved.'};
  const save=latest(candidates);
  if(save)return {status:candidates[0]?.kind==='valid'&&candidates[0].save.revision===save.revision?'loaded':'recovered',save};
  if(candidates.some(c=>c.kind!=='empty'))return {status:'corrupt',save:null,error:'Saved data could not be validated; both slots have been preserved.'};
  const raw=storage.getItem(RUN_KEY);if(raw===null)return {status:'empty',save:null};
  try{return {status:'migrated',save:migrateRun(parseLegacyRun(JSON.parse(raw)))};}
  catch{return {status:'corrupt',save:null,error:'Legacy save could not be validated; it has been preserved.'};}
 }catch(error){return {status:'unavailable',save:null,error:error instanceof Error?error.message:String(error)};}
}
export function loadSave(storage:SaveStorage):SaveV2|null {return readSave(storage).save;}
export function saveSnapshot(storage:SaveStorage,save:SaveV2):SaveResult {
 try{
  const checked=parseSaveV2(save),raw=JSON.stringify(checked),candidates=slots(storage);
  if(candidates.some(c=>c.kind==='unsupported'))throw Error('Refusing to overwrite an unknown save version');
  const previous=latest(candidates);
  if(previous&&checked.revision<=previous.revision){
   if(checked.revision===previous.revision&&raw===JSON.stringify(previous))return {ok:true};
   throw Error('Stale save revision; reload before writing');
  }
  if(!previous&&candidates.some(c=>c.kind==='corrupt'))throw Error('Refusing to overwrite unrecoverable saved data');
  // Never replace the only valid snapshot with an invalid primary. Write backup first.
  if(previous)storage.setItem(BACKUP_KEY,JSON.stringify(previous));
  storage.setItem(SAVE_KEY,raw);return {ok:true};
 }catch(error){return {ok:false,error:error instanceof Error?error.message:String(error)};}
}
