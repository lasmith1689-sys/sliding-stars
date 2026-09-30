import { Application } from 'pixi.js';

export type Ease = (t: number) => number;
export const outQuad: Ease = (t) => 1 - (1 - t) * (1 - t);
export const inQuad: Ease = (t) => t * t;
export const outBack: Ease = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

let initialized=false;
const pending=new Set<()=>void>();
export function initTweens(_app:Application):void {initialized=true;}
/** Resolves outstanding waits; the animator guard rejects stale continuations. */
export function cancelTweens():void {for(const cancel of [...pending])cancel();}
function timed(ms:number,frame:(t:number)=>void):Promise<void> {
 return new Promise(resolve=>{let timer:ReturnType<typeof setTimeout>|undefined,elapsed=0;
  const finish=()=>{if(timer!==undefined)clearTimeout(timer);pending.delete(finish);resolve();};pending.add(finish);
  const step=()=>{elapsed+=16;try{frame(Math.min(1,elapsed/ms));}catch{finish();return;}if(elapsed>=ms)finish();else timer=setTimeout(step,16);};timer=setTimeout(step,16);
 });
}
/** Timer-owned motion cannot strand a promise when the rendering ticker pauses. */
export function tween(target:any,to:Record<string,number>,ms:number,ease:Ease=outQuad):Promise<void> {
 if(!initialized)throw Error('initTweens(app) must be called first');
 const from:Record<string,number>={};for(const key of Object.keys(to))from[key]=target[key];
 return timed(ms,t=>{if(target?.destroyed)return;const e=ease(t);for(const key of Object.keys(to))target[key]=from[key]!+(to[key]!-from[key]!)*e;});
}
export const delay=(ms:number):Promise<void>=>timed(ms,()=>{});
