import type { CampaignEvent,CampaignState,TurnContext } from '../types';
type Effect<T> = T extends unknown ? Omit<T,'sequenceId'|'timingGroup'> : never;
export type CampaignEffect=Effect<CampaignEvent>;
export function createContext(state:CampaignState):TurnContext {
  return {state,events:[],processedMergeIds:new Set(),steppedActorIds:new Set()};
}
/** Copy event payloads so later draft changes cannot rewrite presentation history. */
export function emit(context:TurnContext,event:CampaignEffect,timingGroup?:number):void {
  const sequenceId=context.events.length;
  context.events.push({...structuredClone(event),sequenceId,timingGroup:timingGroup??sequenceId});
}
export function allocateId(state:CampaignState):string {
  if(!Number.isSafeInteger(state.nextEntityId)||state.nextEntityId<1||state.nextEntityId>=Number.MAX_SAFE_INTEGER)throw new Error('Invalid entity allocation cursor');
  return `entity-${state.nextEntityId++}`;
}
export function awardPoints(context:TurnContext,amount:number):void {
  if(!amount)return;
  const before=context.state.points;context.state.points+=amount;emit(context,{type:'points',before,after:context.state.points});
}
export class CampaignContentError extends Error {
  constructor(message:string){super(`Invalid campaign content: ${message}`);this.name='CampaignContentError';}
}
export const stableIds=<T extends {id:string}>(entities:readonly T[]):T[]=>[...entities].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
