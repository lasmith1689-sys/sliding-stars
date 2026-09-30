import {expect,it} from 'vitest';
import {createNativeStorage} from '../../src/session/nativeStorage';
import {BACKUP_KEY,SAVE_KEY,readSave} from '../../src/session/storage';
import {getCampaignLevel} from '../../src/campaign/catalog';
import {createCampaignSave} from '../../src/session/campaignSession';

it('keeps backup before primary and retries failed native writes without losing queued progress',async()=>{
 const writes:string[]=[];let fail=true;
 const storage=await createNativeStorage({get:async()=>({value:null}),set:async({key})=>{if(fail)throw Error('Disk unavailable');writes.push(key);}});
 storage.setItem(BACKUP_KEY,'previous');storage.setItem(SAVE_KEY,'latest');
 await expect(storage.flush()).rejects.toThrow('Disk unavailable');
 expect(storage.getItem(SAVE_KEY)).toBe('latest');expect(writes).toEqual([]);
 fail=false;await storage.flush();expect(writes).toEqual([BACKUP_KEY,SAVE_KEY]);
 await storage.flush();expect(writes).toHaveLength(2);
});

it('refuses a future native save before writing or resetting anything',async()=>{
 const writes:string[]=[];
 await expect(createNativeStorage({get:async({key})=>({value:key===SAVE_KEY?JSON.stringify({schemaVersion:99}):null}),set:async({key})=>{writes.push(key);}})).rejects.toThrow('newer save');
 expect(writes).toEqual([]);
});

it('does not depend on available browser storage for acknowledged native writes',async()=>{
 const stored=new Map<string,string>();
 const storage=await createNativeStorage({get:async({key})=>({value:stored.get(key)??null}),set:async({key,value})=>{stored.set(key,value);}},{getItem:()=>{throw Error('Web cache unavailable');},setItem:()=>{throw Error('Web cache unavailable');}});
 storage.setItem('test','durable');await storage.flush();expect(stored.get('test')).toBe('durable');
});

it('preserves an invalid web mirror instead of silently starting over during native migration',async()=>{
 const writes:string[]=[];
 const storage=await createNativeStorage({get:async()=>({value:null}),set:async({key})=>{writes.push(key);}},{getItem:key=>key===SAVE_KEY?'damaged save':null,setItem:()=>{throw Error('No writes expected');}});
 expect(readSave(storage).status).toBe('corrupt');expect(storage.getItem(SAVE_KEY)).toBe('damaged save');expect(writes).toEqual([]);
});

it('keeps a validated native backup if promotion of a newer web save is interrupted',async()=>{
 const old=createCampaignSave(await getCampaignLevel(1)),newer=structuredClone(old);newer.revision=2;
 const native=new Map([[SAVE_KEY,'corrupt'],[BACKUP_KEY,JSON.stringify(old)]]);
 const local=new Map([[SAVE_KEY,JSON.stringify(newer)],[BACKUP_KEY,'corrupt']]);
 await expect(createNativeStorage({get:async({key})=>({value:native.get(key)??null}),set:async({key,value})=>{if(key===SAVE_KEY)throw Error('Interrupted');native.set(key,value);}},{getItem:key=>local.get(key)??null,setItem:()=>{}})).rejects.toThrow('Interrupted');
 expect(readSave({getItem:key=>native.get(key)??null,setItem:()=>{}}).save).toEqual(old);
});
