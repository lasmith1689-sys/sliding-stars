import type {CampaignEvent} from '../../campaign/types';
import {applySceneEvents,type CampaignScene} from './snapshot';
export interface CampaignRenderTarget {readonly scene:CampaignScene;sync(scene:CampaignScene):void;interpolate(from:CampaignScene,to:CampaignScene,progress:number,events:readonly CampaignEvent[]):void}
export function eventDuration(kind:'swap'|'merge'|'transport'|'rescue',reduced:boolean):number {return reduced?70:{swap:160,merge:320,transport:240,rescue:500}[kind];}
/** Owns cancellable timers, independent of the Pixi ticker. cancel synchronously restores final state. */
export class CampaignAnimator {
 private generation=0;private timer:ReturnType<typeof setTimeout>|undefined;private resolve:(()=>void)|undefined;private final:CampaignScene|undefined;
 constructor(private target:CampaignRenderTarget,private reduced:()=>boolean=()=>false){}
 cancel():void {this.generation++;if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;if(this.final)this.target.sync(this.final);this.final=undefined;this.resolve?.();this.resolve=undefined;}
 async play(events:readonly CampaignEvent[],finalScene:CampaignScene):Promise<void> {
  this.cancel();const token=this.generation;this.final=finalScene;
  const groups:CampaignEvent[][]=[];
  for(const event of [...events].sort((a,b)=>a.sequenceId-b.sequenceId)){const last=groups.at(-1);if(last?.[0]?.timingGroup===event.timingGroup)last.push(event);else groups.push([event]);}
  const duration=(group:CampaignEvent[],index:number)=>group.some(e=>e.type==='shelter')?(this.reduced()?70:400):group.some(e=>(e.type==='bridge'||e.type==='key')&&e.phase==='opened'||e.type==='solar'&&e.phase==='activated')?(this.reduced()?70:480):group.some(e=>e.type==='pirate'&&e.phase==='returned'||e.type==='remove'&&e.reason==='departure'||e.type==='crew'&&(e.after?.status==='housed'||e.after?.status==='evacuated')||e.type==='arrival'||e.type==='actor'&&e.before?.kind==='pup'&&e.after===null)?eventDuration('rescue',this.reduced()):group.some(e=>e.type==='merge')?eventDuration('merge',this.reduced()):group.some(e=>e.type==='move'||e.type==='transfer')?eventDuration(index===0?'swap':'transport',this.reduced()):group.some(e=>['spawn','terrain','fixture','actor'].includes(e.type))?100:0;
  const total=groups.reduce((sum,g,i)=>sum+duration(g,i),0),speed=Math.min(1,3000/Math.max(total,1));
  for(let i=0;i<groups.length;i++){
   if(token!==this.generation)return;
   const group=groups[i]!,from=this.target.scene,to=applySceneEvents(from,group),ms=duration(group,i)*speed;
   if(ms)await new Promise<void>(resolve=>{this.resolve=resolve;let elapsed=0;const step=()=>{if(token!==this.generation){resolve();return;}elapsed+=16;const progress=Math.min(1,elapsed/ms);this.target.interpolate(from,to,progress,group);if(progress<1)this.timer=setTimeout(step,16);else{this.resolve=undefined;this.timer=undefined;resolve();}};step();});
   if(token!==this.generation)return;
   this.target.sync(to);
  }
  if(token===this.generation){this.target.sync(finalScene);this.final=undefined;}
 }
}
