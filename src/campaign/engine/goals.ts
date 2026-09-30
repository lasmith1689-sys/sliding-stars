import type { CampaignState,TurnContext } from '../types';
import { eligibleIds } from '../references';
import { emit } from './context';

/** Modules credit authored finite completion IDs; duplicate visual effects never pay twice. */
export function creditGoal(context:TurnContext,goalId:string,completedId:string):void {
  const goal=context.state.level.goals.find(g=>g.id===goalId),progress=context.state.goalProgress.find(g=>g.goalId===goalId);
  if(!goal||!progress||!eligibleIds(goal,context.state.level).includes(completedId))return;
  if(progress.completedIds.includes(completedId))return;
  const before=[...progress.completedIds];progress.completedIds.push(completedId);progress.completedIds.sort();
  emit(context,{type:'goal',goalId,before,after:progress.completedIds});
}
export function creditGoals(context:TurnContext):void {
  for(const goal of context.state.level.goals){
    if(goal.type==='homeCrew'||goal.type==='evacuate')for(const crew of context.state.crew){
      if(crew.status===(goal.type==='homeCrew'?'housed':'evacuated'))creditGoal(context,goal.id,crew.id);
    }
  }
}
export function goalsComplete(state:CampaignState):boolean {
  return state.level.goals.every(goal=>{
    const completed=new Set(state.goalProgress.find(p=>p.goalId===goal.id)?.completedIds??[]);
    return goal.eligible.type==='ids'?goal.eligible.ids.every(id=>completed.has(id)):completed.size>=goal.eligible.target;
  });
}
export function setStatus(context:TurnContext,status:CampaignState['status']):void {
  const before=context.state.status;if(before===status)return;context.state.status=status;emit(context,{type:'status',before,after:status});
}
