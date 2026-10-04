import type {CampaignAction,CampaignState} from '../campaign/types';
import {legalActions} from '../campaign/engine/actions';
import {transition} from '../campaign/engine/turn';
import {campaignHintScore,hintPositionKey} from '../campaign/hints';

interface Candidate {state:CampaignState;first:CampaignAction;score:number}
/** Bounded player advice after a detour. Yield between batches so touching the
 * board cancels stale advice. Never spend supplies or change the live state. */
export async function detourHint(state:CampaignState,visited:ReadonlySet<string>,cancelled:()=>boolean=()=>false,limits={maxTransitions:128,maxMilliseconds:180}):Promise<CampaignAction|null>{
 if(state.status!=='playing'||cancelled())return null;
 const start=performance.now(),seen=new Set(visited);seen.add(hintPositionKey(state));
 let transitions=0,best:Candidate|null=null;
 let beam:{state:CampaignState;first:CampaignAction|null;score:number}[]=[{state,first:null,score:0}];
 search:for(let depth=1;depth<=4;depth++){
  const candidates:Candidate[]=[];
  for(const node of beam){
   const all=legalActions(node.state);
   // The first pass examines the same96-move allowance as ordinary hints.
   // Deeper passes sample across the board, retaining paired translations.
   const actions=depth===1?all.slice(0,96):all.length<=24?all:[...all.filter(a=>a.type==='translate'),...all.filter((a,i)=>a.type!=='translate'&&i%Math.ceil(all.length/20)===0)];
   for(const action of actions){
    if(cancelled())return null;
    if(transitions>=limits.maxTransitions||performance.now()-start>=limits.maxMilliseconds)break search;
    const result=transition(node.state,action);transitions++;
    if(result.accepted&&result.state.status!=='lost'){
     const first=node.first??action;if(result.state.status==='won')return structuredClone(first);
     const key=hintPositionKey(result.state);
     if(!seen.has(key)){
      seen.add(key);
      const score=node.score+campaignHintScore(node.state,result.state,result.events)-.001;
      const candidate={state:result.state,first,score};candidates.push(candidate);
      if(!best||score>best.score)best=candidate;
     }
    }
    if(transitions%8===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
   }
  }
  beam=candidates.sort((a,b)=>b.score-a.score).slice(0,5);if(!beam.length)break;
 }
 return cancelled()?null:best?structuredClone(best.first):null;
}
