import type {LevelDef} from '../core/types';
import {INTRO} from './intro';
const cache=new Map<number,Promise<LevelDef>>();
let worker:Worker|undefined;
const pending=new Map<number,{resolve:(d:LevelDef)=>void;reject:(e:Error)=>void}>();
export function mission(index:number):Promise<LevelDef> {
 if(index<=INTRO.length) return Promise.resolve(structuredClone(INTRO[index-1]!));
 if(!worker){
  worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=(e:MessageEvent<{index:number;def?:LevelDef;error?:string}>)=>{
   const p=pending.get(e.data.index);if(!p)return;pending.delete(e.data.index);
   if(e.data.def)p.resolve(e.data.def);else{cache.delete(e.data.index);p.reject(new Error(e.data.error));}
  };
  worker.onerror=()=>{for(const p of pending.values())p.reject(new Error('Mission preparation failed. Please retry.'));pending.clear();cache.clear();worker?.terminate();worker=undefined;};
 }
 if(!cache.has(index))cache.set(index,new Promise((resolve,reject)=>{pending.set(index,{resolve,reject});worker!.postMessage(index);}));
 return cache.get(index)!.then(def=>structuredClone(def));
}
export function prefetch(index:number):void {void mission(index).catch(()=>{/* Next launch exposes a retry if necessary. */});}
