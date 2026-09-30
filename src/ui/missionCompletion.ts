/** A visible celebration, then one automatic transition. Backgrounding pauses the timer. */
export class MissionCompletion {
 private key='';private timer:ReturnType<typeof setTimeout>|undefined;private advancing=false;
 constructor(private celebrate:()=>void,private next:()=>Promise<void>,private failed:(error:unknown)=>void){}
 update(key:string,won:boolean,ready:boolean):void {
  if(key!==this.key){this.cancel();this.key=key;this.advancing=false;}
  if(!won||!ready){this.cancel();return;}
  if(this.timer!==undefined||this.advancing)return;
  this.celebrate();
  this.timer=setTimeout(()=>{this.timer=undefined;this.advancing=true;void this.next().catch(error=>this.failed(error));},1300);
 }
 cancel():void {if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
}
