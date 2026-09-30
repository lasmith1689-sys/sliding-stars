import type { CampaignAction,CampaignLevel,CampaignState,SolutionTrace } from './types';
import { legalActions } from './engine/actions';
import { hashState } from './engine/hash';
import { loadCampaignLevel } from './engine/load';
import { transition } from './engine/turn';
import { validateCandidate } from './validator';
import { doorCell } from '../core/dome';
export interface SearchLimits {maxNodes:number;maxDepth:number;maxMilliseconds:number}
export type SolveResult={status:'solved';trace:SolutionTrace}|{status:'timeout'|'exhausted';explored:number};

interface Node {state:CampaignState;hash:string;actions:CampaignAction[];priority:number;order:number}
/** Ordering hint only, never a pruning rule or a claim of shortest-path optimality. */
function objectiveDistance(state:CampaignState):number {
  let distance=0;
  for(const goal of state.level.goals){
    const target=goal.eligible.type==='ids'?goal.eligible.ids.length:goal.eligible.target;
    distance+=Math.max(0,target-(state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds.length??0))*100;
  }
  const doors=state.pieces.flatMap(p=>p.kind==='station'?[doorCell(p.at.r,p.at.c,p.facing)]:[]);
  for(const crew of state.crew.filter(c=>c.status==='active')){
    if(doors.length)distance+=Math.min(...doors.map(p=>Math.abs(p.r-crew.at.r)+Math.abs(p.c-crew.at.c)));
  }
  return distance;
}
const before=(a:Node,b:Node)=>a.priority<b.priority||(a.priority===b.priority&&a.order<b.order);
class Frontier {
  private nodes:Node[]=[];
  get length(){return this.nodes.length;}
  push(node:Node){
    let i=this.nodes.length;this.nodes.push(node);
    while(i>0){const parent=(i-1)>>1;if(!before(node,this.nodes[parent]!))break;this.nodes[i]=this.nodes[parent]!;i=parent;}
    this.nodes[i]=node;
  }
  pop():Node {
    const first=this.nodes[0]!,last=this.nodes.pop()!;
    if(this.nodes.length){let i=0;
      while(i*2+1<this.nodes.length){let child=i*2+1;if(child+1<this.nodes.length&&before(this.nodes[child+1]!,this.nodes[child]!))child++;
        if(!before(this.nodes[child]!,last))break;this.nodes[i]=this.nodes[child]!;i=child;
      }this.nodes[i]=last;
    }return first;
  }
}
/** Offline only. maxNodes counts attempted transitions, including duplicate results.
 * Time checks surround synchronous engine calls; a single call cannot be preempted.
 * Every cutoff (including depth) is timeout/unresolved, never an unsolvability proof.
 */
export function solveCampaign(level:CampaignLevel,limits:SearchLimits):SolveResult {
  for(const [name,value] of Object.entries(limits))if(!Number.isSafeInteger(value)||value<0)throw new Error(`Invalid search limit ${name}`);
  for(const name of ['maxNodes','maxDepth','maxMilliseconds'] as const)if(limits[name]===undefined)throw new Error(`Missing search limit ${name}`);
  const started=performance.now(),expired=()=>performance.now()-started>=limits.maxMilliseconds;
  const issues=validateCandidate(level);if(issues.length)throw new Error(issues.map(i=>i.message).join('; '));
  const initial=loadCampaignLevel(level),initialHash=hashState(initial);
  let explored=0,order=0,depthCutoff=false;
  const timeout=():SolveResult=>({status:'timeout',explored});
  const solved=(node:Node):SolveResult=>({status:'solved',trace:{levelId:level.id,campaignVersion:level.campaignVersion,rulesVersion:level.rulesVersion,initialHash,actions:node.actions,finalHash:node.hash}});
  if(expired())return timeout();
  const frontier=new Frontier(),seen=new Map<string,number>([[initialHash,0]]);
  frontier.push({state:initial,hash:initialHash,actions:[],priority:objectiveDistance(initial),order:order++});
  while(frontier.length){
    if(expired())return timeout();
    const node=frontier.pop(),depth=node.actions.length;
    if((seen.get(node.hash)??Infinity)<depth)continue;
    if(node.state.status==='won')return solved(node);
    if(node.state.status!=='playing')continue;
    if(depth>=limits.maxDepth){depthCutoff=true;continue;}
    // Keep both orientations: swap.to selects the preferred merge anchor.
    for(const action of legalActions(node.state)){
      if(explored>=limits.maxNodes||expired())return timeout();
      if(action.type==='booster')continue;
      explored++;
      const result=transition(node.state,action);
      if(expired())return timeout();
      if(!result.accepted||result.state.status==='lost')continue;
      const hash=hashState(result.state),nextDepth=depth+1;
      if((seen.get(hash)??Infinity)<=nextDepth)continue;
      seen.set(hash,nextDepth);
      const next={state:result.state,hash,actions:[...node.actions,action],priority:nextDepth+objectiveDistance(result.state),order:order++};
      if(expired())return timeout();
      if(next.state.status==='won')return solved(next);
      frontier.push(next);
    }
  }
  return {status:depthCutoff?'timeout':'exhausted',explored};
}
