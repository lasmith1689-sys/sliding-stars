import type {SaveStorage} from './types';
import {BACKUP_KEY, SAVE_KEY, readSave} from './storage';
import {RUN_KEY} from '../meta/run';

export interface NativePreferences {
  get(options:{key:string}):Promise<{value:string|null}>;
  set(options:{key:string;value:string}):Promise<void>;
}
export interface DurableStorage extends SaveStorage { flush():Promise<void> }
const keys=[SAVE_KEY,BACKUP_KEY,RUN_KEY];
const view=(values:Map<string,string>):SaveStorage=>({getItem:key=>values.get(key)??null,setItem:()=>{throw Error('Read only');}});

/** Native writes retain backup-first order. Failed writes stay queued for retry. */
export async function createNativeStorage(preferences:NativePreferences, local?:SaveStorage):Promise<DurableStorage> {
  const persisted=new Map<string,string>();
  await Promise.all(keys.map(async key=>{const {value}=await preferences.get({key});if(value!==null)persisted.set(key,value);}));
  const mirror=new Map<string,string>();
  if(local)for(const key of keys){try{const value=local.getItem(key);if(value!==null)mirror.set(key,value);}catch{/* Native storage remains authoritative. */}}
  const nativeRead=readSave(view(persisted)),localRead=readSave(view(mirror));
  if(nativeRead.status==='unsupported'||localRead.status==='unsupported')throw Error('A newer save version is present; it has been preserved.');
  const useLocal=localRead.save!==null&&(!nativeRead.save||localRead.save.revision>nativeRead.save.revision);
  const values=new Map(useLocal||(nativeRead.status==='empty'&&localRead.status!=='empty')?mirror:persisted);
  const pending:{key:string;value:string}[]=[];
  let running:Promise<void>|null=null;
  const flush=():Promise<void>=>{
    if(running)return running;
    running=(async()=>{while(pending.length){const write=pending[0]!;await preferences.set(write);pending.shift();}})()
      .finally(()=>{running=null;});
    return running;
  };
  if(useLocal){
    // Promote validated snapshots, never raw slots: a damaged mirror backup
    // must not erase the only good native save before the primary is durable.
    values.set(BACKUP_KEY,JSON.stringify(nativeRead.save??localRead.save));
    values.set(SAVE_KEY,JSON.stringify(localRead.save));
    for(const key of [BACKUP_KEY,SAVE_KEY,RUN_KEY]){const value=values.get(key);if(value!==undefined&&value!==persisted.get(key))pending.push({key,value});}
    await flush();
  }
  return {
    getItem:key=>values.get(key)??null,
    setItem(key,value){
      values.set(key,value);pending.push({key,value});
      try{local?.setItem(key,value);}catch{/* The acknowledged native write is the durable path. */}
      void flush().catch(()=>{/* Explicit flush reports the error without reapplying gameplay. */});
    },
    flush,
  };
}

export async function flushStorage(storage:SaveStorage):Promise<void> {
  if('flush' in storage&&typeof storage.flush==='function')await storage.flush();
}
