import { GameSession, type RunData } from '../../../src/meta/run';
import type { LevelDef } from '../../../src/core/types';
export class MemoryStorage {
  values=new Map<string,string>(); failKey:string|null=null; denied=false;
  getItem(key:string):string|null {if(this.denied)throw new Error('Denied');return this.values.get(key)??null;}
  setItem(key:string,value:string):void {if(this.denied||this.failKey===key)throw new Error('Quota exceeded');this.values.set(key,value);}
}
export function legacyRun(level=1):RunData {
 const def:LevelDef={id:level,mask:['###','###','###'],tiles:['512','534','251'],survivors:[{r:0,c:0,vip:'botanist'}],goal:{type:'rescueN',n:1},seed:7,needMoves:12};
 const run=new GameSession(def,new MemoryStorage()).data;
 run.wallet={coins:8765,inventory:{demo:7,tractor:4,wormhole:3}};
 run.station={...run.station,totalRescued:42,stationRescued:8,collectedVips:['botanist'],builtModules:['greenhouse'],theme:'sunset',arrangement:'garden',archives:[{catalogIndex:0,builtModules:['greenhouse'],theme:'starlight',arrangement:'orbit'}]};
 run.preferences={sound:true,reducedMotion:true,hints:false};run.seenTips=['pod','station'];return run;
}
